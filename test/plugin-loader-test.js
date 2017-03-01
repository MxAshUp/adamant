const expect = require('chai').expect;
const rewire = require('rewire');
const PluginLoader = rewire('../include/plugin-loader');
const Plugin = require('../include/plugin');
const LoopService = require('../include/loop-service');
const _config = require('../include/config.js');
const utilities = rewire('../include/utilities');
const _ = require('lodash');


describe('Plugin Loader', function() {

  describe('Load Plugins', function() {

    const plugin_loader = new PluginLoader();
    const plugin_dirs = utilities.getPluginsDirectories();
    const plugin_dir_count = plugin_dirs.length;

    // load plugins
    _.forEach( plugin_dirs, (plugin_path) => { plugin_loader.load_plugin(plugin_path.path, _config); } );

    it('Should load correct number of plugins', function () {
      expect(plugin_loader.plugins).to.have.lengthOf(plugin_dir_count);
    });

    it('Each plugin should be an instance of Plugin', function () {
      expect(plugin_loader.plugins).to.satisfy(function(plugins) {
        return plugins.every(function(plugin) {
          return plugin instanceof Plugin;
        });
      });
    });

    it('Each plugin should be enabled', function () {
      expect(plugin_loader.plugins).to.satisfy(function(plugins) {
        return plugins.every(function(plugin) {
          return plugin.enabled;
        });
      });
    });

    it('Each plugin should have a name', function () {
      expect(plugin_loader.plugins).to.satisfy(function(plugins) {
        return plugins.every(function(plugin) {
          return Object(plugin).hasOwnProperty('name');
        });
      });
    });

  });

});

describe('Initialize Collector Service', function() {

  const plugin_loader = new PluginLoader();
  const plugin_dirs = utilities.getPluginsDirectories();

  // load plugins
  _.forEach( plugin_dirs, (plugin_path) => { plugin_loader.load_plugin(plugin_path.path, _config); } );

  const collector_configs = [
  	// {
  	// 	plugin_name: 'Toggl',
  	// 	model_name: 'toggl_timeEntry',
  	// 	version: '1.0',
  	// 	config: {
  	// 		apiToken:'771a871d9670b874655a25e20391640f'
  	// 	}
  	// },
  	{
  		plugin_name: 'TimeClock',
  		model_name: 'timeclock_timeEntry',
  		version: '1.0',
  		config: {
  			days_back_to_sync: 1,
  			url:'http://192.168.1.29/',
  			user:'admin',
  			password:'FVnZaHD8HyCe'
  		}
  	},
  ];
  const collector_config = collector_configs[0];

  const service = plugin_loader.initialize_collector_service(collector_config);
  // service.start();

  it('Should return instance of Loop Service', function () {
    expect(service).to.be.instanceOf(LoopService);
  });

});
