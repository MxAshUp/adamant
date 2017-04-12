var Plugin = require('./plugin'),
  _ = require('lodash');


class PluginLoader {

  /**
   * Creates a new PluginLoader object.
   * A PluginLoader loads plugin files into memory, and provide factory for creating instances of plugin components.
   *
   *
   * @memberOf PluginLoader
   */
  constructor() {
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
    if(typeof plugin_args !== 'object') throw `Error loading plugin: ${path}`;

    //Initialize plugin
    const plugin = new Plugin(plugin_args);

    //If all went well loading it...
    plugin.enabled = true;

    plugin.on_load(_config);
    plugin.load_models();

    //Add plugin to array
    this.plugins.push(plugin);

    return plugin;
  }

  /**
   * After plugins are loaded into memeory, a collector service can be initialized.
   *
   * @param {any} collector_config - Configuration used for initializing collector instance
   * @returns {Collector}
   */
  create_collector(collector_config) {
    return this.get_plugin_by_name(collector_config.plugin_name)
      .create_component('collectors', collector_config.collector_name, collector_config.config, collector_config.version);
  }

  /**
   * Creates an event handler instance. First looks up plugin, then event handler class by name
   *
   * @param {object} handler_config
   * @returns {EventHandler}
   *
   * @memberOf PluginLoader
   */
  create_event_handler(handler_config) {
    return this.get_plugin_by_name(handler_config.plugin_name)
      .create_component('event_handlers', handler_config.handler_name, handler_config.config, handler_config.version);
  }

  get_plugin_by_name(plugin_name, exclude_disabled = true) {
    // Find plugin
    const find = {name: plugin_name};
    if(exclude_disabled) {
      find.enabled = true;
    }
    const plugin = _.find(this.plugins, find);
    if(!plugin) throw new Error(`Plugin not loaded: ${plugin_name}`);
    return plugin;
  }

}

module.exports = PluginLoader;
