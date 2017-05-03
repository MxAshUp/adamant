const PluginLoader = require('./plugin-loader'),
  _config = require('./config.js'),
  mongoose_util = require('./mongoose-utilities'),
  _ = require('lodash'),
  LoopService = require('./loop-service'),
  EventDispatcher = require('./event-dispatcher'),
  EventHandler = require('./event-handler'),
  Event = require('./event'),
  chalk = require('chalk'),
  express = require('express');

/**
 * A singleton class
 *
 * @class App
 */
class App {
  constructor() {
    // Set global base dir for easy require
    global.app_require = function(name) {
      return require(__dirname + '/' + name);
    };

    this.plugin_loader = new PluginLoader();
    this.collect_services = [];
    this.event_dispatcher = new EventDispatcher();
    this.event_dispatcher_service = new LoopService(
      this.event_dispatcher.run.bind(this.event_dispatcher)
    );
    this.event_dispatcher_service.name = 'Event dispatcher';
    this.event_dispatcher.on('error', console.log);
    this.bind_service_events(this.event_dispatcher_service);
    this.express = express();
  }

  init() {
    return mongoose_util.mongoose.connect(_config.mongodb.uri);
  }

  /**
   * Loads plugins
   *
   *
   * @memberOf App
   */
  load_plugins(plugin_dirs) {
    _.forEach(plugin_dirs, plugin_path => {
      this.plugin_loader.load_plugin(plugin_path.path, _config);
    });
  }

  load_plugin_event_handlers() {
    // Look at each plugin
    _.each(this.plugin_loader.plugins, plugin => {
      // Look at each event handler
      _.each(plugin.event_handlers, event_handler => {
        let handler = new EventHandler(event_handler);
        this.event_dispatcher.load_event_handler(handler);
      });
    });
  }

  load_plugin_routes() {
    // Look at each plugin
    _.each(this.plugin_loader.plugins, plugin => {
      // Load plugin routes (if any)
      plugin.load_routes(this.express);
    });
  }

  /**
   * Loads a collector from config, creates a service
   *
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

    service.name = `${collector.model_name} collector`;
    this.bind_service_events(service);
    this.bind_model_events(collector);
    this.collect_services.push(service);
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
    this.event_dispatcher.load_event_handler(handler);
  }

  /**
   * Binds model data events in colelctor to event dispatcher queue
   *
   *  @param {Collector} collector
   *
   * @memberOf App
   */
  bind_model_events(collector) {
    //Add event handling
    _.each(['create', 'update', 'remove'], event => {
      collector.on(event, data => {
        this.event_dispatcher.enqueue_event(
          new Event(`${collector.model_name}.${event}`, data)
        );
      });
    });

    collector.on('error', err => {
      console.log(`${chalk.red('error')}: ${chalk.grey(err.stack)}`);
    });
  }

  /**
   * Temporary way to handle service events
   *
   * @param {LoopService} service
   *
   * @memberOf App
   */
  bind_service_events(service) {
    service.on('error', e => {
      console.log(`${chalk.bgCyan(service.name)} service ${chalk.red('error')}: ${chalk.grey(e.stack)}`);
      if (e.culprit) {
        console.log(`${chalk.red('error details')}: ${chalk.grey(e.culprit)}`);
      }
    });
    service.on('started', () =>
      console.log(`${chalk.bgCyan(service.name)} service ${chalk.bold('started')}.`)
    );
    service.on('stopped', () =>
      console.log(`${chalk.bgCyan(service.name)} service ${chalk.bold('stopped')}.`)
    );
  }

  run() {
    this.event_dispatcher_service.start().catch(console.log);
    _.each(this.collect_services, service =>
      service.start().catch(console.log)
    );
    this.express.listen(5000, '0.0.0.0');
  }
}


module.exports = new App();
