const _ = require('lodash');
const semver = require('semver');
const throwIfMissing = require('./utility').throwIfMissing;

module.exports = class Plugin {

  /**
   * Creates an instance of Plugin.
   *
   * @param {String} name - Name of plugin.
   * @param {Array} [components=] - Component constructors.
   * @param {Array} [models=] - Mongoose model definitions.
   * @param {boolean} [enabled=false] - Whether or not to enable plugin.
   * @param {String} [version=] - Plugin version.
   * @param {String} [description=] - Description of plugin. Usually the same as what's in package.json.
   * @param {String} [author=] - Author of plugin. Usually the same as what's in package.json.
   * @param {String} [license=] - License of plugin. Usually the same as what's in package.json.
   * @param {Function} [load_routes=] - Function to register Express routes. @todo - remove as parameter
   * @param {Function} [map_events=] - Function to map docker.io events. @todo - remove as parameter
   * @param {Function} [on_load=] - Function to call when plugin loads. @todo - remove as parameter
   * @param {Function} [on_unload=] - Function to call when plugin is unloaded. @todo - remove as parameter
   * @param {Function} [load_models=] - Function to call when plugin loads models. @todo - remove as parameter
   */
  constructor({
      name = throwIfMissing`name`,
      components = [],
      models = [],
      enabled = false,
      version = '',
      description = '',
      author = '',
      license = '',
      load_routes = null,
      map_events = null,
      on_load = null,
      on_unload = null,
      load_models = null,
    } = {}) {

    // Merge config and assign properties to this
    Object.assign(this, {
      name,
      components,
      models,
      enabled,
      version,
      description,
      author,
      license,
      load_routes: load_routes ? load_routes : this.load_routes,
      map_events: map_events ? map_events : this.map_events,
      on_load: on_load ? on_load : this.on_load,
      on_unload: on_unload ? on_unload : this.on_unload,
      load_models: load_models ? load_models : this.load_models,
    });
  }

  /**
   * Modifies a model's schema. To make sure schema is extended, extend_schema must be called before Plugin.load_models (this is called in App.init).
   *
   * @param {String} model_name - The name of the model to modify.
   * @param {Object} extend_schema - Schema definition that will be added to existing schema. See [http://mongoosejs.com/docs/guide.html] for more info.
   * @memberof Plugin
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
   * Looks for a component in the plugins Components, creates and instance, and returns it.
   *
   * @param {String} name - Name of the component's class.
   * @param {String} version - The semver requirement. If plugin's version doesn't satisfy version, then an error will be thrown calling this function.
   * @param {any} parameters - Passed as arguments to the component constructor. See component constructor for reference.
   * @returns {Component} - The Component created.
   * @memberof Plugin
   */
  create_component({
    name = throwIfMissing`name`,
    version = '',
    parameters = {},
  } = {}) {

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
   * Loops through models and creates them in mongoose.
   *
   * @param {mongoose} mongoose - The mongoose instance to use.
   * @memberof Plugin
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