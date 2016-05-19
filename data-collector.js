var vsprintf = require("sprintf-js").vsprintf;
var mongoose = require('./mongoose-utilities').mongoose;

var DataCollector = function(args) {

	//Scope it!
	var self = this;

	//Settable properties
	self.initialize = function(_args) {
		return Promise.resolve();
	};
	self.prepare = function(_args) {
		return Promise.resolve();
	}
	self.collect = function(data, _args) {

	};
	self.remove = function(data, _args) {

	};
	self.onCreate = function() {

	};
	self.onUpdate = function() {

	};
	self.onRemove = function() {

	};
	self.default_args = {};
	self.run_attempts_limit = 5;
	self.run_time_between_attempts = 500;
	self.model_schema = {};
	self.model_key = '';
	self.model_name = '';

	//Set object properties from args
	for(var i in args) {
		self[i] = args[i];
	}

	//Set non-settable properties

	//We begin as uninitialized
	self.is_initialized = Promise.reject();
	self.run_attempts = 0;

	//Prepare schema
	self.dbSetup = function() {
		self.model = mongoose.model(self.model_name, mongoose.Schema(self.model_schema));	
	}

	//Runs a full data collection sync, returns promise
	self.run = function(args) {

		//Make sure args i mergable
		args = args ? args : {};

		//Merges args with default args
		var args = self._merge_args(args);

		var preparedData;

		//Being the promise chain
		return self.is_initialized
		//If not initialized, then try to initialize
		.catch(function() {
			return self.initialize.call(self,args)
			//Reformat possible error
			.catch(function(err) {
				return Promise.reject('Error initializing: '+err);
			});
		})
		//Run collect
		.then(function() {
			return self.prepare.call(self,args)
		})
		.then(function(res) {
			preparedData = res;
			return Promise.reoslve;
		})
		//Collect data and insert it
		.then(function() {
			return self._collect_and_insert.call(self,preparedData,args)
		})
		//Remove docs that may need to be removed
		.then(function() {
			return self._prepare_and_remove.call(self,preparedData,args)
		})
		//collect is success, run success function
		.then(self._on_success)
		//If any errors occured during collect or initialize, it's caught here
		.catch(self._on_failure);

	}

	//Merge run args
	self._merge_args = function(provded_args) {
		var ret = self.default_args;
		for (var attrname in provded_args) { ret[attrname] = provded_args[attrname]; }
		return ret;
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
				find[self.model_key] = data_row[self.model_key];

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
	self._on_success = function(data) {
		self.run_attempts = 0;
		self.is_initialized = Promise.resolve(); //Set is_initialized to resolved
		return data;
	}

	//Function that executes on run failure, handles retry attempts
	self._on_failure = function(err_a) {
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
				}, self.run_time_between_attempts);
			});
		} else {
			//We tried to initialize or run many times, but couldn't, throwing in the towel
			return Promise.reject("Max run attempts reached.\n" + err_a);
		}
	}
}


module.exports = DataCollector;