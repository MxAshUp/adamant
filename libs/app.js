let PluginLoader = require('./plugin-loader'),
  mongoose = require('mongoose'),
  _ = require('lodash'),
  get_component_inheritance = require('./utility').get_component_inheritance,
  LoopService = require('./loop-service'),
  EventDispatcher = require('./event-dispatcher'),
  EventHandler = require('./event-handler'),
  Event = require('./event'),
  http = require('http'),
  socketio = require('socket.io'),
  express = require('express');

/**
 * App class for connecting everything together
 *
 * @param {Object} config - App config. Example:
 *
 * @class App
 */
class App {
  constructor(config) {
    // Establish some defaults
    this.config = {};
    this.plugin_loader = new PluginLoader();
    this.plugin_loader.load_plugin('mp-core');
    this.collect_services = [];
    this.collectors = [];
    this.component_hooks = [];

    // Load some some config from environment variables
    this.config.mongodb_url = process.env.MP_MONGODB_URL ? process.env.MP_MONGODB_URL : '';
    this.config.web_port = process.env.MP_WEB_PORT ? process.env.MP_WEB_PORT: '';

    // Override config from parameters
    Object.assign(this.config, config);

    // Set up event dispatcher loop service
    this.event_dispatcher = new EventDispatcher();
    this.event_dispatcher_service = new LoopService(
      this.event_dispatcher.run.bind(this.event_dispatcher)
    );
    this.event_dispatcher_service.name = 'Event dispatcher';
    this.event_dispatcher.on('error', console.log);
    this._bind_service_events(this.event_dispatcher_service);
    this.express_app = express();
    this.server = http.createServer(this.express_app);
    this.io = socketio(this.server);

    // Set component hooks
    this.add_component_hook('Collector', this.load_collector.bind(this));
    this.add_component_hook('EventHandler', this.load_event_handler.bind(this));
  }

  /**
   * Runs app initialize functions
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
    .then(this.plugin_loader.load_plugin_models.bind(this.plugin_loader, mongoose));
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
   * @param {Array} plugin_dirs - Array of plugin names to be required
   *
   * @memberOf App
   */
  load_plugins(plugin_dirs) {
    _.forEach(plugin_dirs, plugin_path => {
      this.plugin_loader.load_plugin(plugin_path, this.config);
    });
  }

  load_component({name, plugin_name, version, parameters = {}}) {

    const component = this.plugin_loader.create_component.apply(this.plugin_loader, arguments);
    const constructors = get_component_inheritance(component);
    const base_constructor_name = constructors.pop().name;

    _.filter(this.component_hooks, {constructor_name: base_constructor_name}).forEach(component_hook => {
      component_hook.callback(component, parameters);
    });

    return component;
  }

  /**
   * Registers a callback function that will be run everytime a component of type 'constructor_name' is loaded in the app.
   *
   * @param {String} constructor_name
   * @param {function} callback
   * @memberof App
   */
  add_component_hook(constructor_name, callback) {
    this.component_hooks.push({
      constructor_name,
      callback
    });
  }

  /**
   * Loads a collector instance into the app
   *
   * @param {Collector} collector - The instance to load
   * @param {Object} parameters - Parameters to user for loading
   * @memberof App
   */
  load_collector(collector, parameters) {
    const service = new LoopService(collector.run.bind(collector));

    if (parameters.service_retry_max_attempts)
      service.retry_max_attempts = parameters.service_retry_max_attempts;

    if (parameters.service_retry_time_between)
      service.retry_time_between = parameters.service_retry_time_between;

    if (parameters.service_run_min_time_between)
      service.service_run_min_time_between = parameters.service_run_min_time_between;

    service.name = `${collector.model_name} collector`;
    this._bind_service_events(service);
    this._bind_model_events(collector);
    this.collect_services.push(service);
    this.collectors.push(collector);
  }

  /**
   * Loads a event handler instance into the app
   *
   * @param {EventHandler} event_handler - The instance to load
   * @param {Object} parameters - Parameters to user for loading
   * @memberof App
   */
  load_event_handler(handler, parameters) {
    if (parameters.event_name)
      handler.event_name = parameters.event_name;

    if (parameters.defer_dispatch)
      handler.defer_dispatch = parameters.defer_dispatch;

    if (parameters.should_handle)
      handler.should_handle = parameters.should_handle;

    if (parameters.transform_function)
      handler.transform_function = parameters.transform_function;

    this.event_dispatcher.load_event_handler(handler);
  }

  /**
   * Binds model data events in collector to event dispatcher queue
   *
   *  @param {Collector} collector
   *
   * @memberOf App
   */
  _bind_model_events(collector) {
    //Add event handling
    _.each(['create', 'update', 'remove'], event => {
      collector.on(event, this.handle_collector_event.bind(this, collector, event));
    });
    collector.on('error', this.handle_collector_error.bind(this, collector));
    collector.on('done', this.event_dispatcher.emit.bind(this.event_dispatcher, `${collector.model_name}.done`));
  }

  /**
   * Temporary way to handle service events
   *
   * @param {LoopService} service
   *
   * @memberOf App
   */
  _bind_service_events(service) {
    service.on('error', this.handle_service_error.bind(this, service));
    service.on('start', this.debug_message.bind(this, `${service.name} service`, 'started'));
    service.on('stop', this.debug_message.bind(this, `${service.name} service`, 'stopped'));
  }

  handle_collector_event(collector, event_name, data) {
    this.event_dispatcher.enqueue_event(
      new Event(`${collector.model_name}.${event_name}`, data)
    );
  }

  handle_collector_error(collector, error) {
    this.debug_message(`${collector.model_name} collector`, `error: ${error.stack}`, error.culprit && error.culprit.stack ? error.culprit.stack : '');
  }

  handle_service_error(service, error) {
    this.debug_message(`${service.name} service`, `error: ${error.stack}`, error.culprit && error.culprit.stack ? error.culprit.stack : '');
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

module.exports = App;
