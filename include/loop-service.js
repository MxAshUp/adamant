var EventEmitter = require('events');
var promiseLoop = require('promise-loop');

/**
 * Creates a LoopService object
 * A LoopService object will run a function continuously when start() is triggered.
 * It will stop when stop() is called, an error is caught, or has reached a run limit.
 *
 * @param {function} run_callback - The function to run continuously. Can be a Promise-returning function.
 * @param {function} stop_callback - The function that will run when run_callback stops
 */
var LoopService = function(run_callback, stop_callback) {

	//Scope it!
	var self = this;

	//Set initial variables
	self.run_flag = false;
	self.run_status = false;
	self.run_callback = run_callback;
	self.stop_callback = stop_callback;
	self.run_count = 0;
	self.stop_on_run = 0;


	/**
	 * Checks if the LoopService object is running
	 * 
	 * @return {boolean} True if running, False if not
	 */
	self.is_running = function() {
		return self.run_status;
	}

	/**
	 * Checks if LoopService object should proceed to execute run_callback
	 * 
	 * @return {boolean} True if running, False if not
	 */	
	self.should_run = function() {

		//Should not run if stop_on_run count is reached
		if(self.stop_on_run && self.run_count >= self.stop_on_run) {
			return false;
		}

		//Should not run if run_flag isn't set
		if(!self.run_flag) {
			return false;
		}

		//Proceed
		return true;

	}


	/**
	 * Initiates the LoopService to begin running.
	 * 
	 * @param {boolean} run_once - If True, LoopService will only execute run_callback once, and not continuously.
	 * @return {Promise} Resolves or rejects when LoopService stops
	 */	
	self.start = function(run_once = false) {

		//Don't start if already running
		if(self.run_flag) {
			return;
		}

		//Set flag
		self.run_flag = true;

		//Set stop if we are only running once
		if(run_once) {
			self.stop_on_run = self.run_count + 1;
		}

		//trigger start event
		self.emit('started');

		return promiseLoop(() => {

			//Check if need to keep running
			if(!self.should_run()) {
				return Promise.reject();
			}

			//increment run count
			self.run_count++;

			//run the start function
			return self.run_callback();

		}, promiseLoop.catchRejectPromise)()
		.catch((e) => {

			//Emit error event
			self.emit('error', e);

		})
		.then(() => {
			if(typeof self.stop_callback === "function") {
				return self.stop_callback();
			}
		})
		.then(() => {
			self.run_status = false;
			self.stop_on_run = 0;
			self.run_flag = false;

			//Emit stopped event
			self.emit('stopped'); //<-- Note, if error is thrown in handlers of this event, it will need to be caught by the code that executes start()

		});

	}

	/**
	 * Initiates the LoopService to stop running.
	 * 
	 * @todo Implement promise return
	 * @return {Promise} Resolves or rejects when LoopService complete the stop
	 */	
	self.stop = function() {
		self.run_flag = false;
	}
}

LoopService.prototype.__proto__ = EventEmitter.prototype;

module.exports = LoopService;