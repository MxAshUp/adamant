var vsprintf = require("sprintf-js").vsprintf;


var DatabaseStore = function(args) {

	//Scope it!
	var self = this;

	//Settable properties
	self.mysql_connection = undefined;
	self.mysql_table = '';

	//Set object properties from args
	for(var i in args) {
		self[i] = args[i];
	}

	//replaces a row in the database
	self.update = function(data_row) {
		return new Promise(function(resolve,reject) {
			self.mysql_connection.query('REPLACE INTO ? SET ?',[self.mysql_table,data_row],
				function (error, results, fields) {
					if(error) {
						reject("Error inserting MySQL row. Error: " + error.code);
					} else {
						resolve();//TODO: return number of rows affected/added
					}
				}
			);
		});
	};
}

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
	self.collect = function*(data) {
		yield;
	};
	self.default_args = {};
	self.run_attempts_limit = 5;
	self.run_time_between_attempts = 500;
	self.database = undefined;

	//Set object properties from args
	for(var i in args) {
		self[i] = args[i];
	}

	//Set non-settable properties

	//We begin as uninitialized
	self.is_initialized = Promise.reject();
	self.run_attempts = 0;

	//Runs a full data collection sync, returns promise
	self.run = function(args) {

		//Throw error if data collector is missing crucial definitions
		if(typeof self.database === "undefined" || typeof self.collect !== "function" || typeof self.initialize !== "function") {
			return Promise.reject('Data collector not constructed correctly.');
		}

		//Merges args with default args
		var args = self._merge_args(args);

		//Being the promise chain
		return self.is_initialized
		//If not initialized, then try to initialize
		.catch(function() {
			return self.initialize(args)
			//Reformat possible error
			.catch(function(err) {
				return Promise.reject('Error initializing: '+err);
			});
		})
		//Run collect
		.then(self.prepare(args))
		//Collect data and insert it
		.then(self._collect_and_insert)
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
	self._collect_and_insert = function(data) {
		var collect_all_rows = [];
		//loop through collect rows, each is a promise
		for(var collected_row in self.collect(data)) {
			//Push promise into array
			collect_all_rows.push(
				//Collect row, and then insert it
				collected_row
				.catch(function(err) {
					//If an error occured, format the error more specifically
					return Promise.reject('Error collecting: '+err);
				})
				//Finally, insert row data
				.then(self._insert_data);
			);
		}
		return Promise.all(collect_all_rows);
	}

	//Inserts data into database
	self._insert_data = function(data_row) {
		return self.database.update(data_row)
		//Catch database insert error
		.catch(function(err) {
			//If an error happens inserting rows, we won't retry
			self.run_attempts = self.run_attempts_limit;
			//Reformat error to be more specific
			return Promise.reject('Error inserting data: '+err);
		});
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


module.exports = {
	DataCollector: DataCollector,
	DatabaseStore: DatabaseStore
}