const _ = require('lodash');
const semver = require('semver');
const throwIfMissing = require('./utility').throwIfMissing;

module.exports = class Plugin {
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
      components: [],
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
   * Allows extending model schema before model is loaded
   *
   * @param {String} plugin_name
   * @param {String} model_name
   * @param {Object} schema
   * @memberof PluginLoader
   */
  extend_schema(model_name, extend_schema) {
    const model_config = _.find(this.models, {name: model_name});
    const extend_path_keys = _.keys(extend_schema);
    const existing_path_keys = _.union(_.keys(model_config.schema), ['_id']);
    const not_allowed_keys = _.intersection(extend_path_keys, existing_path_keys);
    if(not_allowed_keys.length) {
      throw new Error(`Cannot extend ${model_name} because path(s) cannot be overwritten: ${not_allowed_keys.join(', ')}`);
    }
    // Save a copy of original schema
    if(_.isUndefined(model_config._original_schema)) {
      model_config._original_schema = Object.assign({}, model_config.schema);
    }
    model_config.schema = Object.assign({}, model_config.schema, extend_schema);
  }

  /**
   * Abstract way to create a component from a plugin
   *
   * @param {String} class_name Name of class of componenet to look for and construct
   * @param {any} params Passed to constructor of component
   * @returns
   *
   * @memberOf Plugin
   */
  create_component({
    name = throwIfMissing`name`,
    version = '',
    parameters = {},
  }) {

    // Find component in plugin
    const component_constructor = _.find(this.components, { name });
    if (!component_constructor) throw new Error(`Component not found: ${name}`);

    // Check version
    if (version && !semver.satisfies(this.version, version)) {
      throw new Error(
        `Version requirements not met. Plugin version: ${this
          .version} Semver requirement: ${version}.`
      );
    }

    // Create component instance
    return new component_constructor(parameters);
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