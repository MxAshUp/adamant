let vsprintf = require("sprintf-js").vsprintf,
	mongoose = require('./mongoose-utilities'),
	EventEmitter = require('events'),
	_ = require('lodash');



class Collector {

	/**
	 * Creates an instance of Collector.
	 * 
	 * @param {object} init_properties - An object of properties to initialize this class with
	 * @param {object} args - An object of run args
	 * 
	 * @memberOf Collector
	 */
	constructor(init_properties, args) {
		
		// Below stuff would go into the constructor
		this.default_args = {};
		this.run_attempts_limit = 5;
		this.mseconds_between_run_attempts = 500;
		this.min_mseconds_between_runs = 0;
		this.model_schema = {};
		this.model_id_key = '';
		this.model_name = '';
		this.version = '';
		this.plugin_name = '';
		this.last_run = 0;

		//Set object properties from args
		for(let i in init_properties) {
			this[i] = init_properties[i];
		}

		//Set non-settable properties

		//Set run args
		args = args ? args : {};

		//Merges args with default args
		this.args = this.default_args;
		for (let attrname in args) { this.args[attrname] = args[attrname]; }

		//Set some initial variables
		this.initialize_flag = false; //If true, initialize will execute before run
		this.run_attempts = 0; //Count of failed run attempts
		this.last_run_start = 0; //Timestamp of last run
		this.stop_flag = false; //Set to true to indicate we need to stop running

		//Registers the model if needed
		if(!mongoose.modelExists(this.model_name)) {
			mongoose.createModel(this.model_name, this.model_schema);
		}

		//Get model
		this.model = mongoose.getModel(this.model_name);
	
	}


  /**
   * Assemble the data needed to establish an API connection
   * @param  {object} args
   * @return {Promise}
   */
	initialize(_args) {	}


  /**
   * Check an API for data that we might need to insert, update, or delete from the db
   * @param  {object} args
   * @return {Promise}
   */
	prepare(_args) {
		return;
	}


	/**
	 * Collect and insert or update data
	 * @param  {object} prepared_data
	 * @param  {object} _args
	 * @return {Promise}
	 */
	collect(prepared_data, _args) {
		return;
	}


	/**
	 * Remove data which needs to be removed
	 * @param  {object} prepared_data
	 * @param  {object} _args
	 * @return {Promise}
	 */
	garbage(prepared_data, _args) {
		return;
	}


	/**
	 * Run through the collector functions (initialize, prepare, collect, garbage)
	 * @return {Promise} Resolves when single run done, rejects when max retries reached from failure
	 */
	run() {
		let prepared_data;

		// reset stop flag
		this.stop_flag = false;

		// Update last run date
		this.last_run_start = Date.now();

		// Begin the run promise chain
		return (this.initialize_flag ? Promise.resolve() : Promise.reject('Not Initialized'))
			// If not initialized, then try to initialize
			.catch(() => {
				return this.initialize.call(this,this.args)
				// Reformat possible error
				.catch((err) => {
					return Promise.reject('Error initializing: '+err);
				});
			})
			// Maybe abort if stop_flag enabled
			.then(() => {
				return this.stop_flag ? Promise.reject('Stop initiated.') : Promise.resolve();
			})
			// Maybe delay to ensure at least this.min_mseconds_between_runs has passed
			.then(() => {
				return new Promise((resolve,reject) => {
					setTimeout(resolve, Math.max(0, Date.now() - this.last_run_start - this.min_mseconds_between_runs));
				});
			})
			// Prepare to collect and remove data
			.then(() => {
				return this.prepare.call(this,this.args);
			})
			// Data is prepared
			.then((res) => {
				prepared_data = res;
				return Promise.resolve();
			})
			// Collect data and insert it
			.then(() => {
				return this._collect_then_insert.call(this,prepared_data,this.args)
			})
			// If an error happens inserting data, we won't retry
			.catch((err) => {
				this.run_attempts = this.run_attempts_limit;
				return Promise.reject(err);
			})
			// Remove docs that may need to be removed
			.then(() => {
				return this._garbage_then_remove.call(this,prepared_data,this.args)
			})
			// collect is success, cleanup and return data
			.then((data) => {
				this.run_attempts = 0;
				this.initialize_flag = true; //Set initialize_flag to resolved
				return data;
			})
			// If any error occurs during sync, we need to initialize again next time around
			.catch((err) => {
				this.initialize_flag = false;
				return Promise.reject(err);
			})
			// If any errors occured during collect or initialize, it's caught here and maybe retried
			// _maybe_retry will throw an error if max attempts reached, then it has to be caught outside this function
			.catch((err) => {
				return this._maybe_retry(err)
			});
	}


	/**
	 * Sets stop flag to initiate a stop
	 * 
	 * @todo return a Promise indicating when stop is finished
	 * @memberOf Collector
	 */
	stop() {
		this.stop_flag = true;
	}


