const fs = require('fs'),
  path = require('path'),
  Plugin = require('./plugin'),
  semver = require('semver'),
  _ = require('lodash'),
  Collector = require('./collector'),
  LoopService = require('./loop-service'),
  mongoose = require('./mongoose-utilities').mongoose,
  EventEmitter = require('events');


class PluginLoader extends EventEmitter {

  /**
   * Creates a new PluginLoader object.
   * A PluginLoader loads plugin files into memeory and provides a way to bind with plugin events.
   *
   *
   * @memberOf PluginLoader
   */
  constructor() {
    super();
    this.plugins = [];
  }


  /**
   * Loads a plugin into memeory.
   *
   * @param {String} path - Path to plugin directory to be loaded
   * @param {Object} config - Configuration to pass to plugin on load
   *
   */
  load_plugin(path, _config) {
    //Load in the plugin
    let plugin_args = require(`../${path}`);

    //Could not load it, or it's not a valid plugin_args
    if(typeof plugin_args !== 'object') {
      throw `Error loading plugin: ${path}`;
    }

    //Initialize plugin_args
    //plugin_args = plugin_args(_config);

    //Initialize plugin
    const plugin = new Plugin(plugin_args);

    //If plugin wasn't given a name, name it after the directory
    plugin.name = plugin.name ? plugin.name : plugin_dirs[i].name;

    //If all went well loading it...
    plugin.enabled = true;

    plugin.on_load();

    //Add plugin to registered array
    this.plugins.push(plugin);
  }

  /**
   * After plugins are loaded into memeory, a collector service can be initialized.
   *
   * @param {any} collector_config - Configuration used for initializing collector instance
   * @returns {LoopService} to interface with collector (start, stopm etc...)
   */
  create_collector_instance(collector_config) {

    let collector, collector_class;

    //Find plugin
    const plugin = _.find(this.plugins, {name: collector_config.plugin_name, enabled: true});
    if(!plugin) throw new Error(`Plugin not loaded: ${collector_config.plugin_name}`);

    //Find data collector in plugin
    collector_class = _.find(plugin.collectors, {name: collector_config.collector_name});
    if(!collector_class) throw new Error(`Collector not found: ${collector_config.collector_name}`);

    //Create data colector instance
    try {
      collector = new collector_class(collector_config.config);
    } catch (e) {
      throw new Error(`Error creating data collector instance: ${e}`);
    }

    //Check version
    if(collector.version && collector.version !== collector_config.version) {
      /**
       * @todo Do better version check, and also maybe run update on current config
       */
      throw new Error('Collection version not the same.');
    }

    //Add event handling
    _.each(['create','update','remove'], (event) => {
      collector.on(event, (data) => {
        try {
          this.emit(event, collector.model_name, data);
        } catch (e) {
          this.emit('error', e);
        }
      });
    });

    return collector;
  }
}

module.exports = PluginLoader;
