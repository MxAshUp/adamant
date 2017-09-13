const chai = require('chai');
const expect = chai.expect;
const assert = chai.assert;
const sinon = require('sinon');
const rewire = require('rewire');
const mongooseMock = require('mongoose-mock');
// components to test
const App = rewire('../libs/app');

// Collector Instance Mock
const CollectorInstanceMock = {
  model_name: 'stub',
  run: sinon.stub(),
};

// PluginLoader Mock
const PluginLoaderInstanceMock = {
  load_plugin: sinon.spy(),
  // load_plugin_models: null,
  // load_plugin_routes: null,
  // load_plugin_sockets: null,
  create_collector: sinon.stub().returns(CollectorInstanceMock),
  create_event_handler: sinon.stub(),
};
const PluginLoaderMock = sinon.stub().returns(PluginLoaderInstanceMock);

// Event Dispatcher Mock
const EventDispatcherInstanceMock = {
  load_event_handler: sinon.stub(),
  run: sinon.stub(),
  on: sinon.stub(),
};
const EventDispatcherMock = sinon.stub().returns(EventDispatcherInstanceMock);

// LoopService Mock
const LoopServiceInstanceMock = {
  on: sinon.stub(),
};
const LoopServiceMock = sinon.stub().returns(LoopServiceInstanceMock);

console_log_spy = sinon.spy();
// App.__set__('console', { log: console_log_spy });
App.__set__('PluginLoader', PluginLoaderMock);
App.__set__('EventDispatcher', EventDispatcherMock);
App.__set__('LoopService', LoopServiceMock);
App.__set__('mongoose', mongooseMock);

describe('App', () => {
  beforeEach(() => {
    // Reset PluginLoaderMock
    PluginLoaderInstanceMock.load_plugin.reset();
    PluginLoaderInstanceMock.create_event_handler.reset();
    PluginLoaderInstanceMock.create_event_handler.returns({});

    // Reset EventDispatcherMock
    EventDispatcherInstanceMock.load_event_handler.reset();
  });

  it('Should construct an instance without throwing an error', () => {
    return new App();
  });

  describe('init', () => {
    const app = new App({});

    // stub app methods
    app.plugin_loader.load_plugin_models = sinon.stub().resolves();
    app.plugin_loader.load_plugin_routes = sinon.stub();

    it('Should return a promise that resolves and call three internal methods', () => {
      return app.init().then(() => {
        sinon.assert.calledWith(app.plugin_loader.load_plugin_models, mongooseMock);
        sinon.assert.calledWith(app.plugin_loader.load_plugin_routes, app.express_app);
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

  describe('load_collector', () => {
    const app = new App({});

    // stub app methods
    app._bind_service_events = sinon.stub();
    app._bind_model_events = sinon.stub();

    LoopServiceMock.resetHistory();

    // call app.load_collector() w/ config obj
    const config = {
      service_retry_max_attempts: 1,
      service_retry_time_between: 1,
      run_min_time_between: 1,
    };
    app.load_collector(config);

    // expect plugin.loader.create_collector to be called once w/ config obj
    it('Should create collector instance with config', () => {
      sinon.assert.calledWith(app.plugin_loader.create_collector, config);
      expect(app.plugin_loader.create_collector.callCount).to.equal(1);
    });

    // // expect LoopServiceMock to be called (new'd) once w/ collector.run method
    // it('Should create LoopService instance', () => {
    //   expect(LoopServiceMock.callCount).to.equal(1);
    // });

    // expect config props (x3) to be inserted into service obj
    // expect service.name to equal `${collector.model_name} collector`
    // expect this._bind_service_events to be called once w/ service obj
    // expect this._bind_model_events to be called once w/ collector obj
    // expect service.on method to be called once w/ 'complete' & func as params
    // expect service object to be added to this.collect_services
  });

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

  describe('run', () => {
    const y = Math.floor(Math.random() * 10 + 1); // random integer between 1-10
    const app = new App({
      web_port: y,
    });

    // stub/mock app props
    app.stop = sinon.stub();
    app.event_dispatcher_service = {
      start: sinon.stub().resolves(),
    };
    app.server = {
      listen: sinon.stub(),
    };

    // mock collector services
    app.collect_services = [];
    const n = Math.floor(Math.random() * 10 + 1); // random integer between 1-10
    const serviceStartStub = sinon.stub().resolves();
    for (var i = 0; i < n; i++) {
      const service = { start: serviceStartStub };
      app.collect_services.push(service);
    }

    app.run();

    it('Should start Event Dispatcher Service', () => {
      expect(app.event_dispatcher_service.start.callCount).to.equal(1);
    });

    it('Should start N collector services', () => {
      expect(serviceStartStub.callCount).to.equal(n);
    });

    it('Should instruct Express Server to listen on port Y', () => {
      expect(app.server.listen.callCount).to.equal(1);
      sinon.assert.calledWith(app.server.listen, y);
    });
  });

  describe('stop', () => {
    const app = new App({});

    // stub app props
    app.server = {
      close: sinon.stub(),
    };
    app.event_dispatcher_service = {
      stop: sinon.stub(),
    };

    // mock collector services
    app.collect_services = [];
    const n = Math.floor(Math.random() * 10 + 1); // random integer between 1-10
    const serviceStopStub = sinon.stub().resolves();
    for (var i = 0; i < n; i++) {
      const service = { stop: serviceStopStub };
      app.collect_services.push(service);
    }

    // stub process.exit
    // process.exit = sinon.stub();
    const processExitStub = sinon.stub(process, 'exit');
    // processStub.exit.onCall(0).returns();

    app.stop();

    it('Should halt Express Server', () => {
      expect(app.server.close.callCount).to.equal(1);
    });

    it('Should stop all collector services', () => {
      expect(serviceStopStub.callCount).to.equal(n);
    });

    it('Should stop event dispatcher service', () => {
      expect(app.event_dispatcher_service.stop.callCount).to.equal(1);
    });

    it('Should terminate app process', () => {
      expect(processExitStub.callCount).to.equal(1);
    });

    // reset process.exit()
    process.exit.restore();
  });

  it('Should never call console.log', () => {
    sinon.assert.neverCalledWith(console_log_spy);
  });
});
