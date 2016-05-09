


var DataCollector = function(args) {

	var self = this;

	self.syncCallback = function() {

	};
	self.initializeCallback = function() {

	};
	self.initialized = false;
	self.init_attempt_limit = 5;
	self.init_time_between_attempts = 2000;

	//Set object properties from args
	for(var i in args) {
		self[i] = args[i];
	}

	self.maybeSync = function() {

		var init_attempts = 0;
		var init_resolve;

		//Maybe intialize
		if(initialized) {
			init_resolve = Promise.resolve();
		} else {
			init_resolve = self.initializeCallback();
		}

		//Try to initialize, if needed
		return init_resolve
		.then(self.syncCallback)
		.then(function() {
			self.initialized = true;
		})
		.catch(function(err) {
			self.initialized = false;
			//If we cannot initialize sync, check our attempt #
			if(init_attempts < self.init_attempt_limit) {
				//Increment attemp
				init_attempts++;
				//return a promise containing a timout of a retry
				return new Promise(function(resolve,reject) {
					setTimeout(function() {
						//Recursive promise action here
						//Not as copnfusing as it seems, just retrying
						self.maybeSync().catch(function(err) {
							reject(err);
						}).then(function() {
							resolve();
						});
					}, self.init_time_between_attempts);
				});
			} else {
				//We tried to initialize many times, but couldn't
				//Rejecting
				return Promise.reject("Max init attempts reached.");
			}
		});

	}
}