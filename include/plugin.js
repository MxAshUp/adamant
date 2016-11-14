/* This is an abstract plugin */

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

}

module.exports = Plugin;