var _ = require('lodash'),
  semver = require('semver');

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
      version: '',
      description: '',
      author: '',
      license: '',
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
  create_component(type, class_name, args, require_version = '') {
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
    if (require_version && !semver.satisfies(this.version, require_version)) {
      throw new Error(
        `Version requirements not met. Plugin version: ${this
          .version} Semver requirement: ${require_version}.`
      );
    }

    return component;
  }

  /**
   * Loops through plugins and loads models
   *
   * @memberof PluginLoader
   */
  load_models(mongoose) {
    // Look at each model
    _.each(this.models, model_config => {

      model_config.schema = mongoose.Schema(model_config.schema);

      // Allow schema_callback to provide plugin options, middleware stuff
      if (typeof model_config.schema_callback === 'function') {
        model_config.schema_callback(model_config.schema);
      }

      model_config.model = mongoose.model(model_config.name, model_config.schema);

      return model_config.model;
    });
  }

  // default methods to be overridden
  load_routes(express) {}

  map_events(socket) {}

  on_load() {}

  on_unload() {}
}

module.exports = Plugin;
