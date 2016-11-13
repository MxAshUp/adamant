/* This is an abstract Data Collector */


var vsprintf = require("sprintf-js").vsprintf,
	mongoose = require('./mongoose-utilities').mongoose;


var DataCollector = function(init_properties, args) {

	//Scope it!
	var self = this;

	//Settable properties
	self.initialize = function(_args) {

	};
	self.prepare = function(_args) {

	};
	self.collect = function(data, _args) {
		return data;
	};
	self.remove = function(data, _args) {
		return;
	};
	self.onCreate = function() {

	};
	self.onUpdate = function() {

	};
	self.onRemove = function() {

	};
	self.default_args = {};
	self.run_attempts_limit = 5;
	self.mseconds_between_run_attempts = 500;
	self.min_mseconds_between_runs = 0;
	self.model_schema = {};
	self.model_id_key = '';
	self.model_name = '';
	self.version = '';
	self.plugin_name = '';
	self.last_run = 0;

	//Set object properties from args
	for(var i in init_properties) {
		self[i] = init_properties[i];
	}

	//Set non-settable properties

	//Set run args
	args = args ? args : {};

	//Merges args with default args
	self.args = self.default_args;
	for (var attrname in args) { self.args[attrname] = args[attrname]; }

	//Set some initial variables
	self.is_initialized = Promise.reject();
	self.run_attempts = 0;
	self.last_run_start = 0;

	//Registers the model if needed
	try {
		mongoose.model(self.model_name); //Lets see if the model exists
	} catch(e) {
		mongoose.model(self.model_name, mongoose.Schema(self.model_schema)); //Nope? Let's make it
	} finally {
		self.model = mongoose.model(self.model_name); //Grab it
	}

	//Runs a full data collection sync, returns promise
	self.run = function() {

		var prepared_data;

		//A promise to potentially delay the next run
		var maybe_delay = function() {
			return new Promise(function(resolve,reject) {
				if(Date.now() - self.last_run_start > self.min_mseconds_between_runs) {
					//If enough time has passed between runs, go ahead and continue
					resolve();
				} else {
					//If not enough time has passed between runs, set a timeout
					setTimeout(resolve, Date.now() - self.last_run_start - self.min_mseconds_between_runs);
				}
			});
		};

		//Update last run date
		self.last_run_start = Date.now();

		//Being the promise chain
		return self.is_initialized
			//If not initialized, then try to initialize
			.catch(function() {
				return self.initialize.call(self,self.args)
				//Reformat possible error
				.catch(function(err) {
					return Promise.reject('Error initializing: '+err);
				});
			})
			//Maybe delay
			.then(maybe_delay)
			//Run collect
			.then(function() {
				return self.prepare.call(self,self.args)
			})
			.then(function(res) {
				prepared_data = res; //prepared data is used further down
				return Promise.resolve();
			})
			//Collect data and insert it
			.then(function() {
				return self._collect_and_insert.call(self,prepared_data,self.args)
			})
			//Remove docs that may need to be removed
			.then(function() {
				return self._prepare_and_remove.call(self,prepared_data,self.args)
			})
			//collect is success, run success function
			.then(self._finish_run)
			//If any errors occured during collect or initialize, it's caught here and maybe retried
			.catch(self._maybe_retry);

	}

	//Loops through collect data, and inserts each row asynchronously into database
	self._collect_and_insert = function(data, args) {

		return self._apply_funct_to_func(self.collect , [data, args] , self._insert_data)
		.catch(function(err) {
			//If an error occured, format the error more specifically
			return Promise.reject('Error collecting doc: '+err);
		});

	}

	//Inserts data into database
	self._insert_data = function(data_row) {

		if(typeof self.model === "undefined") {
			return Promise.reject('Data collector model not defined.');
		}
		return self.model.count(data_row)
		.then(function(res) {
			if(res > 0) {
				//Move along, nothing to update
				return Promise.resolve();
			} else {
				//Update time!
				var find = {};
				find[self.model_id_key] = data_row[self.model_id_key];

				return self.model.findOneAndUpdate(find, data_row, {
					upsert:true,
					setDefaultsOnInsert:true,
				}).then(function(oldDoc) {
					return Promise.resolve(oldDoc == null); //return true if doc is inserted
				});
			}
		})
		.then(function(is_inserted_row) {
			if(is_inserted_row === true) {
				self.onCreate.call(self, data_row); //Execute create event function
			} else if(is_inserted_row === false) {
				self.onUpdate.call(self, data_row); //Execute update event function
			}
		})
		//Catch database insert error
		.catch(function(err) {
			//If an error happens inserting rows, we won't retry
			self.run_attempts = self.run_attempts_limit;
			//Reformat error to be more specific
			return Promise.reject('Error inserting doc: '+err);
		});
	}

	//Find items to remove, and removes them from database
	self._prepare_and_remove = function(data, args) {

		return self._apply_funct_to_func(self.remove , [data, args] , self._remove_data)
		.catch(function(err) {
			//If an error occured, format the error more specifically
			return Promise.reject('Error removing doc: '+err);
		});
	}

	//Loops through itmes to remove, and removes them
	self._remove_data = function(lookup) {

		if(typeof self.model === "undefined") {
			return Promise.reject('Data collector model not defined.');
		}

		//Find doc by lookup and remove it
		return self.model.findOneAndRemove(lookup).then(function(res) {
			if(res != null) {
				self.onRemove.call(self, lookup); //Execute remove event function
			}
			return Promise.resolve(res != null);
		});

	}

	//This function takes the results of func1, loops through the results, and passes them to func2, finally returns a promise for when func2 is done
	//Sometimes we get a generator, sometimes we get a promise that returns an array, sometimes we get an array
	self._apply_funct_to_func = function(func1, args1, func2) {
		var is_generator = (func1.constructor.name === 'GeneratorFunction');

		args1 = Array.isArray(args1) ? args1 : [args1];

		if(!is_generator) {
			//promisfy, because func1 could return an array
			return Promise.resolve(func1.apply(self, args1)).then(function(definitely_an_array) {
				var promises = [];
				for(var i in definitely_an_array) {
					var args2 = Promise.resolve(definitely_an_array[i]);

					promises.push(
						//Pass results to func2, make sure it's a promise
						args2.then(function(res) {
							var args2 = Array.isArray(res) ? res : [res];
							func2.apply(self, args2);
						})
					);
				}
				return Promise.all(promises);
			});
		} else {
			var promises = [];
			for(var ret of func1.apply(self, args1)) {
				var args2 = Promise.resolve(ret);

				promises.push(
					//Pass results to func2, make sure it's a promise
					args2.then(function(res) {
						var args2 = Array.isArray(res) ? res : [res];
						func2.apply(self, args2);
					})
				);
			}
			return Promise.all(promises);
		}
	}

	//Function that executes on successful run
	self._finish_run = function(data) {
		self.run_attempts = 0;
		self.is_initialized = Promise.resolve(); //Set is_initialized to resolved
		return data;
	}

	//Function that executes on run failure, handles retry attempts
	self._maybe_retry = function(err_a) {
		//Create error message
		err_a = vsprintf('Attempt %d/%d: %s', [self.run_attempts,self.run_attempts_limit,err_a]);

		//In any case, another initialize will be warranted
		self.is_initialized = Promise.reject();

		//Check if we've reached out failure limit
		if(self.run_attempts < self.run_attempts_limit) {
			//Increment attempt
			self.run_attempts++;
			//return a promise containing a timout of a retry
			return new Promise(function(resolve,reject) {
				setTimeout(function() {
					//Try to run again
					self.run().catch(function(err_b) {
						err_b = err_b + "\n" + err_a; //Concatenate errors with a new line
						reject(err_b);
					}).then(function(res) {
						resolve(res); //Resolved! yay!
					});
				}, self.mseconds_between_run_attempts);
			});
		} else {
			//We tried to initialize or run many times, but couldn't, throwing in the towel
			return Promise.reject("Max run attempts reached.\n" + err_a);
		}
	}
};


module.exports = DataCollector;