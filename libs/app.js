const PluginLoader = require('./plugin-loader'),
  mongoose_util = require('./mongoose-utilities'),
  _ = require('lodash'),
  LoopService = require('./loop-service'),
  EventDispatcher = require('./event-dispatcher'),
  EventHandler = require('./event-handler'),
  Event = require('./event'),
  chalk = require('chalk'),
  express = require('express')(),
  server = require('http').createServer(express),
  io = require('socket.io')(server);

/**
 * A singleton class
 *
 * @class App
 */
class App {
  constructor(config) {
    this._config = config;
    this.plugin_loader = new PluginLoader();
    this.collect_services = [];
    this.event_dispatcher = new EventDispatcher();
    this.event_dispatcher_service = new LoopService(
      this.event_dispatcher.run.bind(this.event_dispatcher)
    );
    this.event_dispatcher_service.name = 'Event dispatcher';
    this.event_dispatcher.on('error', console.log);
    this.bind_service_events(this.event_dispatcher_service);
    this.express = express;
    this.server = server;
    this.io = io;
    this.load_routes(this.express);
    this.bind_socketio_events(this.io);
  }

  init() {
    return mongoose_util.mongoose.connect(this._config.mongodb.uri);
  }

  load_routes(express) {
    express.get('/', (req, res) => {
      res.send('Metric platform!');
    });
    express.get('/login', (req, res) => {
      res.send('Login!');
    });
  }

  bind_socketio_events(io) {
    io.on('connection', socket => {
      socket.on('event', data => {
        console.log('Socket.io client event!', data);
      });
      socket.on('disconnect', () => {
        console.log('Socket.io client disconnect!');
      });
    });
  }

  /**
   * Loads plugins
   *
   *
   * @memberOf App
   */
  load_plugins(plugin_dirs) {
    _.forEach(plugin_dirs, plugin_path => {
      this.plugin_loader.load_plugin(plugin_path, this._config);
    });
  }

  load_plugin_routes() {
    // Look at each plugin
    _.each(this.plugin_loader.plugins, plugin => {
      // Load plugin routes (if any)
      plugin.load_routes(this.express);
    });
  }

  map_plugin_events() {
    // Look at each plugin
    _.each(this.plugin_loader.plugins, plugin => {
      // Load plugin routes (if any)
      plugin.map_events(this);
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
    collector.setMongoose(mongoose_util.mongoose);
    const service = new LoopService(collector.run.bind(collector));

    if (config.service_retry_max_attempts)
      service.retry_max_attempts = config.service_retry_max_attempts;

    if (config.service_retry_time_between)
      service.retry_time_between = config.service_retry_time_between;

    if (config.run_min_time_between)
      service.run_min_time_between = config.run_min_time_between;

    service.name = `${collector.model_name} collector`;
    this.bind_service_events(service);
    this.bind_model_events(collector);
    service.on('complete', () =>
      this.handle_service_event(`complete.${collector.model_name}`)
    );
    this.collect_services.push(service);
  }

  handle_service_event(event_name) {
    this.event_dispatcher.emit(event_name);
    // in the future: for each service loop -> emit event
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
      console.log(
        `${chalk.bgCyan(service.name)} service ${chalk.red(
          'error'
        )}: ${chalk.grey(e.stack)}`
      );
      if (e.culprit) {
        console.log(`${chalk.red('error details')}: ${chalk.grey(e.culprit)}`);
      }
    });
    service.on('start', () =>
      console.log(
        `${chalk.bgCyan(service.name)} service ${chalk.bold('started')}.`
      )
    );
    service.on('stop', () =>
      console.log(
        `${chalk.bgCyan(service.name)} service ${chalk.bold('stopped')}.`
      )
    );
  }

  run() {
    // graceful shutdown
    process.on('SIGTERM', () => {
      // halt web server
      this.server.close();

      // stop collector services
      _.each(this.collect_services, service =>
        service.stop().catch(console.log)
      );

      // stop event dispatcher service
      this.event_dispatcher_service.stop().catch(console.log);

      // terminate app process
      process.exit(0);
    });

    this.event_dispatcher_service.start().catch(console.log);
    _.each(this.collect_services, service =>
      service.start().catch(console.log)
    );
    this.server.listen(this._config.web.port);
  }
}

module.exports = App;
