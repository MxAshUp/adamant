const chai = require('chai');
const expect = chai.expect;
const assert = chai.assert;
const sinon = require('sinon');
const rewire = require('rewire');
// components to test
const App = rewire('../libs/app');

const PluginLoaderInstanceMock = {
  load_plugin: sinon.spy(),
  // load_plugin_models: null,
  // load_plugin_routes: null,
  // load_plugin_sockets: null,
  // create_collector: null,
  create_event_handler: sinon.stub().returns({}),
};
const PluginLoaderMock = sinon.stub().returns(PluginLoaderInstanceMock);

const EventDispatcherInstanceMock = {
  load_event_handler: sinon.stub(),
  run: sinon.stub(),
  on: sinon.stub(),
};
const EventDispatcherMock = sinon.stub().returns(EventDispatcherInstanceMock);

console_log_spy = sinon.spy();
App.__set__('console', { log: console_log_spy });
App.__set__('PluginLoader', PluginLoaderMock);
App.__set__('EventDispatcher', EventDispatcherMock);

describe('App', () => {
  beforeEach(() => {
    PluginLoaderInstanceMock.load_plugin.reset();
    PluginLoaderInstanceMock.create_event_handler.reset();
    PluginLoaderInstanceMock.create_event_handler.returns({});
    EventDispatcherInstanceMock.load_event_handler.reset();
  });

  it('Should construct an instance without throwing an error', () => {
    return new App();
  });

  describe('init', () => {
    const app = new App({});
    app._load_database = sinon.stub();
    app._load_routes = sinon.stub();
    app._load_sockets = sinon.stub();

    it('Should return a promise that resolves and call three internal methods', () => {
      app.init().then(() => {
        expect(app._load_database.callCount).to.equal(1);
        expect(app._load_routes.callCount).to.equal(1);
        expect(app._load_sockets.callCount).to.equal(1);
      });
    });
  });

  describe('load_plugins', () => {
    const app = new App({});

    it('Should call load_plugin N times and not throw', () => {
      const pluginDirPaths = [];
      const n = Math.floor(Math.random() * 10 + 1); // random integer between 1-10
      for (var i = 0; i < n; i++) {
        pluginDirPaths.push('z');
      }

      app.load_plugins(pluginDirPaths);
      expect(PluginLoaderInstanceMock.load_plugin).to.not.throw;
      expect(PluginLoaderInstanceMock.load_plugin.callCount).to.equal(n);
    });
  });

  describe('load_collector', () => {});

  describe('load_event_handler', () => {
    const app = new App();

    it('Should create event handler and call event_dispatcher.load_event_handler with handler', () => {
      const config = {
        event_name: 'z',
        defer_dispatch: true,
        should_handle: true,
      };
      app.load_event_handler(config);

      // PluginLoader
      sinon.assert.calledWith(
        PluginLoaderInstanceMock.create_event_handler,
        config
      );
      expect(PluginLoaderInstanceMock.create_event_handler.callCount).to.equal(
        1
      );

      // EventDispatcher
      sinon.assert.calledWith(
        EventDispatcherInstanceMock.load_event_handler,
        config
      );
      expect(EventDispatcherInstanceMock.load_event_handler.callCount).to.equal(
        1
      );
    });
  });

  describe('run', () => {});

  describe('stop', () => {});

  it('Should never call console.log', () => {
    sinon.assert.neverCalledWith(console_log_spy);
  });
});
