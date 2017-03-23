const mongoose = require('./mongoose-utilities');

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
			models: [],
			enabled: false,
			name: ''
    };

		// Merge config and assign properties to this
    Object.assign(this, defaults, config);

	}

	// Load models
	load_models() {
		for(let model of this.models) {
			mongoose.createModel(model.name, model.schema);
		}
	}

	// Settable properties
	on_load() {
		this.load_models();
	}

	on_unload(_args) {
		// Maybe we need somethign to run when plugin is unloaded
	}

}

module.exports = Plugin;
