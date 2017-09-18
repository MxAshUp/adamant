const rewire = require('rewire'),
  sinon = require('sinon'),
  chai = require('chai'),
  expect = chai.expect,
  assert = chai.assert,
  // components to test
  Plugin = require('../libs/plugin'),
  PluginLoader = rewire('../libs/plugin-loader');

describe('Plugin Loader', function() {
  let pl;

  it('Should create instance', () => {
    pl = new PluginLoader();
  });

  const mock_plugins = {
    plugin_a: {
      collectors: [],
      models: [],
      event_handlers: [],
      on_load: sinon.spy(),
      on_unload: sinon.spy(),
      load_models: sinon.spy(),
    },
    plugin_b: {
      collectors: [],
      models: [],
      event_handlers: [],
      on_load: sinon.spy(),
      on_unload: sinon.spy(),
      load_models: sinon.spy(),
    },
    plugin_c: 'BAD_PLUGIN',
  };

  const mock_plugin_a_pkg = {
    name: 'plugin_a',
    version: '0.1.5',
    description: 'Mock plugin A for testing',
    main: 'index.js',
    author: 'Pro Q',
    license: 'ISC',
  };

  const mock_plugin_b_pkg = {
    name: 'plugin_b',
    version: '0.1.2',
    main: 'index.js',
    license: 'ISC',
  };

  let plugin_a, plugin_b;

  describe('Load plugin', () => {
    // default behavior
    let require_stub = sinon.stub().throws();
    let get_module_info_stub = sinon.stub().throws();

    // return plugin args for each mock plugin
    for (var plugin_path in mock_plugins) {
      require_stub.withArgs(plugin_path).returns(mock_plugins[plugin_path]);
    }

    // Rewire require()
    const revert_1 = PluginLoader.__set__('require', require_stub);
    sinon.stub(PluginLoader, 'get_module_info');

    PluginLoader.get_module_info
      .withArgs('plugin_a')
      .returns(mock_plugin_a_pkg);
    PluginLoader.get_module_info
      .withArgs('plugin_b')
      .returns(mock_plugin_b_pkg);

    // Reset rewired require
    after(revert_1);
    after(PluginLoader.get_module_info.restore);

    it('Should load plugin_a mock plugin', () => {
      const config = Math.random();
      plugin_a = pl.load_plugin('plugin_a', config);
      expect(pl.plugins.length).to.equal(1);
      expect(plugin_a).to.be.instanceof(Plugin);
      expect(plugin_a.version).to.equal(mock_plugin_a_pkg.version);
      expect(plugin_a.description).to.equal(mock_plugin_a_pkg.description);
      expect(plugin_a.author).to.equal(mock_plugin_a_pkg.author);
      expect(plugin_a.license).to.equal(mock_plugin_a_pkg.license);
    });

    it('Should load plugin_b mock plugin and call on_load', () => {
      const config = Math.random();
      plugin_b = pl.load_plugin('plugin_b', config);
      expect(pl.plugins.length).to.equal(2);
      sinon.assert.calledWith(plugin_b.on_load, config);
    });

    it('Should throw error trying to load malformed plugin', () => {
      expect(() => pl.load_plugin('plugin_c')).to.throw(
        `Error loading plugin: plugin_c - Invalid index.js contents.`
      );
    });

    describe('load_plugin_*', () => {

      var plugin_loader;

      const mock_plugins = {
        plugin_2_a: {
          load_models: sinon.spy(),
          load_routes: sinon.spy(),
          map_events: sinon.spy(),
        },
        plugin_2_b: {
          load_models: sinon.spy(),
          load_routes: sinon.spy(),
          map_events: sinon.spy(),
        },
        plugin_2_c: {
          load_models: sinon.spy(),
          load_routes: sinon.spy(),
          map_events: sinon.spy(),
        },
      };

      const mock_plugin_info = {
        plugin_2_a: {
          name: 'plugin_2_a',
        },
        plugin_2_b: {
          name: 'plugin_2_b',
        },
        plugin_2_c: {
          name: 'plugin_2_c',
        },
      };

      // return plugin args for each mock plugin
      for (var plugin_path in mock_plugins) {
        require_stub.withArgs(plugin_path).returns(mock_plugins[plugin_path]);
      }

      // return plugin args for each mock plugin
      for (var plugin_name in mock_plugin_info) {
        PluginLoader.get_module_info.withArgs(plugin_name).returns(mock_plugin_info[plugin_name]);
      }


      beforeEach(() => {
        plugin_loader = new PluginLoader();
        plugin_loader.load_plugin('plugin_2_a');
        plugin_loader.load_plugin('plugin_2_b');
        plugin_loader.load_plugin('plugin_2_c');
      });

      describe('load_plugin_models', () => {

        const mock_mongoose = Math.random();

        beforeEach(() => {
          plugin_loader.load_plugin_models(mock_mongoose);
        });

        it('Should call load_models on all plugins with mock mongoose', () => {
          sinon.assert.calledWith(mock_plugins.plugin_2_a.load_models, mock_mongoose);
          sinon.assert.calledWith(mock_plugins.plugin_2_b.load_models, mock_mongoose);
          sinon.assert.calledWith(mock_plugins.plugin_2_c.load_models, mock_mongoose);
        });
      });

      describe('load_plugin_routes', () => {
        const mock_express = Math.random();

        beforeEach(() => {
          plugin_loader.load_plugin_routes(mock_express);
        });

        it('Should call load_routes on all plugins with mock express', () => {
          sinon.assert.calledWith(mock_plugins.plugin_2_a.load_routes, mock_express);
          sinon.assert.calledWith(mock_plugins.plugin_2_b.load_routes, mock_express);
          sinon.assert.calledWith(mock_plugins.plugin_2_c.load_routes, mock_express);
        });
      });

      describe('load_plugin_sockets', () => {
        const mock_socket = Math.random();

        beforeEach(() => {
          plugin_loader.load_plugin_sockets(mock_socket);
        });

        it('Should call map_events on all plugins with mock socket', () => {
          sinon.assert.calledWith(mock_plugins.plugin_2_a.map_events, mock_socket);
          sinon.assert.calledWith(mock_plugins.plugin_2_b.map_events, mock_socket);
          sinon.assert.calledWith(mock_plugins.plugin_2_c.map_events, mock_socket);
        });

      });
    });
  });

  describe('load core plugin components', () => {

    const core_module_info = require(`${__dirname}/../package.json`);

    it('Should load core as a plugin', () => {
      const pl = new PluginLoader();
      pl.load_plugin('mp-core');
      const plugin = pl.get_plugin_by_name(core_module_info.name);
      expect(plugin.name).to.equal(core_module_info.name);
      expect(plugin.version).to.equal(core_module_info.version);
      expect(plugin.description).to.equal(core_module_info.description);
      expect(plugin.author).to.equal(core_module_info.author);
      expect(plugin.license).to.equal(core_module_info.license);
    });

    it('Should return core package info for mp-core', () => {
      expect(PluginLoader.get_module_info('mp-core')).to.deep.equal(core_module_info);
    });

    it('Should return core package info for local-mp-core', () => {
      expect(PluginLoader.get_module_info('local-mp-core')).to.deep.equal(core_module_info);
    });
  });

  describe('Get plugin by name', () => {
    it('Should get plugin_b by name', () => {
      expect(pl.get_plugin_by_name('plugin_b')).to.deep.equal(plugin_b);
    });

    it('Should throw error if plugin not found', () => {
      expect(() => pl.get_plugin_by_name('NONEXISTING_PLUGIN')).to.throw(
        `Plugin not loaded: NONEXISTING_PLUGIN`
      );
    });

    it('Should throw error after plugin is disabled, unless exclude_disabled is false', () => {
      after(() => {
        plugin_a.enabled = true;
      });
      expect(pl.get_plugin_by_name('plugin_a')).to.deep.equal(plugin_a);
      plugin_a.enabled = false;
      expect(() => pl.get_plugin_by_name('plugin_a')).to.throw(
        `Plugin not loaded: plugin_a`
      );
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
        version: Math.random(),
      };
      let ret = pl.create_collector(collector_config);
      expect(ret).to.equal(success_return);
      sinon.assert.calledWith(
        plugin_b.create_component,
        'collectors',
        collector_config.collector_name,
        collector_config.config,
        collector_config.version
      );
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
        version: Math.random(),
      };
      let ret = pl.create_event_handler(handler_config);
      expect(ret).to.equal(success_return);
      sinon.assert.calledWith(
        plugin_b.create_component,
        'event_handlers',
        handler_config.handler_name,
        handler_config.config,
        handler_config.version
      );
    });
  });

  describe('get_module_info', () => {

    const mock_path_a = `/some/random/${Math.random()}/path_a/`;
    let revert_1;

    let require_stub = sinon.stub().throws();
    let resolve_stub = sinon.stub().throws();
    require_stub.resolve = resolve_stub;

    before(() => {
      require_stub.withArgs(`${mock_path_a}package.json`).returns(mock_plugin_a_pkg);
      resolve_stub.withArgs('plugin_a').returns(`${mock_path_a}index.js`);
      revert_1 = PluginLoader.__set__('require', require_stub);
    });

    after(() => {
      revert_1();
    });

    it('Should load contents from mock module a', () => {
      let module_info = PluginLoader.get_module_info('plugin_a');
      expect(module_info).to.deep.equal(mock_plugin_a_pkg);
    });
  });
});
