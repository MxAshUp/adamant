const rewire = require('rewire'),
  sinon = require('sinon'),
  chai = require('chai'),
  expect = chai.expect,
  assert = chai.assert,
  // components to test
  Plugin = require('../libs/plugin'),
  PluginLoader = rewire('../libs/plugin-loader');


console_log_spy = sinon.spy();
PluginLoader.__set__("console", {log: console_log_spy});

describe('Plugin Loader', function() {

  let pl;

  it('Should create instance', () => {
    pl = new PluginLoader();
  });

  const mock_plugins = {
    'plugin_a': {
      collectors: [],
      models: [],
      event_handlers: [],
      on_load: sinon.spy(),
      on_unload: sinon.spy(),
      load_models: sinon.spy()
    },
    'plugin_b': {
      collectors: [],
      models: [],
      event_handlers: [],
      on_load: sinon.spy(),
      on_unload: sinon.spy(),
      load_models: sinon.spy()
    },
    'plugin_c': 'BAD_PLUGIN'
  };

  const mock_plugin_a_pkg = {
    "name": "plugin_a",
    "version": "0.1.5",
    "description": "Mock plugin A for testing",
    "main": "index.js",
    "author": "Pro Q",
    "license": "ISC"
  };

  const mock_plugin_b_pkg = {
    "name": "plugin_b",
    "version": "0.1.2",
    "main": "index.js",
    "license": "ISC"
  };

  let plugin_a, plugin_b;

  describe('Load plugin', function() {

    // default behavior
    let require_stub = sinon.stub().throws();
    let get_module_info_stub = sinon.stub().throws();

    // return plugin args for each mock plugin
    for(var plugin_path in mock_plugins) {
      require_stub.withArgs(plugin_path).returns(mock_plugins[plugin_path]);
    }

    // Rewire require()
    let revert_1 = PluginLoader.__set__("require", require_stub);
    sinon.stub(PluginLoader, 'get_module_info');

    PluginLoader.get_module_info.withArgs('plugin_a').returns(mock_plugin_a_pkg);
    PluginLoader.get_module_info.withArgs('plugin_b').returns(mock_plugin_b_pkg);

    // Reset rewired require
    after(revert_1);
    after(PluginLoader.get_module_info.restore);

    it('Should load plugin_a mock plugin', () => {
      const config = Math.random();
      plugin_a = pl.load_plugin('plugin_a',config);
      expect(pl.plugins.length).to.equal(1);
      expect(plugin_a).to.be.instanceof(Plugin);
      expect(plugin_a.version).to.equal(mock_plugin_a_pkg.version);
      expect(plugin_a.description).to.equal(mock_plugin_a_pkg.description);
      expect(plugin_a.author).to.equal(mock_plugin_a_pkg.author);
      expect(plugin_a.license).to.equal(mock_plugin_a_pkg.license);
    });

    it('Should load plugin_b mock plugin and call on_load and load_models', () => {
      const config = Math.random();
      plugin_b = pl.load_plugin('plugin_b',config);
      expect(pl.plugins.length).to.equal(2);
      sinon.assert.calledWith(plugin_b.on_load, config);
      sinon.assert.callOrder(plugin_b.on_load, plugin_b.load_models);
    });

    it('Should throw error trying to load malformed plugin', () => {
      expect(() => pl.load_plugin('plugin_c')).to.throw(`Error loading plugin: plugin_c - Invalid index.js contents.`);
    });

  });

  describe('Get plugin by name', () => {
    it('Should get plugin_b by name', () => {
      expect(pl.get_plugin_by_name('plugin_b')).to.deep.equal(plugin_b);
    });

    it('Should throw error if plugin not found', () => {
      expect(() => pl.get_plugin_by_name('NONEXISTING_PLUGIN')).to.throw(`Plugin not loaded: NONEXISTING_PLUGIN`);
    });

    it('Should throw error after plugin is disabled, unless exclude_disabled is false', () => {
      after(() => {plugin_a.enabled = true;});
      expect(pl.get_plugin_by_name('plugin_a')).to.deep.equal(plugin_a);
      plugin_a.enabled = false;
      expect(() => pl.get_plugin_by_name('plugin_a')).to.throw(`Plugin not loaded: plugin_a`);
      expect(() => pl.get_plugin_by_name('plugin_a', false)).to.not.throw();
    });

  });

  describe('Create collector from plugin', () => {
    it('Should call create_component on Plugin B with correct parameters', () => {
      const success_return = Math.random();
      plugin_b.create_component = sinon.stub().returns(success_return);
      const collector_config = {
        plugin_name: 'plugin_b',
        collector_name: Math.random(),
        config: Math.random(),
        version: Math.random()
      };
      let ret = pl.create_collector(collector_config);
      expect(ret).to.equal(success_return);
      sinon.assert.calledWith(plugin_b.create_component, 'collectors', collector_config.collector_name, collector_config.config, collector_config.version);
    });
  });

  describe('Create event_handler from plugin', () => {
    it('Should call create_component on Plugin B with correct parameters', () => {
      const success_return = Math.random();
      plugin_b.create_component = sinon.stub().returns(success_return);
      const handler_config = {
        plugin_name: 'plugin_b',
        handler_name: Math.random(),
        config: Math.random(),
        version: Math.random()
      };
      let ret = pl.create_event_handler(handler_config);
      expect(ret).to.equal(success_return);
      sinon.assert.calledWith(plugin_b.create_component, 'event_handlers', handler_config.handler_name, handler_config.config, handler_config.version);
    });
  });

  describe('get_module_info', () => {

    before(() => {
      const mock_path_a = `/some/random/${Math.random()}/path_a/`;

      // Rewire require()
      let require_stub = sinon.stub().throws();
      let resolve_stub = sinon.stub().throws();
      require_stub.resolve = resolve_stub;
      require_stub.withArgs(`${mock_path_a}package.json`).returns(mock_plugin_a_pkg);
      resolve_stub.withArgs('plugin_a').returns(`${mock_path_a}index.js`);

      revert_1 = PluginLoader.__set__("require", require_stub);

    });

    it('Should load contents from mock module a', () => {
      let module_info = PluginLoader.get_module_info('plugin_a');
      expect(module_info).to.deep.equal(mock_plugin_a_pkg);
    });

  });

  it('Should never call console.log', () => {
    sinon.assert.neverCalledWith(console_log_spy);
  });
});