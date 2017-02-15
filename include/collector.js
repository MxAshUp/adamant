/* This is an abstract Data Collector */


var vsprintf = require("sprintf-js").vsprintf,
	mongoose = require('./mongoose-utilities'),
	EventEmitter = require('events'),
	_ = require('lodash');


var Collector = function(init_properties, args) {

	//Scope it!
	var self = this;

	//Settable properties
	self.initialize = function(_args) {

	};
	self.prepare = function(_args) {
		return;
	};
	self.collect = function(prepared_data, _args) {
		return;
	};
	self.garbage = function(prepared_data, _args) {
		return;
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
	self.initialize_flag = false; //If true, initialize will execute before run
	self.run_attempts = 0; //Count of failed run attempts
	self.last_run_start = 0; //Timestamp of last run
	self.stop_flag = false; //Set to true to indicate we need to stop running

	//Registers the model if needed
	if(!mongoose.modelExists(self.model_name)) {
		mongoose.createModel(self.model_name, self.model_schema);
	}

	//Get model
	self.model = mongoose.getModel(self.model_name);

	//Runs a full data collection sync, returns promise
	self.run = function() {

		var prepared_data;

		self.stop_flag = false;//reset stop flag

		//Update last run date
		self.last_run_start = Date.now();

		//Begin the run promise chain
		return (self.initialize_flag ? Promise.resolve() : Promise.reject('Not Initialized'))
			//If not initialized, then try to initialize
			.catch(() => {
				return self.initialize.call(self,self.args)
				//Reformat possible error
				.catch((err) => {
					return Promise.reject('Error initializing: '+err);
				});
			})
			//Maybe abort if stop_flag enabled
			.then(() => {
				return self.stop_flag ? Promise.reject('Stop initiated.') : Promise.resolve();
			})
			//Maybe delay to ensure at least self.min_mseconds_between_runs has passed
			.then(() => {
				return new Promise((resolve,reject) => {
					setTimeout(resolve, Math.max(0, Date.now() - self.last_run_start - self.min_mseconds_between_runs));
				});
			})
			//Prepare to collect and remove data
			.then(() => {
				return self.prepare.call(self,self.args);
			})
			//Data is prepared
			.then((res) => {
				prepared_data = res;
				return Promise.resolve();
			})
			//Collect data and insert it
			.then(() => {
				return self._collect_then_insert.call(self,prepared_data,self.args)
			})
			//If an error happens inserting data, we won't retry
			.catch((err) => {
				self.run_attempts = self.run_attempts_limit;
				return Promise.reject(err);
			})
			//Remove docs that may need to be removed
			.then(() => {
				return self._garbage_then_remove.call(self,prepared_data,self.args)
			})
			//collect is success, cleanup and return data
			.then((data) => {
				self.run_attempts = 0;
				self.initialize_flag = true; //Set initialize_flag to resolved
				return data;
			})
			//If any error occurs during sync, we need to initialize again next time around
			.catch((err) => {
				self.initialize_flag = false;
				return Promise.reject(err);
			})
			//If any errors occured during collect or initialize, it's caught here and maybe retried
			//_maybe_retry will throw an error if max attempts reached, then it has to be caught outside this function
			.catch(self._maybe_retry);

	}

	//Sets stop flag to intiate a stop
	self.stop = function() {
		self.stop_flag = true;
	}

	//Loops through collect data, and inserts each row asynchronously into database
	self._collect_then_insert = function(data, args) {

		return self._apply_func_to_func(self.collect, [data, args] , self._insert_data)
		.catch((err) => {
			//If an error occured, format the error more specifically
			return Promise.reject('Error collecting doc: '+err);
		});

	}

	//Inserts data into database
	self._insert_data = function(data_row) {
		return self.model.count(data_row)
		.then((res) => {
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
				}).then((oldDoc) => {
					return Promise.resolve(oldDoc == null); //return true if doc is inserted
				});
			}
		})
		//Catch database insert error
		.catch((err) => {
			//Reformat error to be more specific
			return Promise.reject('Error inserting doc: '+err);
		})
		.then((is_inserted_row) => {
			if(is_inserted_row === true) {
				self.emit('create', data_row); //Execute create event function
			} else if(is_inserted_row === false) {
				self.emit('update', data_row); //Execute create event function
			}
		})
		//Catch event handler error
		.catch((err) => {
			//Reformat error to be more specific
			return Promise.reject('Error emitting event: '+err);
		})
	}

	//Find items to remove, and removes them from database
	self._garbage_then_remove = function(data, args) {

		return self._apply_func_to_func(self.garbage , [data, args] , self._remove_data)
		.catch((err) => {
			//If an error occured, format the error more specifically
			return Promise.reject('Error removing doc: '+err);
		});
	}

	//Loops through items to remove, and removes them
	self._remove_data = function(lookup) {
		if(typeof lookup !== 'object') {
			throw new Error('Invalid Mongoose lookup.');
		}
		//Find doc by lookup and remove it
		return self.model.findOneAndRemove(lookup).then(function(res) {
			//Res is defined if something was found and deleted
			if(typeof res !== 'undefined') {
				self.emit('remove', res); //Execute create event function
			}
			return Promise.resolve(typeof res !== 'undefined');
		});

	}

	//This function takes the results of func1, loops through the results, and passes them to func2, finally returns a promise for when func2 is done
	//Sometimes we get a generator, sometimes we get a promise that returns an array, sometimes we get an array
	self._apply_func_to_func = function(func1, args1, func2) {
		var is_generator = (func1.constructor.name === 'GeneratorFunction');

		args1 = Array.isArray(args1) ? args1 : [args1];

		if(is_generator) {

			//If func1 is a generator (These are cool, see here: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/function*)
			//Loop through yields of func1, create array of promises, one for each yield
			//Final promise resolves when all promises resolve
			var promises = [];
			for(var item of func1.apply(self, args1)) {
				promises.push(
					//Pass results to func2, make sure it's a promise
					Promise.resolve(item).then((res) => {
						return func2.apply(self, Array.isArray(res) ? res : [res]);
					})
				);
			}
			return Promise.all(promises);
		} else {

			//Promisfy, because func1 could return an array
			return Promise.resolve(func1.apply(self, args1)).then((res_array) => {

				return Promise.all(_.map(res_array, (item) => {

					//Pass results to func2, make sure it's a promise
					return Promise.resolve(item).then((res) => {
						return func2.apply(self, Array.isArray(res) ? res : [res]);
					});

				}));

			});
		}
	}

	//Function that executes on run failure, handles retry attempts
	self._maybe_retry = function(err_a) {
		//Create error message
		err_a = vsprintf('Attempt %d/%d: %s', [self.run_attempts,self.run_attempts_limit,err_a]);

		//Check if we've reached our failure limit, and make sure stop flag wasn't set
		if(self.run_attempts < self.run_attempts_limit && self.stop_flag) {
			//Increment attempt
			self.run_attempts++;
			//return a promise containing a timout of a retry
			return new Promise(function(resolve,reject) {
				setTimeout(() => {
					//Try to run again
					self.run().catch((err_b) => {
						err_b = err_b + "\n" + err_a; //Concatenate errors with a new line
						reject(err_b);
					}).then((res) => {
						resolve(res); //Resolved! yay!
					});
				}, self.mseconds_between_run_attempts);
			});
		}

		//We tried to initialize or run many times, but couldn't, throwing in the towel
		return Promise.reject("Max run attempts reached.\n" + err_a);
	}
};

//Extend to event emitter
Collector.prototype.__proto__ = EventEmitter.prototype;

module.exports = Collector;