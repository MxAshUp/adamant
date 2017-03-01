const expect = require('chai').expect;
const rewire = require('rewire');
const PluginLoader = rewire('../include/plugin-loader');
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
