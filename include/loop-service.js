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
    this.retry_errors = [];
    this.retry_errors_to_skip = [];

    this.loopfn_timeout_id = 0;
    this.loopfn_resolve_cb = null;
    this.loopfn_reject_cb = null;
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
  get _should_run() {
    //Should not run if stop_on_run count is reached
    if (this.stop_on_run && this.run_count >= this.stop_on_run) {
      return false;
    }

    //Proceed
    return true;
  }

  /**
	 * Checks if LoopService object should retry
	 *
	 * @return {boolean} True if should retry, False if not
	 */
  _maybe_retry(err) {
    // increment retry attempts
    this.retry_attempts++;

    // max retry attempts reached
    if (this.retry_attempts > this.retry_max_attempts) {
      this.retry_attempts = 0; // reset
      return false;
    }

    // if retry_errors has item(s) AND error not in errors to catch
    if (this.retry_errors.length && err.constructor && err.constructor.name && this.retry_errors.indexOf(err.constructor.name) === -1) {
      return false;
    }

    // error is in errors to skip
    if (err.constructor && err.constructor.name && this.retry_errors_to_skip.indexOf(err.constructor.name) > -1) {
      return false;
    }

    return true;
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
    this.emit('started');

    return new Promise((resolve, reject) => {

      this.loopfn_resolve_cb = resolve;
      this.loopfn_reject_cb = reject;

      // Loop function
      let loopfn = (() => {
        if (!this._should_run) {
          // Should run is false if we've reach out run limit, or we're instructed to stop
          this.loopfn_resolve_cb();
        } else {
          // Keep running...

          Promise.resolve().then(this.run_callback) // <--- this is where run_callback is executed
          .then(() => {
            // If all went well, let's do it again!
            this.run_count++; // <--- note this only increments on success
            this.retry_attempts = 0; // reset retries

            // Set timeout for next loopfn run
            this.loopfn_timeout_id = setTimeout(
              loopfn,
              this.run_min_time_between
            );
          }).catch((e) => {
            // Catch errors from run_callback
            this.emit('error', e); // <--- note if there are no listeners for this event, start() will be rejected with e

            // Maybe we'll retry loopfn
            if (!this._maybe_retry(e)) {
              // No retries, okay, resolve start()
              this.loopfn_resolve_cb();

            } else {
              // Emit event for retrying
              this.emit('retry', this.retry_attempts);

              // Set timeout for next loopfn run
              this.loopfn_timeout_id = setTimeout(
                loopfn,
                this.retry_time_between
              );
            }
          }).catch(this.loopfn_reject_cb); // <-- This only happens for unhandled exceptions
        }
      }).bind(this);

      // Start the loop
      setImmediate(loopfn);
    })
    .then(() => {
      this.run_status = false;
      this.stop_on_run = 0;

      //Emit stopped event
      this.emit('stopped'); //<-- Note, if error is thrown in handlers of this event, it will need to be caught by the code that executes start()
    });
  }


  /**
	 * Initiates the LoopService to stop running.
	 *
	 * @todo Implement promise return
	 * @return {Promise} Resolves or rejects when LoopService complete the stop
	 */
  stop() {
    // Loopfn might be running, we need to resolve and clear potential timeout
    clearTimeout(this.loopfn_timeout_id);
    this.loopfn_resolve_cb();
  }
}

module.exports = LoopService;
