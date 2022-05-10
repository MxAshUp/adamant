const Component = require('./component');
const _ = require('lodash');
const CollectorInitializeError = require('../errors').CollectorInitializeError;
const CollectorDatabaseError = require('../errors').CollectorDatabaseError;
const Counter = require('../utility').Counter;
const util = require('util');
const throwIfMissing = require('../utility').throwIfMissing;
let mongoose = require('mongoose'); // This is not const, because it needs to be rewired during testing

/**
 *
 *
 * @class Collector
 * @extends {Component}
 */
module.exports = class Collector extends Component {
  /**
   * Creates an instance of Collector.
   *
   * @param {String} model_name - The name of the model to use for inserting data.
   * @memberof Collector
   */
  constructor(args = {}) {

    let {
      model_name = throwIfMissing`model_name`,
      identifier = model_name,
      run_report_enabled = false,
      run_report_now_fn = require('perf_hooks').performance.now,
    } = args;

    super(args);

    // Merge config and assign properties to this
    Object.assign(this, {
      model_name,
      identifier,
      run_report_enabled,
      run_report_now_fn,
    });

    // Set some initial variables
    this.initialize_flag = false; // If true, initialize will execute before run
    this.run_results = {};
    this.run_report = undefined;
  }

  /**
   * Assemble the data needed to establish an API connection
   * Should be O(1)
   * @return {Promise}
   *
   * @memberof Collector
   */
  initialize() {
    return;
  }

  /**
   * Check an API for data that we might need to insert, update, or delete from the db
   * Should be O(n)
   * @return {Promise}
   *
   * @memberof Collector
   */
  prepare() {
    return;
  }

  /**
   * Collect and insert or update data
   * @param  {object} prepared_data
   * @return {Promise}
   *
   * @memberof Collector
   */
  collect(prepared_data) {
    for (let i in prepared_data) {
      this.emit('data', prepared_data[i]);
    }
    return Promise.resolve();
  }

  /**
   * Remove data which needs to be removed
   * @param  {object} prepared_data
   * @return {Promise}
   *
   * @memberof Collector
   */
  garbage(prepared_data) {
    return;
  }

  /**
   * Compares old and new doc to see if a changed occured. Can be overidden for custom behavior
   *
   * @param {Model} old_doc
   * @param {Model} new_doc
   */
  compare(old_doc, new_doc) {
    return _.isMatch(old_doc, new_doc);
  }

  // Puts item in run_report
  report_mark(...context) {
    if(this.run_report_enabled) {
      this.run_report.push([
        this.run_report_now_fn() - this.run_start,
        'run', // "run" is always top-most context
        ...context,
      ]);
    }
  }

  // Assists with start/stop events for report logging
  // Wraps cb to measure the time cb takes
  _report_log_wrap(...context) {
    return (cb) => async (...args) => {
      this.report_mark(...context);
      try {
        return await cb(...args);
      } catch(e) {
        this.report_mark(...context, 'error');
        throw e;
      } finally {
        this.report_mark(...context, 'done');
      }
    }
  }

  // Clears run_report in preparation
  // Sets new start time for run
  _start_report_log() {
    if(this.run_report_enabled) {
      this.run_report = [];
      this.run_start = this.run_report_now_fn();
      this.run_report.push([0, 'run']);
    }
  }

  /**
   * Run through the collector functions (initialize, prepare, collect, garbage)
   * When finished, will emit `done` event. If failed, `done` will be emitted with no parameters. Otherwise it will be emitted with details.
   *
   * @return {Promise} Resolves when single run done, rejects when max retries reached from failure
   *
   * @memberof Collector
   */
  run() {
    
    this._start_report_log();

    // If not initialized, then get model
    if(!this.initialize_flag) {
      try {
        this.report_mark('initialize-model');
        this.model = mongoose.model(this.model_name);
      } catch(e) {
        this.report_mark('initialize-model', 'error');
        return Promise.reject(new CollectorDatabaseError(e));
      } finally {
        this.report_mark('initialize-model', 'done');
      }
    }

    // Begin the run promise chain
    return (
      Promise.resolve()
        // If not initialized, then try to initialize
        .then(this.initialize_flag
            ? Promise.resolve()
            : this._report_log_wrap('initialize')(this.initialize.bind(this))
        )
        // Reformat possible error
        .catch(err => Promise.reject(new CollectorInitializeError(err)))
        // Prepare to collect and remove data
        .then(this._report_log_wrap('prepare')(this.prepare.bind(this)))
        // Data is prepared
        .then((res) => {
          this.prepared_data = res;
          return Promise.resolve();
        })
        // Collect data and insert it
        .then(this._report_log_wrap('collect')(this._do_collect.bind(this)))
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
          
          this.report_mark('error');
          this.report_mark('done');
          this.removeAllListeners('log');

          this.emit('done');
          return Promise.reject(err); // We're not handling the error, throw it along
        })
        .then(() => {
          // When success without error
          this.report_mark('done');
          this.removeAllListeners('log');
        })
        .then(() => {
          this.emit(
            'done',
            this.run_results,
            // Deep copy run_report, otherwise it will disappear with a re-run
            this.run_report_enabled ? [...this.run_report.map((a) => [...a])] : undefined
          );
        })
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
    return util.deprecate((prepared_data) => {
      const promises = [];

      for(let to_collect of collect_fn(prepared_data)) {
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
      .then(this.garbage.bind(this, this.prepared_data))
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
          .then((_id) => {
            counter.increment('success');
            this.report_mark('collect',_id,'done');
          })
          .catch(e => {
            counter.increment('fail');
            this.report_mark('collect','error');
            this._handle_collect_error(e);
          })
        );
      });
    };

    // Add event listener for when data is received
    this.addListener('data', insert_fn);

    return Promise.resolve()
    .then(collect_fn.bind(this, this.prepared_data))
    // The data resolved from collect will also be used for inserting into database
    // This makes things backwards compatible
    .then(res_data => typeof res_data !== 'undefined' && insert_fn(res_data))
    .catch(e => {
      this.removeAllListeners('data');
      return Promise.reject(e);
    })
    .then(() => {
      this.removeAllListeners('data');
      // Wait for data to be inserted into mongo
      return Promise.all(promises);
    }).then(() => counter);
  }

  /**
   * Insert data into the database
   * @param  {object} data_row
   * @return {Promise} Promise resolves when success or rejects when error
   *
   * @memberof Collector
   */
  _insert_data(data_row) {

    if (typeof data_row !== 'object') {
      throw new Error('Data to insert is not an object.');
    }

    if (!('_id' in data_row)) {
      throw new Error('Primary key not specified.');
    }

    const tempDoc = new this.model(data_row);
    if(tempDoc && tempDoc.validateSync) {
      const validateError = tempDoc.validateSync();
      if(validateError) {
        throw new Error(validateError);
      }
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
        if (!_.isNull(old_doc) && !this.compare(old_doc, new_doc.toObject())) {
          this.emit('update', new_doc);
        }

        return new_doc._id;
      })
    );
  }

  /**
   * Handles errors when collecting a single document
   *
   * @param {any} err
   *
   * @memberof Collector
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
   * @memberof Collector
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