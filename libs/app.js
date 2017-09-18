let PluginLoader = require('./plugin-loader'),
  mongoose = require('mongoose'),
  _ = require('lodash'),
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

    // Load some some config from environment variables
    this.config.mongodb_url = process.env.MP_MONGODB_URL ? process.env.MP_MONGODB_URL : '';
    this.config.web_port = process.env.MP_WEB_PORT ? process.env.MP_WEB_PORT: '';

    // Override config from paramters
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

  /**
   * Loads a collector from config, creates a service
   *
   * @param {object} config
   *
   * @memberOf App
   */
  load_collector(config) {
    const collector = this.plugin_loader.create_collector(config);
    const service = new LoopService(collector.run.bind(collector));

    if (config.service_retry_max_attempts)
      service.retry_max_attempts = config.service_retry_max_attempts;

    if (config.service_retry_time_between)
      service.retry_time_between = config.service_retry_time_between;

    if (config.run_min_time_between)
      service.run_min_time_between = config.run_min_time_between;

    service.name = `${collector.model_name} collector`;
    this._bind_service_events(service);
    this._bind_model_events(collector);
    this.collect_services.push(service);
    this.collectors.push(collector);
  }

  /**
   * Loads an event handler instance into event dispatcher
   *
   * @param {object} config
   *
   * @memberOf App
   */
  load_event_handler(config) {
    const handler = this.plugin_loader.create_event_handler(config);

    if (config.event_name)
      handler.event_name = config.event_name;

    if (config.defer_dispatch)
      handler.defer_dispatch = config.defer_dispatch;

    if (config.should_handle)
      handler.should_handle = config.should_handle;

    if (config.transform_function)
      handler.transform_function = config.transform_function;

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
