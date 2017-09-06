var EventEmitter = require('events'),
  mongoose = require('mongoose'),
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
    };

    // Merge config and assign properties to this
    Object.assign(this, defaults);

    // Set some initial variables
    this.initialize_flag = false; // If true, initialize will execute before run
    this.mongoose = undefined; // mongoose instance. Should be set after constructing and before run()
    this.args = {};
  }

  /**
   * Assemble the data needed to establish an API connection
	 * Should be O(1)
   * @param  {object} args
   * @return {Promise}
	 *
	 * @memberOf Collector
   */
  initialize(_args) {}

  /**
   * Check an API for data that we might need to insert, update, or delete from the db
	 * Should be O(n)
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
  collect(prepared_data, _args) {
    for (let i in prepared_data) {
      this.emit('data', prepared_data[i]);
    }
    return Promise.resolve();
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

    // If not initialized, then get model
    if(!this.initialize_flag) {
      try {
        this.model = mongoose.model(this.model_name);
      } catch(e) {
        return Promise.reject(new CollectorDatabaseError(e));
      }
    }

    // Begin the run promise chain
    return (
      Promise.resolve()
        // If not initialized, then try to initialize
        .then(() => this.initialize_flag
            ? Promise.resolve()
            : this.initialize.call(this, this.args)
        )
        // Reformat possible error
        .catch(err => Promise.reject(new CollectorInitializeError(err)))
        // Prepare to collect and remove data
        .then(this.prepare.bind(this, this.args))
        // Data is prepared
        .then((res) => {
          this.prepared_data = res;
          return Promise.resolve();
        })
        // Collect data and insert it
        .then(() => {
          if(this.collect.constructor.name === 'GeneratorFunction') {
            return this.do_generator_collect();
          } else {
            return this.do_stream_collect();
          }
        })
        // Remove docs that may need to be removed
        .then(() => {
          return Promise.resolve(this.garbage(this.prepared_data,this.args)).then(to_remove => {
            return Promise.all(_.map(to_remove,this._remove_data.bind(this)));
          });
        })
        // collect is success, cleanup and return data
        .then(data => {
          this.initialize_flag = true;
          return data;
        })
        // If any error occurs during sync, we need to initialize again next time around
        .catch(err => {
          this.initialize_flag = false;
          return Promise.reject(err); // We're not handling the error, throw it along
        })
    );
  }

  insert_data_promise(data) {
    return Promise.resolve(data)
          .then(this._insert_data.bind(this))
          .catch(this._handle_collect_error.bind(this))
  }

  do_generator_collect() {
    const promises = [];

    for(let to_collect of this.collect(this.prepared_data, this.args)) {
      promises.push(this.insert_data_promise(to_collect));
    }

    return Promise.all(promises);
  }

  do_stream_collect() {

    // Create array of promises
    const promises = [];

    const collect_fn = (data) => {
      // Data may by a single document, or array of documents
      (!Array.isArray(data) ? [data] : data).forEach((to_collect) => {
        promises.push(this.insert_data_promise(to_collect));
      });
    };

    // Add event listener for when data is received
    this.addListener('data', collect_fn);

    return Promise.resolve()
    .then(this.collect.bind(this, this.prepared_data, this.args))
    // The data resolved from collect will also be used for inserting into database
    // This makes things backwards compatible
    .then(collect_fn)
    .catch(e => {
      this.removeAllListeners('data');
      return Promise.reject(e);
    })
    .then(() => {
      this.removeAllListeners('data');
      return Promise.all(promises);
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
    // Update time!

    if (!('_id' in data_row)) {
      throw new Error('Primary key not specified.');
    }
    const find = {_id: data_row._id};

    return this.model.findOne(find, '', { lean: true })
    .then(old_doc => this.model
      .findOneAndUpdate(find, data_row, {
        upsert: true,
        setDefaultsOnInsert: true,
        new: true,
        lean: false,
      })
      .catch(err => Promise.reject(new CollectorDatabaseError(err)))
      .then(new_doc => {

        // New document
        if (_.isNull(old_doc)) {
          this.emit('create', new_doc);
        }

        // Changed document
        if (!_.isNull(old_doc) && !_.isMatch(old_doc, new_doc.toObject())) {
          this.emit('update', new_doc);
        }

      })
    );
  }

  /**
	 * Handles errors when collecting a single document
	 *
	 * @param {any} err
	 *
	 * @memberOf Collector
	 */
  _handle_collect_error(err) {
    if (err instanceof CollectorDatabaseError) {
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
    return this.model.findOneAndRemove(lookup).then(res => {
      // res is defined if something was found and deleted
      if (!_.isNull(res)) {
        this.emit('remove', res); // Execute remove event function
      }
      return Promise.resolve(!_.isNull(res));
    });
  }
}

module.exports = Collector;
