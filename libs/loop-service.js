const EventEmitter = require('events');

class LoopService extends EventEmitter {
  /**
	 * Creates a LoopService object
	 * A LoopService object will run a function continuously when start() is triggered.
	 * It will stop when stop() is called, an error is caught, or has reached a run limit.
	 *
	 * @param {function} run_callback - The function to run continuously. Can be a Promise-returning function.
	 */
  constructor(run_callback) {
    super();

    //Set initial variables
    this.run_status = false;
    this.run_callback = run_callback;
    this.run_min_time_between = 0;
    this.run_count = 0;
    this.stop_on_run = 0;

    this.retry_attempts = 0;
    this.retry_max_attempts = 0;
    this.retry_time_between = 0;
    this.errors_only_retry_on = [];
    this.errors_dont_retry_on = [];

    this.loop_function_timeout_id = 0;
    this.loop_function_resolve_cb = null;
    this.loop_function_reject_cb = null;
  }

  /**
	 * Checks if the LoopService object is running
	 *
	 * @return {boolean} True if running, False if not
	 */
  get is_running() {
    return this.run_status;
  }

  /**
	 * Checks if LoopService object should proceed to execute run_callback
	 *
	 * @return {boolean} True if running, False if not
	 */
  get _should_stop() {
    // Should stop if stop_on_run count is reached
    if (this.stop_on_run && this.run_count >= this.stop_on_run) {
      return true;
    }

    // Don't stop
    return false;
  }

  /**
	 * Checks if LoopService object should retry
	 *
	 * @return {Promise} resolves if can retry, rejects with error otherwise
	 */
  _maybe_retry(err) {
    // We're not allowed to retry
    if (this.retry_max_attempts === 0) {
      return Promise.reject(err);
    }

    // max retry attempts reached
    if (this.retry_attempts >= this.retry_max_attempts) {
      this.retry_attempts = 0; // reset
      return Promise.reject(
        new Error(`Max retry attempts (${this.retry_max_attempts}) reached.`)
      );
    }

    // if errors_only_retry_on has item(s) AND error not in errors to catch, then bubble it up
    if (
      this.errors_only_retry_on.length &&
      err.constructor &&
      err.constructor.name &&
      this.errors_only_retry_on.indexOf(err.constructor.name) === -1
    ) {
      return Promise.reject(err);
    }

    // error is in errors to skip
    if (
      this.errors_dont_retry_on.length &&
      err.constructor &&
      err.constructor.name &&
      this.errors_dont_retry_on.indexOf(err.constructor.name) > -1
    ) {
      return Promise.reject(err);
    }

    // increment retry attempts, return resolve
    return Promise.resolve(this.retry_attempts++);
  }

  /**
	 * Initiates the LoopService to begin running.
	 *
	 * @param {boolean} run_once - If True, LoopService will only execute run_callback once, and not continuously.
	 * @return {Promise} Resolves or rejects when LoopService stops
	 */
  start(run_once = false) {
    // Don't start if already running
    if (this.is_running) {
      return Promise.reject('Loop service is already running.');
    }

    // Set flag
    this.run_status = true;

    // Set stop if we are only running once
    if (run_once) {
      this.stop_on_run = this.run_count + 1;
    }

    // Trigger start event
    this.emit('start');

    // Loop function
    const loop_function = () => {
      if (this._should_stop) {
        // Should Stop is true if we've reach out run limit, or we're instructed to stop
        return this.loop_function_resolve_cb();
      }

      Promise.resolve()
        .then(this.run_callback) // <--- this is where run_callback is executed
        .then(() => {
          // If all went well, let's do it again!
          this.run_count++; // <--- note this only increments on success
          this.retry_attempts = 0; // reset retries

          // Set timeout for next loop_function run
          this.loop_function_timeout_id = setTimeout(
            loop_function,
            this.run_min_time_between
          );
        })
        .catch(e => {
          // Catch errors from run_callback

          // Maybe we'll retry loop_function
          return this._maybe_retry(e)
            .then(attempt => {
              // We're good to retry!

              // Emit error
              this.emit('error', e);

              // Retrying
              this.emit('retry', attempt);

              // Set timeout for next loop_function run
              this.loop_function_timeout_id = setTimeout(
                loop_function,
                this.retry_time_between
              );
            })
            .catch(er => {
              this.emit('error', er);
              this.loop_function_resolve_cb();
            });
        })
        .catch(this.loop_function_reject_cb); // <-- This only happens for unhandled exceptions
    };

    const promise = new Promise((resolve, reject) => {
      this.loop_function_resolve_cb = resolve;
      this.loop_function_reject_cb = reject;

      // Start the loop
      setImmediate(loop_function);
    }).then(() => {
      this.run_status = false;
      this.stop_on_run = 0;

      //Emit stop event
      this.emit('stop'); //<-- Note, if error is thrown in handlers of this event, it will need to be caught by the code that executes start()
    });

    return promise;
  }

  /**
	 * Initiates the LoopService to stop running.
	 *
	 * @todo Implement promise return
	 * @return {Promise} Resolves or rejects when LoopService complete the stop
	 */
  stop() {
    // Loop_function might be running, we need to resolve and clear potential timeout
    clearTimeout(this.loop_function_timeout_id);
    this.loop_function_resolve_cb();
  }
}

module.exports = LoopService;
