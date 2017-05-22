var mongoose_utils = require('./mongoose-utilities'), _ = require('lodash');

class Plugin {
  /**
	 * Creates an instance of Plugin.
	 *
	 * @param {object} args
	 *
	 * @memberOf Plugin
	 */
  constructor(config) {
    config = _.isUndefined(config) ? {} : config;

    //Default object properties
    const defaults = {
      collectors: [],
      event_handlers: [],
      models: [],
      enabled: false,
      name: '',
    };

    if (!config.hasOwnProperty('name'))
      throw new Error(`A valid name is required for Plugin object.`);

    // Merge config and assign properties to this
    Object.assign(this, defaults, config);
  }

  /**
	 * Abstract way to create a component from a plugin
	 *
	 * @param {any} type collectors, event_handlers
	 * @param {any} class_name Name of class of componenet to look for and construct
	 * @param {any} args Passed to constructor of component
	 * @returns
	 *
	 * @memberOf Plugin
	 */
  create_component(type, class_name, args, version = '') {
    let component, component_class;

    // Check if type exists in plugin
    if (typeof this[type] !== 'object')
      throw new Error(`${this.name} does not have component of type: ${type}.`);

    // Find component in plugin
    component_class = _.find(this[type], { name: class_name });
    if (!component_class) throw new Error(`Component not found: ${class_name}`);

    // Create component instance
    component = new component_class(args);

    // Check version
    if (version && component.version && component.version !== version) {
      /**
       * @todo Replace with semver
       */
      throw new Error('Component version mismatch.');
    }

    return component;
  }

  // Load models
  load_models() {
    for (let model of this.models) {
      mongoose_utils.loadModel(model);
    }
  }

  // default methods to be overridden
  load_routes() {}

  map_events() {}

  on_load() {}

  on_unload() {}
}

module.exports = Plugin;
