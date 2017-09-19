var Plugin = require('./plugin'),
  _ = require('lodash'),
  path = require('path');

const core_module_info = require(`${__dirname}/../package.json`);

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
  load_plugin(module_name, config) {

    let require_path = module_name;

    // Special path for mp-core components
    if(module_name == 'mp-core' || module_name == 'local-mp-core') {
      require_path = `./core-components`;
    }

    //Load in the plugin
    let plugin_args = require(require_path);

    //Could not load it, or it's not a valid plugin_args
    if (typeof plugin_args !== 'object')
      throw new Error(
        `Error loading plugin: ${module_name} - Invalid index.js contents.`
      );

    // Get some module info
    const plugin_info = PluginLoader.get_module_info(module_name);

    // Plugin name is now the same as module
    plugin_args.name = plugin_info.name;
    plugin_args.version = plugin_info.version;

    // These aren't required
    plugin_args.description = plugin_info.description
      ? plugin_info.description
      : '';
    plugin_args.author = plugin_info.author
      ? plugin_info.author
      : '';
    plugin_args.license = plugin_info.license
      ? plugin_info.license
      : '';

    //Initialize plugin
    const plugin = new Plugin(plugin_args);

    //If all went well loading it...
    plugin.enabled = true;

    plugin.on_load(config);

    //Add plugin to array
    this.plugins.push(plugin);

    return plugin;
  }

  /**
   * Looks up plugin by plugin name, returns plugin instance
   *
   * @param {String} plugin_name - Name of plugin, same name in package.json file
   * @param {boolean} [exclude_disabled=true] - If true, disabled plugins will not be searched through
   * @returns
   * @memberof PluginLoader
   */
  get_plugin_by_name(plugin_name, exclude_disabled = true) {
    // Find plugin

    // Set plugin name if core
    if(plugin_name == 'mp-core') plugin_name = core_module_info.name;

    const find = { name: plugin_name };
    if (exclude_disabled) {
      find.enabled = true;
    }
    const plugin = _.find(this.plugins, find);
    if (!plugin) throw new Error(`Plugin not loaded: ${plugin_name}`);
    return plugin;
  }

  /**
   * Loops through plugins and loads models
   *
   * @memberof PluginLoader
   */
  load_plugin_models(mongoose) {
    // Look at each plugin
    _.each(this.plugins, plugin => plugin.load_models(mongoose));
  }

  /**
   * Loops through plugins and intializes express routes
   *
   * @memberof PluginLoader
   */
  load_plugin_routes(express) {
    // Look at each plugin
    _.each(this.plugins, plugin => plugin.load_routes(express));
  }

  /**
   * Loops through plugins and intializes sockets io events
   *
   * @memberof PluginLoader
   */
  load_plugin_sockets(socket) {
    // Look at each plugin
    _.each(this.plugins, plugin => plugin.map_events(socket));
  }

  /**
   * Returns package.json contents for local module
   *
   * @static
   * @param {String} module_name
   * @returns {Object} - Contents of package file
   *
   * @memberOf PluginLoader
   */
  static get_module_info(module_name) {

    // Get mp-core package.json
    if(module_name == 'mp-core' || module_name == 'local-mp-core') {
      return core_module_info;
    }

    let module_path = require.resolve(module_name);
    module_path = path.dirname(module_path);

    let pkg_path = path.join(module_path, 'package.json');

    let pkg_contents = require(pkg_path);

    return pkg_contents;
  }
}

module.exports = PluginLoader;
