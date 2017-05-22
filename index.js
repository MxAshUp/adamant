module.exports = {
  // Instances
  errors: require('./libs/errors'),
  utilities: require('./libs/utilities'),
  // Classes
  App: require('./libs/app'),
  Collector: require('./libs/collector'),
  EventDispatcher: require('./libs/event-dispatcher'),
  EventHandler: require('./libs/event-handler'),
  Event: require('./libs/event'),
  LoopService: require('./libs/loop-service'),
  MongooseUtilities: require('./libs/mongoose-utilities'),
  PluginLoader: require('./libs/plugin-loader'),
  Plugin: require('./libs/plugin')
};