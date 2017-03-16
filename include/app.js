const PluginLoader = require('./plugin-loader'),
	_config = require('./config.js'),
	mongoose_util = require('./mongoose-utilities'),
	_ = require('lodash'),
  LoopService = require('./loop-service'),
  EventDispatcher = require('./event-dispatcher'),
  EventHandler = require('./event-handler'),
  Event = require('./event'),
	chalk = require('chalk');

class App {

  constructor() {
    this.plugin_loader = new PluginLoader();
    this.collect_services = [];
    this.event_dispatcher = new EventDispatcher();
    this.event_dispatcher_service = new LoopService(this.event_dispatcher.run.bind(this.event_dispatcher));
    this.event_dispatcher_service.name = 'Event dispatcher';
    this.event_dispatcher.on('error', console.log);
    this.bind_model_events();
    this.bind_service_events(this.event_dispatcher_service);
  }

  init() {
    return mongoose_util.connect(_config.mongodb.uri);
  }

  /**
   * Loads plugins
   *
   *
   * @memberOf App
   */
  load_plugins(plugin_dirs) {
    _.forEach(plugin_dirs, (plugin_path) => {
      this.plugin_loader.load_plugin(plugin_path.path, _config);
    });
  }

  load_plugin_event_handlers() {
    // Look at each plugin
    _.each(this.plugin_loader.plugins, (plugin) => {
      // Look at each event handler
      _.each(plugin.event_handlers, (event_handler) => {
        let handler = new EventHandler(event_handler);
        this.event_dispatcher.load_event_handler(handler);
      });
    });
  }

  /**
   * Loads a collector from config, creates a service
   *
   *
   * @memberOf App
   */
  load_collector(config) {
    const collector = this.plugin_loader.create_collector_instance(config);
    const service = new LoopService(collector.run.bind(collector), collector.stop.bind(collector));
    service.name = `${collector.model_name} collector`;
    this.bind_service_events(service);
    this.collect_services.push(service);
  }

  /**
   * Binds model data events in plugin to event dispatcher queue
   *
   *
   * @memberOf App
   */
  bind_model_events() {
    this.plugin_loader.on('create', (model, data) => {
      this.event_dispatcher.enqueue_event(new Event(`${model}.create`, data));
    });
    this.plugin_loader.on('update', (model, data) => {
      this.event_dispatcher.enqueue_event(new Event(`${model}.update`, data));
    });
    this.plugin_loader.on('remove', (model, data) => {
      this.event_dispatcher.enqueue_event(new Event(`${model}.remove`, data));
    });
    this.plugin_loader.on('error', (e) => {
      console.log(`${chalk.red('error')}: ${chalk.grey(e.stack)}`);
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
    service.on('error',		(e) => console.log(`${chalk.bgCyan(service.name)} service ${chalk.red('error')}: ${chalk.grey(e.stack)}`));
    service.on('started',	( ) => console.log(`${chalk.bgCyan(service.name)} service ${chalk.bold('started')}.`));
    service.on('stopped',	( ) => console.log(`${chalk.bgCyan(service.name)} service ${chalk.bold('stopped')}.`));
  }

  run() {
    this.event_dispatcher_service.start().catch((e) => console.log);
    _.each(this.collect_services, (service) => service.start().catch(console.log));
  }
}

module.exports = App;