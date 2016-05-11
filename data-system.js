


var DataCollector = function(args) {

	var self = this;

	self.syncCallback = function() {

	};
	self.initializeCallback = function() {

	};
	self.initialized = false;
	self.sync_attempts_limit = 5;
	self.sync_attempts = 0;
	self.sync_time_between_attempts = 2000;

	//Set object properties from args
	for(var i in args) {
		self[i] = args[i];
	}

	self.maybeSync = function() {

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
			self.sync_attempts = 0;
		})
		.catch(function(err) {
			self.initialized = false;
			//If we cannot initialize sync, check our attempt #
			if(self.sync_attempts < self.sync_attempts_limit) {
				//Increment attemp
				self.sync_attempts++;
				//return a promise containing a timout of a retry
				return new Promise(function(resolve,reject) {
					setTimeout(function() {
						//Recursive promise action here
						//Not as confusing as it seems, just retrying to init/sync before we give up
						self.maybeSync().catch(function(err) {
							reject(err);
						}).then(function() {
							resolve();
						});
					}, self.sync_time_between_attempts);
				});
			} else {
				//We tried to initialize many times, but couldn't
				//Rejecting
				return Promise.reject("Max init attempts reached.");
			}
		});

	}
}