	/**
	 * Loop through collect data, and insert each row asynchronously into a database
	 * @param  {array} data - or is this an object?
	 * @param  {object} args
	 * @return {Promise}
	 */
	_collect_then_insert(data, args) {
		return this._apply_func_to_func(this.collect, [data, args] , this._insert_data)
		.catch((err) => {
			//If an error occured, format the error more specifically
			return Promise.reject('Error collecting doc: '+err);
		});
	}


	/**
	 * Insert data into the database
	 * @param  {object} data_row
	 * @return {Promise} Promise resolves when success or rejects when error 
	 */
	_insert_data(data_row) {
		return this.model.count(data_row)
		.then((res) => {
			if(res > 0) {
				//Move along, nothing to update
				return Promise.resolve();
			} else {
				//Update time!
				const find = {};
				find[this.model_id_key] = data_row[this.model_id_key];

				return this.model.findOneAndUpdate(find, data_row, {
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
				this.emit('create', data_row); //Execute create event function
			} else if(is_inserted_row === false) {
				this.emit('update', data_row); //Execute create event function
			}
		})
		//Catch event handler error
		.catch((err) => {
			//Reformat error to be more specific
			return Promise.reject('Error emitting event: '+err);
		});
	}


	/**
	 * Find items to remove, and remove them from the database
	 * @param  {array} data - or is this an object?
	 * @param  {object} args
	 * @return {Promise}
	 */
	_garbage_then_remove(data, args) {

		return this._apply_func_to_func(this.garbage , [data, args] , this._remove_data)
		.catch((err) => {
			//If an error occured, format the error more specifically
			return Promise.reject('Error removing doc: '+err);
		});
	}


	/**
	 * Loop through items to remove, and remove them
	 * @param  {object} lookup - Mongoose Lookup
	 * @return {Promise}
	 */
	_remove_data(lookup) {
		if(typeof lookup !== 'object') {
			throw new Error('Invalid Mongoose lookup.');
		}
		//Find doc by lookup and remove it
		return this.model.findOneAndRemove(lookup).then((res) => {
			//Res is defined if something was found and deleted
			if(typeof res !== 'undefined') {
				this.emit('remove', res); //Execute create event function
			}
			return Promise.resolve(typeof res !== 'undefined');
		});
	}


	/** 
	 * Run a function, loop through the results, and pass them to another function
	 * @param  {function} func1 - Initial function to run
	 * @param  {object} args1 - arguments to run the first function with
	 * @param  {function} func2 - Second function to run, passing in the results from the first function
	 * @return {Promise} Promise when func2 is done
	 */
	_apply_func_to_func(func1, args1, func2) {
		const is_generator = (func1.constructor.name === 'GeneratorFunction');
		args1 = Array.isArray(args1) ? args1 : [args1];
		if(is_generator) {
			// If func1 is a generator (These are cool, see here: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/function*)
			// Loop through yields of func1, create array of promises, one for each yield
			// Final promise resolves when all promises resolve
			const promises = [];
			for(let item of func1.apply(this, args1)) {
				promises.push(
					// Pass results to func2, make sure it's a promise
					Promise.resolve(item).then((res) => {
						return func2.apply(this, Array.isArray(res) ? res : [res]);
					})
				);
			}
			return Promise.all(promises);
		} else {
			// Promisfy, because func1 could return an array
			return Promise.resolve(func1.apply(this, args1)).then((res_array) => {
				return Promise.all(_.map(res_array, (item) => {
					// Pass results to func2, make sure it's a promise
					return Promise.resolve(item).then((res) => {
						return func2.apply(this, Array.isArray(res) ? res : [res]);
					});
				}));
			});
		}
	}


  /**
   * Execute on this.run() failure, handle retry attempts
   * @param  {string} err_a - Error that initiated a retry
   * @return {Promise}
   */
	_maybe_retry(err_a) {

		/**
		 * @todo Only retry on certain errors. And only indiciate attept number if relevant.
		 */

		//Create error message
		err_a = vsprintf('Attempt %d/%d: %s', [this.run_attempts,this.run_attempts_limit,err_a]);

		//Check if we've reached our failure limit, and make sure stop flag wasn't set
		if(this.run_attempts < this.run_attempts_limit && this.stop_flag) {
			//Increment attempt
			this.run_attempts++;
			//return a promise containing a timout of a retry
			return new Promise(function(resolve,reject) {
				setTimeout(() => {
					//Try to run again
					this.run().catch((err_b) => {
						err_b = err_b + "\n" + err_a; //Concatenate errors with a new line
						reject(err_b);
					}).then((res) => {
						resolve(res); //Resolved! yay!
					});
				}, this.mseconds_between_run_attempts);
			});
		}

		//We tried to initialize or run many times, but couldn't, throwing in the towel
		return Promise.reject("Max run attempts reached.\n" + err_a);
	}
};

//Extend to event emitter
Collector.prototype.__proto__ = EventEmitter.prototype;

module.exports = Collector;