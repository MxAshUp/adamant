/* This is an abstract plugin */

class Plugin {

	/**
	 * Creates an instance of Plugin.
	 * 
	 * @param {object} args
	 * 
	 * @memberOf Plugin
	 */
	constructor(args) {
		this.collectors = [];
		this.enabled = false;
		this.name = '';

		//Set object properties from args
		for(var i in args) {
			this[i] = args[i];
		}
	}

	//Settable properties
	on_load(_args) {
		//Maybe we need somethign to run when plugin is loaded
	};
	on_unload(_args) {
		//Maybe we need somethign to run when plugin is unloaded
	};

}

module.exports = Plugin;