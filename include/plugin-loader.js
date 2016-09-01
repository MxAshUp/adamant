var fs = require('fs'),
    path = require('path'),
    Plugin = require('./plugin');

module.exports = {
	loadPlugins: function(_config) {

		//We'll export these
		var plugins = [];

		//Get directors of plugins
		var plugin_dirs = this.getPluginDirectories();

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
			plugins.push(plugin);
		}

		return plugins;
	},
	getPluginDirectories: function() {
		srcpath = 'plugins';
		return fs.readdirSync(srcpath).filter(function(file) {
			return fs.statSync(path.join(srcpath, file)).isDirectory();
		}).map(function(path) {
			return {
				name: path,
				path: srcpath + '/' + path
			};
		});
	}
};


