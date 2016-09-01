/* This is an abstract plugin */

var DataCollector = require('./data-collector');

var Plugin = function(args) {

	//Scope it!
	var self = this;

	//Settable properties
	self.onLoad = function(_args) {
		//Maybe we need somethign to run when plugin is loaded
	};
	self.onUnLoad = function(_args) {
		//Maybe we need somethign to run when plugin is unloaded
	};
	self.data_collectors = [];
	self.enabled = false;
	self.name = '';

	//Set object properties from args
	for(var i in args) {
		self[i] = args[i];
	}

	//Let's initialize the components
	if(self.data_collectors.length) {
		for(var i in self.data_collectors) {
			self.data_collectors[i] = new DataCollector(self.data_collectors[i]);
		}
	}

	self._file_path = '';
}

module.exports = Plugin;