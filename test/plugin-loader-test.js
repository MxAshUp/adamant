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
    '../plugin_a': {
      name: 'Plugin A',
      collectors: [],
      models: [],
      event_handlers: [],
      on_load: sinon.spy(),
      on_unload: sinon.spy(),
      load_models: sinon.spy()
    },
    '../plugin_b': {
      name: 'Plugin B',
      collectors: [],
      models: [],
      event_handlers: [],
      on_load: sinon.spy(),
      on_unload: sinon.spy(),
      load_models: sinon.spy()
    },
    '../plugin_c': 'BAD_PLUGIN'
  };

  let plugin_a, plugin_b;

  describe('Load plugin', function() {

    // default behavior
    require_stub = sinon.stub().throws();

    // return plugin args for each mock plugin
    for(var plugin_path in mock_plugins) {
      require_stub.withArgs(plugin_path).returns(mock_plugins[plugin_path]);
    }

    // Rewire require()
    let revert = PluginLoader.__set__("require", require_stub);

    // Reset rewired require
    after(revert);

    it('Should load plugin_a mock plugin', () => {
      const config = Math.random();
      plugin_a = pl.load_plugin('plugin_a',config);
      expect(pl.plugins.length).to.equal(1);
      expect(plugin_a).to.be.instanceof(Plugin);
    });

    it('Should load plugin_b mock plugin and call on_load and load_models', () => {
      const config = Math.random();
      plugin_b = pl.load_plugin('plugin_b',config);
      expect(pl.plugins.length).to.equal(2);
      sinon.assert.calledWith(plugin_b.on_load, config);
      sinon.assert.callOrder(plugin_b.on_load, plugin_b.load_models);
    });

    it('Should throw error trying to load malformed plugin', () => {
      expect(() => pl.load_plugin('plugin_c')).to.throw(`Error loading plugin: plugin_c`);
    });

  });

  describe('Get plugin by name', () => {
    it('Should get plugin_b by name', () => {
      expect(pl.get_plugin_by_name('Plugin B')).to.deep.equal(plugin_b);
    });

    it('Should throw error if plugin not found', () => {
      expect(() => pl.get_plugin_by_name('NONEXISTING_PLUGIN')).to.throw(`Plugin not loaded: NONEXISTING_PLUGIN`);
    });

    it('Should throw error after plugin is disabled, unless exclude_disabled is false', () => {
      after(() => {plugin_a.enabled = true;});
      expect(pl.get_plugin_by_name('Plugin A')).to.deep.equal(plugin_a);
      plugin_a.enabled = false;
      expect(() => pl.get_plugin_by_name('Plugin A')).to.throw(`Plugin not loaded: Plugin A`);
      expect(() => pl.get_plugin_by_name('Plugin A', false)).to.not.throw();
    });

  });

  describe('Create collector from plugin', () => {
    it('Should call create_component on Plugin B with correct parameters', () => {
      const success_return = Math.random();
      plugin_b.create_component = sinon.stub().returns(success_return);
      const collector_config = {
        plugin_name: 'Plugin B',
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
        plugin_name: 'Plugin B',
        handler_name: Math.random(),
        config: Math.random(),
        version: Math.random()
      };
      let ret = pl.create_event_handler(handler_config);
      expect(ret).to.equal(success_return);
      sinon.assert.calledWith(plugin_b.create_component, 'event_handlers', handler_config.handler_name, handler_config.config, handler_config.version);
    });
  });

  it('Should never call console.log', () => {
    sinon.assert.neverCalledWith(console_log_spy);
  });
});
