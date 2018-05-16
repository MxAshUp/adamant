const PluginLoader = require('./plugin-loader');
const _ = require('lodash');
const get_component_inheritance = require('./utility').get_component_inheritance;
const EventDispatcher = require('./event-dispatcher');
const Event = require('./event');
const EventEmitter = require('events');
const http = require('http');
const socketio = require('socket.io');
const express = require('express');
const throwIfMissing = require('./utility').throwIfMissing;
let mongoose = require('mongoose'); // This is not const, because it needs to be rewired during testing

/**
 * App class for connecting everything together
 *
 * @class App
 */
module.exports = class App extends EventEmitter {
  /**
   * Creates an instance of App.
   * @param {String} mongodb_url - The mongo connection url.
   * @param {String} web_port - The port to use for Express.
   */
  constructor(config = {}) {
    super();
    // Establish some defaults
    this.plugin_loader = new PluginLoader();
    this.plugin_loader.load_plugin('adamant');
    this.collect_services = [];
    this.components = [];

    // Load some some config from environment variables
    // @todo - abstract this feature out, eg config_from_env
    // Override config from parameters
    this.config = Object.assign({}, {
      mongodb_url: process.env.MP_MONGODB_URL ? process.env.MP_MONGODB_URL : '',
      web_port: process.env.MP_WEB_PORT ? process.env.MP_WEB_PORT: '',
    }, config);

    // Set up event dispatcher loop service
    this.event_dispatcher = new EventDispatcher();
    this.event_dispatcher_service = this.load_component({
      name: 'LoopService',
      parameters: {
        run_callback: () => {
          // We are intentionally not returning the promise from event_dispatcher.run, because it will not finish until even the deferred events are finished
          // @todo - figure out better way around this.
          this.event_dispatcher.run()
        },
        name: 'Event dispatcher service',
      }
    });
    this.event_dispatcher.on('error', console.log);
    this.express_app = express();
    this.server = http.createServer(this.express_app);
    this.io = socketio(this.server);

    // Set component hooks
    this.on('Collector.load', this._handle_load_collector);
    this.on('EventHandler.load', this._handle_load_event_handler);
    this.on('Component.load', this._handle_load_component);
    this.on('LoopService.load', this._handle_load_loop_service);
  }

  /**
   * Loads mongo models, express routes, and sockets.
   *
   * @returns {Promise}
   * @memberof App
   */
  init() {
    return Promise.resolve()
    .then(this._load_database.bind(this))
    .then(this._load_routes.bind(this))
    .then(this._load_sockets.bind(this));
  }

  /**
   * Conencts to mongodb, loads mongoose, and loads plugin models
   *
   * @memberof App
   */
  _load_database() {
    return Promise.resolve()
    .then(mongoose.connect.bind(mongoose, this.config.mongodb_url))
    .then(this.plugin_loader.load_plugin_models.bind(this.plugin_loader, mongoose))
    .then((models) => {
      models.map((model) => this.emit(`model.${model.name}.load`, model));
    });
  }

  /**
   * Loads express endpoints for app and plugins
   *
   * @memberof App
   */
  _load_routes() {
    this.plugin_loader.load_plugin_routes(this.express_app);
  }

  /**
   * Binds socket events for app and plugins
   *
   * @memberof App
   */
  _load_sockets() {
    this.io.on('connection', this.plugin_loader.load_plugin_sockets.bind(this.plugin_loader));
  }

  /**
   * Loads plugins
   *
   * @param {Array} plugin_dirs - Array of plugin or module names to be loaded
   * @memberof App
   */
  load_plugins(plugin_dirs) {
    _.forEach(plugin_dirs, plugin_path => {
      this.plugin_loader.load_plugin(plugin_path, this.config);
    });
  }


  /**
   * Creates a component instance by calling Plugin.create_component.
   * When component is created, App will emit event named `${constructor_name}.load` for every inheritance of the Component. For example, creating an EventHandler will emit `Component.load` then `EventHandler.load`.
   *
   * @param {String} name - The name of the component (class name), including the plugin namespace. Example: 'adamant/EventHandler'. If no plugin name is specified, adamant is assumed.
   * @param {String} version - Semver format of the version required. Plugin.create_component will throw error if version requirements not met.
   * @param {Object} parameters - These are the parameters passed to the constructor of the component
   * @returns {Component} - The component created
   * @memberof App
   */
  load_component({
    name = throwIfMissing`name`,
    version = '',
    parameters = {},
  } = {}) {

    let plugin_name = 'adamant';

    // This allows config to specify plugin and component name in single argument.
    if(name.indexOf('/') !== -1) {
      // Get last slash
      let split_pos = name.lastIndexOf('/');

      // Plugin name is the first element
      plugin_name = name.slice(0, split_pos);

      // Component name is the last element
      name = name.slice(split_pos + 1, name.length);
    }

    // Find the plugin
    const plugin = this.plugin_loader.get_plugin_by_name(plugin_name);

    // Create the component
    const component = plugin.create_component({
      name,
      version,
      parameters,
    });

    // Find out what kind of component this is
    const component_constructors = get_component_inheritance(component).map(c => c.name);

    // Apply component hooks to created component
    // These hooks are added with add_component_hook
    component_constructors.forEach(constructor_name => {
      this.emit(`${constructor_name}.load`, component, parameters);
    });

    return component;
  }

  /**
   * Loads a collector instance into the app
   *
   * @param {Collector} collector - The instance loaded
   * @param {Object} parameters - Parameters used for loading
   * @memberof App
   */
  _handle_load_collector(collector, parameters) {

    // clear data on start if specified
    if(parameters.clear_on_start) {
      this.once(`model.${collector.model_name}.load`, (model) => {
        model.remove({}).catch(this._handle_collector_error.bind(this, collector));
      });
    }

    const service_config = {};
    service_config.run_callback = collector.run.bind(collector);
    service_config.name = `${collector.identifier} collector`;

    if (parameters.service_retry_max_attempts)
      service_config.retry_max_attempts = parameters.service_retry_max_attempts;

    if (parameters.service_retry_time_between)
      service_config.retry_time_between = parameters.service_retry_time_between;

    if (parameters.service_run_min_time_between)
      service_config.run_min_time_between = parameters.service_run_min_time_between;

    const service = this.load_component({
      name: 'LoopService',
      parameters: service_config
    });

    // Bind events
    collector.on('error', this._handle_collector_error.bind(this, collector));
    // Emits `${collector.model_name}.done` each time a collector finishes a run.
    collector.on('done', this.event_dispatcher.emit.bind(this.event_dispatcher, `${collector.model_name}.done`));

    // Add event handling for collector
    _.each(['create', 'update', 'remove'], event => {
      collector.on(event, this._handle_collector_event.bind(this, collector, event));
    });

    this.collect_services.push(service);
  }

  /**
   * Loads a event handler instance into the app
   *
   * @param {EventHandler} event_handler - The instance loaded
   * @param {Object} parameters - Parameters used for loading
   * @memberof App
   */
  _handle_load_event_handler(event_handler, parameters) {
    // Add event handler to event dispatcher
    this.event_dispatcher.load_event_handler(event_handler);
  }

  /**
   * Handles loading a component instance into the app
   *
   * @param {Component} component - The instance loaded
   * @param {Object} parameters - Parameters used for loading
   * @memberof App
   */
  _handle_load_component(component, parameters) {
    // Add component to internal array
    this.components.push(component);
  }

  /**
   * Temporary way to handle service events
   *
   * @param {LoopService} service
   *
   * @memberof App
   */
  _handle_load_loop_service(service) {
    service.on('error', this._handle_service_error.bind(this, service));
    service.on('start', this.debug_message.bind(this, `${service.name} service`, 'started'));
    service.on('stop', this.debug_message.bind(this, `${service.name} service`, 'stopped'));
  }

  _handle_collector_event(collector, event_name, data) {
    this.event_dispatcher.enqueue_event(`${collector.model_name}.${event_name}`, data);
  }

  _handle_collector_error(collector, error) {
    this.debug_message(`${collector.identifier} collector`, `error: ${error.message ? error.message : ''} ${error.stack ? error.stack : ''}`, error.culprit && error.culprit.stack ? error.culprit.stack : '');
  }

  _handle_service_error(service, error) {
    this.debug_message(`${service.name} service`, `error: ${error.message ? error.message : ''} ${error.stack ? error.stack : ''}`, error.culprit && error.culprit.stack ? error.culprit.stack : '');
  }

  debug_message(name, message, details) {
    console.log(`[${name}] ${message}`);
    if (details) {
      console.log(`More Details: ${details}`);
    }
  }

  /**
   * Starts loop services and event dispatcher.
   *
   * @memberof App
   */
  run() {

    // graceful shutdown
    process.on('SIGTERM', this.stop.bind(this));

    this.event_dispatcher_service.start();
    _.each(this.collect_services, service => service.start());
    this.server.listen(this.config.web_port);
  }

  stop() {
    // halt web server
    this.server.close();

    // stop collector services
    _.each(this.collect_services, service =>
      service.stop()
    );

    // stop event dispatcher service
    this.event_dispatcher_service.stop();

    // terminate app process
    process.exit(0);
  }
}