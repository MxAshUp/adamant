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



describe('App', () => {

  // Overrides mongoose, and reverts it on after
  after(App.__set__('mongoose', mongooseMock));

  it('Should construct an instance without throwing an error', () => {
    return new App();
  });

  it('Should construct an instance and use env MP_MONGODB_URL', () => {
    process.env.MP_MONGODB_URL = Math.random();
    let app = new App();
    expect(app.config.mongodb_url).to.equal(process.env.MP_MONGODB_URL);
    delete process.env.MP_MONGODB_URL;
  });

  it('Should construct an instance and use env MP_WEB_PORT', () => {
    process.env.MP_WEB_PORT = Math.random();
    let app = new App();
    expect(app.config.web_port).to.equal(process.env.MP_WEB_PORT);
    delete process.env.MP_WEB_PORT;
  });

  describe('init', () => {
    let app;

    beforeEach(() => {
      app = new App();
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
    let collectorInstanceMock;
    const model_mock_name = 'mockdel' + Math.random();

    const config = {
      parameters: {
        service_retry_max_attempts: 1,
        service_retry_time_between: 1,
        service_run_min_time_between: 1,
      }
    };

    const config_other_vals = {
      _unique: Math.random()
    };

    beforeEach(() => {
      app = new App();
      // Collector Instance Mock
      collectorInstanceMock = new Collector();
      collectorInstanceMock.model_name = model_mock_name;
      app.plugin_loader.create_component = sinon.stub().returns(collectorInstanceMock);
    });

    it('Should call create_component with config', () => {
      app.load_component(config_other_vals)
      sinon.assert.calledWith(app.plugin_loader.create_component, config_other_vals);
    });

    it('Should create a LoopService', () => {
      app.load_component(config_other_vals)
      loop_service = app.collect_services[0];
      expect(loop_service.constructor.name).to.equal('LoopService');
    });

    it(`Loop Service should be named '${model_mock_name} collector'`, () => {
      app.load_component(config_other_vals)
      loop_service = app.collect_services[0];
      expect(loop_service.name).to.equal(`${collectorInstanceMock.model_name} collector`);
    });

    it('Should set handler service_retry_max_attempts', () => {
      app.load_component(config);
      expect(app.collect_services[0].retry_max_attempts).to.equal(config.parameters.service_retry_max_attempts);
    });

    it('Should set handler service_retry_time_between', () => {
      app.load_component(config);
      expect(app.collect_services[0].retry_time_between).to.equal(config.parameters.service_retry_time_between);
    });

    it('Should set handler service_run_min_time_between', () => {
      app.load_component(config);
      expect(app.collect_services[0].service_run_min_time_between).to.equal(config.parameters.service_run_min_time_between);
    });

    it('Should add listener to service error that calls handle_service_error', () => {
      sinon.stub(app, 'handle_service_error');
      app.load_component(config);
      const mock_param = new Error(Math.random());
      const service = app.collect_services[0];
      expect(service.listenerCount('error')).to.equal(1);
      service.listeners('error')[0](mock_param);
      sinon.assert.calledWith(app.handle_service_error, service, mock_param);
      app.handle_service_error.restore();
    });

    it('Should add listener to service start that calls debug_message', () => {
      sinon.stub(app, 'debug_message');
      app.load_component(config);
      const service = app.collect_services[0];
      expect(service.listenerCount('start')).to.equal(1);
      service.listeners('start')[0]();
      sinon.assert.calledWith(app.debug_message, `${service.name} service`, 'started');
    });

    it('Should add listener to service stop that calls debug_message', () => {
      sinon.stub(app, 'debug_message');
      app.load_component(config);
      const service = app.collect_services[0];
      expect(service.listenerCount('stop')).to.equal(1);
      service.listeners('stop')[0]();
      sinon.assert.calledWith(app.debug_message, `${service.name} service`, 'stopped');
    });

    it('Should add listener to collector error that calls handle_collector_error', () => {
      sinon.stub(app, 'handle_collector_error');
      app.load_component(config);
      const mock_param = new Error(Math.random());
      const collector = app.collectors[0];
      expect(collector.listenerCount('error')).to.equal(1);
      collector.listeners('error')[0](mock_param);
      sinon.assert.calledWith(app.handle_collector_error, collector, mock_param);
      app.handle_collector_error.restore();
    });

    ['create', 'update', 'remove'].forEach((event) => {
      it(`Should add listener to collector ${event} that calls handle_collector_event`, () => {
        sinon.stub(app, 'handle_collector_event');
        app.load_component(config);
        const collector = app.collectors[0];
        expect(collector.listenerCount(event)).to.equal(1);
        collector.listeners(event)[0]();
        sinon.assert.calledWith(app.handle_collector_event, collector);
        app.handle_collector_event.restore();
      });
    });

    it(`Should add listener to collector done that calls dispatcher ${model_mock_name}.done`, () => {
      sinon.stub(app.event_dispatcher, 'emit');
      app.load_component(config);
      const mock_data = Math.random();
      const collector = app.collectors[0];
      expect(collector.listenerCount('done')).to.equal(1);
      collector.listeners('done')[0](mock_data);
      sinon.assert.calledWith(app.event_dispatcher.emit, `${model_mock_name}.done`, mock_data);
    });
  });

  describe('load_event_handler', () => {
    let app;
    let eventDispatcherInstanceMock
    let eventHandlerInstanceMock;

    const config = {
      parameters: {
        event_name: `${Math.random()}`,
        defer_dispatch: true,
        should_handle: true,
        transform_function: sinon.stub(),
      }
    };

    const config_other_vals = {
      _unique: Math.random()
    };

    beforeEach(() => {
      app = new App();

      // Event Dispatcher Mock
      eventDispatcherInstanceMock = new EventDispatcher();
      eventDispatcherInstanceMock.load_event_handler = sinon.stub();

      // Event handler mock
      eventHandlerInstanceMock = new EventHandler();

      app.plugin_loader.create_component = sinon.stub().returns(eventHandlerInstanceMock);
      app.event_dispatcher = eventDispatcherInstanceMock;
    });

    it('Should call create_component with config', () => {
      app.load_component(config_other_vals);
      sinon.assert.calledWith(app.plugin_loader.create_component, config_other_vals);
    });

    it('Should call load_event_handler on event Dispatcher', () => {
      app.load_component(config_other_vals);
      sinon.assert.calledWith(eventDispatcherInstanceMock.load_event_handler, eventHandlerInstanceMock);
    });

    it('Should set handler event_name', () => {
      app.load_component(config);
      expect(eventDispatcherInstanceMock.load_event_handler.lastCall.args[0].event_name).to.equal(config.parameters.event_name);
    });

    it('Should set handler defer_dispatch', () => {
      app.load_component(config);
      expect(eventDispatcherInstanceMock.load_event_handler.lastCall.args[0].defer_dispatch).to.equal(config.parameters.defer_dispatch);
    });

    it('Should set handler should_handle', () => {
      app.load_component(config);
      expect(eventDispatcherInstanceMock.load_event_handler.lastCall.args[0].should_handle).to.equal(config.parameters.should_handle);
    });

    it('Should set handler transform_function', () => {
      app.load_component(config);
      expect(eventDispatcherInstanceMock.load_event_handler.lastCall.args[0].transform_function).to.equal(config.parameters.transform_function);
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
    const app = new App();

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

  describe('handle_collector_event', () => {
    let app;

    const model_mock_name = 'mockdel' + Math.random();

    beforeEach(() => {
      app = new App();

      // Event dispatcher mock
      eventDispatcherInstanceMock = new EventDispatcher();
      eventDispatcherInstanceMock.enqueue_event = sinon.stub();

      // Mock collector
      collectorInstanceMock = new Collector();
      collectorInstanceMock.model_name = model_mock_name;

      app.event_dispatcher = eventDispatcherInstanceMock;
    });

    it('Should enqueue event in event dispatcher', () => {
      const mock_event_data = Math.random();
      const mock_event_name = 'event' + Math.random();
      app.handle_collector_event(collectorInstanceMock, mock_event_name, mock_event_data);
      const event = eventDispatcherInstanceMock.enqueue_event.lastCall.args[0];
      expect(event.constructor.name).to.equal('Event');
      expect(event.data).to.equal(mock_event_data);
      expect(event.event_name).to.equal(`${model_mock_name}.${mock_event_name}`);
    })
  });

  describe('handle_collector_error', () => {
    let app;
    let collectorInstanceMock;

    const model_mock_name = 'mockdel' + Math.random();

    beforeEach(() => {
      app = new App();

      // Mock collector
      collectorInstanceMock = new Collector();
      collectorInstanceMock.model_name = model_mock_name;

      sinon.stub(app, 'debug_message');
    });

    it('Should call debug_message with collector name and error stack', () => {
      const mock_error = new Error(Math.random());
      app.handle_collector_error(collectorInstanceMock, mock_error);
      sinon.assert.calledWith(app.debug_message, `${model_mock_name} collector`, `error: ${mock_error.stack}`);
    });

    it('Should call debug_message with cuplrit as details', () => {
      const mock_error = new Error(Math.random());
      mock_error.culprit = new Error('Culprit error!');
      app.handle_collector_error(collectorInstanceMock, mock_error);
      sinon.assert.calledWith(app.debug_message, `${model_mock_name} collector`, `error: ${mock_error.stack}`, `${mock_error.culprit.stack}`);
    });
  });

  describe('handle_service_error', () => {
    let app;
    let serviceInstanceMock;

    const model_mock_name = 'mockdel' + Math.random();

    beforeEach(() => {
      app = new App();

      // Mock collector
      serviceInstanceMock = {};
      serviceInstanceMock.name = model_mock_name;

      sinon.stub(app, 'debug_message');
    });

    it('Should call debug_message with collector name and error stack', () => {
      const mock_error = new Error(Math.random());
      app.handle_service_error(serviceInstanceMock, mock_error);
      sinon.assert.calledWith(app.debug_message, `${model_mock_name} service`, `error: ${mock_error.stack}`);
    });

    it('Should call debug_message with cuplrit as details', () => {
      const mock_error = new Error(Math.random());
      mock_error.culprit = new Error('Culprit error!');
      app.handle_service_error(serviceInstanceMock, mock_error);
      sinon.assert.calledWith(app.debug_message, `${model_mock_name} service`, `error: ${mock_error.stack}`, `${mock_error.culprit.stack}`);
    });
  });

  describe('debug_message', () => {
    let app;

    const console_log = sinon.spy();

    // Overrides console.log and reverts in After
    after(App.__set__('console', { log: console_log }));

    beforeEach(() => {
      app = new App();
    });

    it('Should call console log with message', () => {
      const mock_name = 'mock_name' + Math.random();
      const mock_message = 'mock_message' + Math.random();
      app.debug_message(mock_name, mock_message);
      sinon.assert.calledWith(console_log, `[${mock_name}] ${mock_message}`);
    });

    it('Should call console log with message and details', () => {
      const mock_name = 'mock_name' + Math.random();
      const mock_message = 'mock_message' + Math.random();
      const mock_details = 'mock_details' + Math.random();
      app.debug_message(mock_name, mock_message, mock_details);
      sinon.assert.calledWith(console_log, `More Details: ${mock_details}`);
    });
  });
});