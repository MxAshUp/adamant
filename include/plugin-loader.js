var fs = require('fs'),
    path = require('path'),
    Plugin = require('./plugin'),
	semver = require('semver'),
	_ = require('lodash'),
	DataCollector = require('./data-collector'),
    LoopService = require('./loop-service');

var PluginLoader = function(_config) {

	//Scope it
	var self = this;

	//We'll export these
	self.plugins = [];

	//Get directors of plugins
	var plugin_dirs = getPluginDirectories();

	//Loop through them
	for (var i in plugin_dirs) {

		//Load in the plugin
		var plugin_args = require('../' + plugin_dirs[i].path);

		//Could not load it, or it's not a valid plugin_args
		if(typeof plugin_args !== 'function') {
			continue;
		}

		//Initialize plugin_args
		plugin_args = plugin_args(_config);

		//Initialize plugin
		var plugin = new Plugin(plugin_args);

		//If plugin wasn't given a name, name it after the directory
		plugin.name = plugin.name ? plugin.name : plugin_dirs[i].name;

		//If all went well loading it...
		plugin.enabled = true;

		//Add plugin to registered array
		self.plugins.push(plugin);
	}

	self.initializeCollectorService = function(collector_config) {
		
		//Find plugin
		var plugin = _.find(self.plugins, {name: collector_config.plugin_name, enabled: true});
		if(!plugin) throw new Error(sprintf("Plugin not loaded: %s", collector_config.plugin_name));
		
		//Find data collector in plugin
		var data_collector = _.find(plugin.data_collectors, {model_name: collector_config.collection_name})
		if(!data_collector) throw new Error(sprintf("Collection not found: %s", collector_config.collection_name));
		
		//Check version
		if(data_collector.version && data_collector.version !== collector_config.version) {
			//TODO: Do better version check, and also maybe run update on current config
			throw new Error("Collection version not the same.");
		}

		//Time to create data colector instance
		try {
			var data_collector = new DataCollector(data_collector, collector_config.config);
		} catch (r) {
			throw new Error(sprintf("Error creating data collector instance: $s", r));
		}

		return new LoopService(data_collector.run, data_collector.stop);
	}
}

var getPluginDirectories = function() {
	srcpath = 'plugins';
	return fs.readdirSync(srcpath).filter(function(file) {
		return fs.statSync(path.join(srcpath, file)).isDirectory();
	}).map(function(path) {
		return {
			name: path,
			path: srcpath + '/' + path
		};
	});
};

module.exports = PluginLoader;


