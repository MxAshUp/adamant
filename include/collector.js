const vsprintf = require("sprintf-js").vsprintf,
	mongoose = require('./mongoose-utilities'),
	EventEmitter = require('events'),
	_ = require('lodash'),
	CollectorInitializeError = require('./errors').CollectorInitializeError,
	CollectorDatabaseError = require('./errors').CollectorDatabaseError;



class Collector extends EventEmitter {

	/**
	 * Creates an instance of Collector.
	 *
	 * @param {object} config - An object of properties to initialize this class with
	 * @param {object} args - An object of run args
	 *
	 * @memberOf Collector
	 */
	constructor() {
		super();

		//Default object properties
    const defaults = {
			model_id_key: '',
			model_name: '',
			version: '',
			plugin_name: ''
    };

		// Merge config and assign properties to this
    Object.assign(this, defaults);

		// Set some initial variables
		this.initialize_flag = false; // If true, initialize will execute before run
		this.prepared_data = {};

		this.args = {};
	}


  /**
   * Assemble the data needed to establish an API connection
   * @param  {object} args
   * @return {Promise}
	 *
	 * @memberOf Collector
   */
	initialize(_args) {	}


  /**
   * Check an API for data that we might need to insert, update, or delete from the db
   * @param  {object} args
   * @return {Promise}
	 *
	 * @memberOf Collector
   */
	prepare(_args) {
		return;
	}


	/**
	 * Collect and insert or update data
	 * @param  {object} prepared_data
	 * @param  {object} _args
	 * @return {Promise}
	 *
	 * @memberOf Collector
	 */
	*collect(prepared_data, _args) {
		for(let item in prepared_data) {
			yield item;
		}
	}


	/**
	 * Remove data which needs to be removed
	 * @param  {object} prepared_data
	 * @param  {object} _args
	 * @return {Promise}
	 *
	 * @memberOf Collector
	 */
	garbage(prepared_data, _args) {
		return;
	}


	/**
	 * Run through the collector functions (initialize, prepare, collect, garbage)
	 * @return {Promise} Resolves when single run done, rejects when max retries reached from failure
	 *
	 * @memberOf Collector
	 */
	run() {

		// Begin the run promise chain
		return Promise.resolve().then(() => {
				// If not initialized, then try to initialize
				return this.initialize_flag ? Promise.resolve() : this.initialize.call(this,this.args);
			})
			// Reformat possible error
			.catch((err) => {
				return Promise.reject(new CollectorInitializeError(err));
			})
			// Prepare to collect and remove data
			.then(() => {
				return Promise.resolve(this.prepare.call(this,this.args));
			})
			// Data is prepared
			.then((res) => {
				this.prepared_data = res;
				return Promise.resolve();
			})
			// Collect data and insert it
			.then(() => {
				const promises = [];
				/**
				 * Loop through collect data, and insert each row asynchronously into a database
				 */
				for(let to_collect of this.collect(this.prepared_data, this.args)) {
					promises.push(
						Promise.resolve(to_collect)
						.then(this._insert_data.bind(this))
						.catch(this._handle_collect_error.bind(this))
					);
				}

				return Promise.all(promises);
			})
			// Remove docs that may need to be removed
			.then(() => {
				return Promise.all(_.map(this.garbage.apply(this, [this.prepared_data,this.args]),this._remove_data));
			})
			// collect is success, cleanup and return data
			.then((data) => {
				this.initialize_flag = true;
				return data;
			})
			// If any error occurs during sync, we need to initialize again next time around
			.catch((err) => {
				this.initialize_flag = false;
				return Promise.reject(err);// We're not handling the error, throw it along
			});
	}

	/**
	 * Insert data into the database
	 * @param  {object} data_row
	 * @return {Promise} Promise resolves when success or rejects when error
	 *
	 * @memberOf Collector
	 */
	_insert_data(data_row) {
		return this.model.count(data_row)
		.then((res) => {
			if(res > 0) {
				// Move along, nothing to update
				return Promise.resolve();
			} else {
				// Update time!
				const find = {};
				find[this.model_id_key] = data_row[this.model_id_key];

				return this.model.findOneAndUpdate(find, data_row, {
					upsert:true,
					setDefaultsOnInsert:true,
				}).then((old_doc) => {
					const is_new = old_doc === null;
					return Promise.resolve(is_new);
				});
			}
		})
		.catch((err) => {
			return Promise.reject(new CollectorDatabaseError(err));
		})
		.then((is_inserted_row) => {
			if(typeof is_inserted_row === 'undefined') return; // Nothing happened
			const event = is_inserted_row === true ? 'create' : 'update';
			this.emit(event, data_row);
		});
	}

	/**
	 * Handles errors when collecting a single document
	 *
	 * @param {any} err
	 *
	 * @memberOf Collector
	 */
	_handle_collect_error(err) {
		if(err instanceof CollectorDatabaseError) {
			/**
			 * @todo - Decide how to handle database errors
			 */
		}
		this.emit('error', err);
	}


	/**
	 * Loop through items to remove, and remove them
	 * @param  {object} lookup - Mongoose Lookup
	 * @return {Promise}
	 *
	 * @memberOf Collector
	 */
	_remove_data(lookup) {
		// Find doc by lookup and remove it
		return this.model.findOneAndRemove(lookup).then((res) => {
			// res is defined if something was found and deleted
			if(typeof res !== 'undefined') {
				this.emit('remove', res); // Execute create event function
			}
			return Promise.resolve(typeof res !== 'undefined');
		});
	}

	/**
	 * Gets model object from mongooose
	 *
	 * @param {any} model_name
	 *
	 * @memberOf Collector
	 */
	_setup_model(model_name) {
		if(typeof this.model !== 'undefined') {
			throw Error('Model already setup.');
		}
		this.model_name = model_name;
		this.model = mongoose.getModel(this.model_name);
    this.model_id_key = mongoose.getModelKey(this.model_name);
	}
}

module.exports = Collector;
