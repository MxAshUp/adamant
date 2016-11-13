var EventEmitter = require('events');

/**
* this class will run a promise-returning function continuously when start() is triggered.
* It will stop when stop() is triggered or an error is caught.
*/
var LoopService = function(start_fn, stop_fn) {

	//Scope it!
	var self = this;

	//Set initial variables
	self.run_flag = false;
	self.run_status = false;
	self.start_fn = start_fn;
	self.stop_fn = stop_fn;
	self.run_count = 0;
	self.stop_on_run = 0;


	//Returns true if service is running
	self.is_running = function() {
		return self.run_status;
	}

	//Returns a resolve if we can proceed with a run
	self.should_run = function() {

		//stop running if stop_on_run is reached
		if(self.stop_on_run && self.run_count >= self.stop_on_run) {
			return false;
		}

		//Check if run flag is set
		if(!self.run_flag) {
			return false;
		}

		//increment run count
		self.run_count++;

		//Proceed
		return true;
	
	}

	//Starts the service
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

		//Start promise loop
		promiseLoop(self.start_fn, self.should_run)
		.catch((e) => {

			//emit error event
			self.emit('error', e);

		})
		.then(() => {
			self.run_status = false;
			self.stop_on_run = 0;
			self.run_flag = false;

			//Emit stopped event
			self.emit('stopped');

		});

	}

	//Tells the service to stop
	self.stop = function() {
		self.run_flag = false;
		if(typeof self.stop_fn === "function") {
			self.stop_fn();
		}
	}
}

//Runs fn continuously until condition_fn returns a reject
function promiseLoop(fn, condition_fn) {

	return new Promise((resolve,reject) => {
		let loop = function() {

			var condition = false;

			try {
				condition = condition_fn();
			} catch(e) {
				reject(e);
				return;
			}

			if(!condition) {
				resolve(condition);
				return;
			}

			try {
				fn().catch((e) => {

					reject(e);
					return Promise.reject();

				}).then(loop);
			} catch(e) {
				reject(e);
			}
		};

		loop();
	});
}

LoopService.prototype.__proto__ = EventEmitter.prototype;

module.exports = LoopService;