/* This is an abstract plugin */

var Plugin = function(args) {

	//Scope it!
	var self = this;

	//Settable properties
	self.on_load = function(_args) {
		//Maybe we need somethign to run when plugin is loaded
	};
	self.on_unload = function(_args) {
		//Maybe we need somethign to run when plugin is unloaded
	};
	self.collectors = [];
	self.enabled = false;
	self.name = '';

	//Set object properties from args
	for(var i in args) {
		self[i] = args[i];
	}

}

module.exports = Plugin;