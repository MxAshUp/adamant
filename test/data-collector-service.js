var plugin_loader = require('../include/plugin-loader');

var _config = {};//What goes here?

var plugins = plugin_loader.loadPlugins(_config);

console.log(plugins);
console.log(plugins['TimeClock'].data_collectors);