/* This is an abstract plugin */

class Plugin {

	/**
	 * Creates an instance of Plugin.
	 *
	 * @param {object} args
	 *
	 * @memberOf Plugin
	 */
	constructor(config) {

		//Default object properties
    const defaults = {
			collectors: [],
			event_handlers: [],
			enabled: false,
			name: ''
    };

		// Merge config and assign properties to this
    Object.assign(this, defaults, config);

	}

	//Settable properties
	on_load(_args) {
		//Maybe we need somethign to run when plugin is loaded
	}

	on_unload(_args) {
		//Maybe we need somethign to run when plugin is unloaded
	}

}

module.exports = Plugin;
