var Component = require('./component'),
  mongoose = require('mongoose'),
  _ = require('lodash'),
  CollectorInitializeError = require('./errors').CollectorInitializeError,
  CollectorDatabaseError = require('./errors').CollectorDatabaseError,
  Counter = require('./utility').Counter,
  util = require('util');

class Collector extends Component {
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
      model_name: '',
    };

    // Merge config and assign properties to this
    Object.assign(this, defaults);

    // Set some initial variables
    this.initialize_flag = false; // If true, initialize will execute before run
    this.args = {};
    this.run_results = {};
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
        .then(this._do_collect.bind(this))
        // Add to results
        .then((counter) => this.run_results.collect = counter.counters)
        // Remove docs that may need to be removed
        .then(this._do_garbage.bind(this))
        // Add to results
        .then((counter) => this.run_results.garbage = counter.counters)
        // collect is success, cleanup and return data
        .then(() => {
          this.initialize_flag = true;
        })
        // If any error occurs during sync, we need to initialize again next time around
        .catch(err => {
          this.initialize_flag = false;
          this.emit('done');
          return Promise.reject(err); // We're not handling the error, throw it along
        })
        .then(this.emit.bind(this, 'done', this.run_results))
    );
  }

  /**
   * This is used to polyfill deprecated version of Collect that are generator functions
   *
   * @param {Function} collect_fn - The collect function
   * @returns
   * @memberof Collector
   */
  _polyfill_generator_collect(collect_fn) {
    return util.deprecate((prepared_data, _args) => {
      const promises = [];

      for(let to_collect of collect_fn(prepared_data, _args)) {
        promises.push(
          Promise.resolve(to_collect)
          .then(this.emit.bind(this, 'data'))
        );
      }

      return Promise.all(promises).then(() => {});
    }, 'Collect as a generator is deprecated.');
  }

  _do_garbage() {

    const counter = new Counter();

    // Create array of promises that represent all collects and inserts
    const promises = [];

    const remove_fn = (to_garbage) => {
      promises.push(
        Promise.resolve(to_garbage)
        .then(this._remove_data.bind(this))
        .then(counter.increment.bind(counter,'success'))
        .catch(e => {
          counter.increment('fail');
          return Promise.reject(e);
        })
        .catch(this._handle_collect_error.bind(this))
      );
    };

    return Promise.resolve()
      .then(this.garbage.bind(this, this.prepared_data,this.args))
      .then(to_remove => Promise.all(_.map(to_remove, remove_fn)))
      .then(() => counter);
  }

  /**
   * Runs this.collect and facilitates inserting data
   *
   * @returns {Promise} - Resolves when all data is collected and inserted. Rejects if error occurs during collect()
   * @memberof Collector
   */
  _do_collect() {

    const counter = new Counter();

    // If this.collect is a generator, need to polyfill it
    const collect_fn = this.collect.constructor.name === "GeneratorFunction" ?
      this._polyfill_generator_collect(this.collect) :
      this.collect;

    // Create array of promises that represent all collects and inserts
    const promises = [];

    const insert_fn = (data) => {
      // Data may by a single document, or array of documents
      (!Array.isArray(data) ? [data] : data).forEach((to_collect) => {
        promises.push(
          Promise.resolve(to_collect)
          .then(this._insert_data.bind(this))
          .then(counter.increment.bind(counter,'success'))
          .catch(e => {
            counter.increment('fail');
            return Promise.reject(e);
          })
          .catch(this._handle_collect_error.bind(this))
        );
      });
    };

    // Add event listener for when data is received
    this.addListener('data', insert_fn);

    return Promise.resolve()
    .then(collect_fn.bind(this, this.prepared_data, this.args))
    // The data resolved from collect will also be used for inserting into database
    // This makes things backwards compatible
    .then(res_data => typeof res_data !== 'undefined' && insert_fn(res_data))
    .catch(e => {
      this.removeAllListeners('data');
      return Promise.reject(e);
    })
    .then(() => {
      this.removeAllListeners('data');
      return Promise.all(promises);
    }).then(() => counter);
  }

  /**
	 * Insert data into the database
	 * @param  {object} data_row
	 * @return {Promise} Promise resolves when success or rejects when error
	 *
	 * @memberOf Collector
	 */
  _insert_data(data_row) {

    if (typeof data_row !== 'object') {
      throw new Error('Data to insert is not an object.');
    }

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
    return this.model.findOneAndRemove(lookup)
      .then(res => {
        // res is defined if something was found and deleted
        if (!_.isNull(res)) {
          this.emit('remove', res); // Execute remove event function
        }
        return Promise.resolve(!_.isNull(res));
      })
      .catch(err => Promise.reject(new CollectorDatabaseError(err)));
  }
}

module.exports = Collector;
