const Plugin = require('./plugin');
const _ = require('lodash');
const semver = require('semver');
const path = require('path');
const core_module_info = require(`${__dirname}/../package.json`);

module.exports = class PluginLoader {
  /**
   * Creates a new PluginLoader object.
   * A PluginLoader registers plugin information and provides an interface for accessing plugins.
   *
   * @memberof PluginLoader
   */
  constructor() {
    this.plugins = [];
  }

  /**
   * Loads a plugin into memeory.
   *
   * @param {String} module_name - Module name or path to plugin to be loaded.
   * @param {Object} config - Configuration to pass to plugin on_load.
   * @returns {Plugin} - The plugin instance loaded.
   * @memberof PluginLoader
   */
  load_plugin(module_name, config) {

    let require_path = module_name;

    // Special path for adamant components
    if(module_name == 'adamant' || module_name == 'local-adamant') {
      require_path = `./components`;
    }

    // Load in the plugin
    let plugin_args = require(require_path);

    // Could not load it, or it's not a valid plugin_args
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

    // Check if core satisfies plugin core dependency
    this.check_core_dependency_requirement(plugin_info);

    // Initialize plugin
    const plugin = new Plugin(plugin_args);

    // If all went well loading it...
    plugin.enabled = true;

    plugin.on_load(config);

    // Add plugin to array
    this.plugins.push(plugin);

    return plugin;
  }

  /**
   * Throws error if plugin_info core dependency requirement is not met
   *
   * @param {Object} plugin_info - The plugin info provided by package.json
   * @memberof PluginLoader
   */
  check_core_dependency_requirement(plugin_info) {
    if(plugin_info.dependencies) {
      const core_version_dependency = plugin_info.dependencies['local-adamant'] || plugin_info.dependencies['adamant'];
      if(core_version_dependency && !semver.satisfies(core_module_info.version, core_version_dependency)) {
        throw new Error(`Core version requirements (${core_version_dependency}) not met. Using core version ${core_module_info.version}.`);
      }
    }
  }

  /**
   * Looks up plugin by plugin name. Throws error if not found.
   *
   * @param {String} plugin_name - Name of plugin, same name in package.json file
   * @param {boolean} [exclude_disabled=true] - If true, disabled plugins will not be searched through
   * @returns {Plugin} - The plugin found
   * @memberof PluginLoader
   */
  get_plugin_by_name(plugin_name, exclude_disabled = true) {
    // Find plugin

    // Set plugin name if core
    if(plugin_name == 'adamant') plugin_name = core_module_info.name;

    const find = { name: plugin_name };
    if (exclude_disabled) {
      find.enabled = true;
    }
    const plugin = _.find(this.plugins, find);
    if (!plugin) throw new Error(`Plugin not loaded: ${plugin_name}`);
    return plugin;
  }

  /**
   * Loops through plugins and calls loads_models
   *
   * @param {mongoose} mongoose - The mongoose instance to use
   * @memberof PluginLoader
   */
  load_plugin_models(mongoose) {
    // Look at each plugin
    return _.flatMap(this.plugins, plugin => plugin.load_models(mongoose));
  }

  /**
   * Loops through plugins and intializes express routes
   *
   * @param {express} express - The Express server to use
   * @memberof PluginLoader
   */
  load_plugin_routes(express) {
    // Look at each plugin
    return _.flatMap(this.plugins, plugin => plugin.load_routes(express));
  }

  /**
   * Loops through plugins and intializes sockets io events
   *
   * @param {socket} socket - the socket.io object to use
   * @memberof PluginLoader
   */
  load_plugin_sockets(socket) {
    // Look at each plugin
    return _.flatMap(this.plugins, plugin => plugin.map_events(socket));
  }

  /**
   * Returns parsed package.json contents
   *
   * @static
   * @param {String} module_name - the name or path of the module
   * @returns {Object} - Contents of package file.
   * @memberof PluginLoader
   */
  static get_module_info(module_name) {

    // Get adamant package.json
    if(module_name == 'adamant' || module_name == 'local-adamant') {
      return core_module_info;
    }

    let module_path = require.resolve(module_name);
    module_path = path.dirname(module_path);

    let pkg_path = path.join(module_path, 'package.json');

    let pkg_contents = require(pkg_path);

    return pkg_contents;
  }
}