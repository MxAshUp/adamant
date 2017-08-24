module.exports = {
  // Instances
  errors: require('./libs/errors'),
  // Classes
  App: require('./libs/app'),
  Collector: require('./libs/collector'),
  EventDispatcher: require('./libs/event-dispatcher'),
  EventHandler: require('./libs/event-handler'),
  Event: require('./libs/event'),
  LoopService: require('./libs/loop-service'),
  PluginLoader: require('./libs/plugin-loader'),
  Plugin: require('./libs/plugin'),
};
