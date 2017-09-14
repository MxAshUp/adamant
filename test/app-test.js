const chai = require('chai');
const expect = chai.expect;
const assert = chai.assert;
const sinon = require('sinon');
const rewire = require('rewire');
const mongooseMock = require('mongoose-mock');
const Collector = require('../libs/collector');
const EventHandler = require('../libs/event-handler');
const EventDispatcher = require('../libs/event-dispatcher');
// components to test
const App = rewire('../libs/app');

// Collector Instance Mock
const CollectorInstanceMock = new Collector();
CollectorInstanceMock.model_name = 'stub';

// Event Handler Instance Mock
const EventHandlerInstanceMock = new EventHandler();

// Event Dispatcher Mock
const EventDispatcherInstanceMock = new EventDispatcher();

EventDispatcherInstanceMock.load_event_handler = sinon.stub();
EventDispatcherInstanceMock.run = sinon.stub();
EventDispatcherInstanceMock.on = sinon.stub();


// LoopService Mock
const LoopServiceInstanceMock = {
  on: sinon.stub(),
};

console_log_spy = sinon.stub().callsFake(console.log);
App.__set__('console', { log: console_log_spy });
App.__set__('mongoose', mongooseMock);

describe('App', () => {


  it('Should construct an instance without throwing an error', () => {
    return new App();
  });

  it('Should construct an instance and use env MP_MONGODB_URL', () => {
    process.env.MP_MONGODB_URL = Math.random();
    let app = new App();
    expect(app._config.mongodb_url).to.equal(process.env.MP_MONGODB_URL);
    delete process.env.MP_MONGODB_URL;
  });
  it('Should construct an instance and use env MP_WEB_PORT', () => {
    process.env.MP_WEB_PORT = Math.random();
    let app = new App();
    expect(app._config.web_port).to.equal(process.env.MP_WEB_PORT);
    delete process.env.MP_WEB_PORT;
  });

  describe('init', () => {
    let app;


    beforeEach(() => {
      app = new App({});
    });

    it('Should return a promise that resolves and call plugin_loader.load_plugin_models', () => {
      app.plugin_loader.load_plugin_models = sinon.stub().resolves();
      return app.init().then(() => {
        sinon.assert.calledWith(app.plugin_loader.load_plugin_models, mongooseMock);
      });
    });
    it('Should return a promise that resolves and call lugin_loader.load_plugin_routes', () => {
      app.plugin_loader.load_plugin_routes = sinon.stub();
      return app.init().then(() => {
        sinon.assert.calledWith(app.plugin_loader.load_plugin_routes, app.express_app);
      });
    });
  });


  describe('load_plugins', () => {

    let app;

    mock_config = {
      custom_config_setting: Math.random()
    };

    const n = Math.floor(Math.random() * 10 + 3); // random integer between 3-13
    const pluginDirPaths = (new Array(n)).fill().map(() => Math.random());

    beforeEach(() => {
      app = new App(mock_config);
      app.plugin_loader.load_plugin = sinon.spy();
      app.load_plugins(pluginDirPaths);
    });

    it('Should call load_plugin with path and mock_config', () => {
      pluginDirPaths.forEach((path) => {
        sinon.assert.calledWith(app.plugin_loader.load_plugin, path, sinon.match(mock_config));
      });
    });
  });

  describe('load_collector', () => {
    let app;

    const config = {
      service_retry_max_attempts: 1,
      service_retry_time_between: 1,
      run_min_time_between: 1,
    };

    const config_other_vals = {
      _unique: Math.random()
    };

    beforeEach(() => {
      app = new App();;
      app.plugin_loader.create_collector = sinon.stub().returns(CollectorInstanceMock);
    });

    it('Should call create_collector with config', () => {
      app.load_collector(config_other_vals)
      sinon.assert.calledWith(app.plugin_loader.create_collector, config_other_vals);
    });

    it('Should create a LoopService', () => {
      app.load_collector(config_other_vals)
      loop_service = app.collect_services[0];
      expect(loop_service.constructor.name).to.equal('LoopService');
    });

    it(`Loop Service should be named '${CollectorInstanceMock.model_name} collector'`, () => {
      app.load_collector(config_other_vals)
      loop_service = app.collect_services[0];
      expect(loop_service.name).to.equal(`${CollectorInstanceMock.model_name} collector`);
    });


    it('Should set handler service_retry_max_attempts', () => {
      app.load_collector(config);
      expect(app.collect_services[0].retry_max_attempts).to.equal(config.service_retry_max_attempts);
    });

    it('Should set handler service_retry_time_between', () => {
      app.load_collector(config);
      expect(app.collect_services[0].retry_time_between).to.equal(config.service_retry_time_between);
    });

    it('Should set handler run_min_time_between', () => {
      app.load_collector(config);
      expect(app.collect_services[0].run_min_time_between).to.equal(config.run_min_time_between);
    });

  });

  describe('load_event_handler', () => {
    let app;

    const config = {
      event_name: `${Math.random}`,
      defer_dispatch: true,
      should_handle: true,
    };

    const config_other_vals = {
      _unique: Math.random()
    };

    beforeEach(() => {
      app = new App();
      app.plugin_loader.create_event_handler = sinon.stub().returns(EventHandlerInstanceMock);
      app.event_dispatcher = EventDispatcherInstanceMock;
    });

    it('Should call create_event_handler with config', () => {
      app.load_event_handler(config_other_vals);
      sinon.assert.calledWith(app.plugin_loader.create_event_handler, config_other_vals);
    });

    it('Should call load_event_handler on event Dispatcher', () => {
      app.load_event_handler(config_other_vals);
      sinon.assert.calledWith(EventDispatcherInstanceMock.load_event_handler, EventHandlerInstanceMock);
    });

    it('Should set handler event_name', () => {
      app.load_event_handler(config);
      expect(EventDispatcherInstanceMock.load_event_handler.lastCall.args[0].event_name).to.equal(config.event_name);
    });

    it('Should set handler defer_dispatch', () => {
      app.load_event_handler(config);
      expect(EventDispatcherInstanceMock.load_event_handler.lastCall.args[0].defer_dispatch).to.equal(config.defer_dispatch);
    });

    it('Should set handler should_handle', () => {
      app.load_event_handler(config);
      expect(EventDispatcherInstanceMock.load_event_handler.lastCall.args[0].should_handle).to.equal(config.should_handle);
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
