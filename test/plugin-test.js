const rewire = require('rewire'),
  sinon = require('sinon'),
  chai = require('chai'),
  expect = chai.expect,
  assert = chai.assert,
  // components to test
  plugin = rewire('../libs/plugin');


console_log_spy = sinon.spy();
plugin.__set__("console", {log: console_log_spy});


describe('Abstract Plugin', () => {
  it('Should construct without throwing error', () => {
    expect(() => new plugin({
      name: '_test_plugin'
    })).to.not.throw();
  });
  it('Should construct and throw error if name not specified', () => {
    expect(() => new plugin()).to.throw(`A valid name is required for Plugin object.`);
  });
  it('Should construct and assign models', () => {
    const models = [
      Math.random(),
      Math.random(),
      Math.random()
    ];
    let pl = new plugin({
      name: '_test_plugin',
      models: models
    });

    expect(pl.models).to.deep.equal(models);
  });
  it('Should construct and assign collectors', () => {
    const collectors = [
      Math.random(),
      Math.random(),
      Math.random()
    ];
    let pl = new plugin({
      name: '_test_plugin',
      collectors: collectors
    });

    expect(pl.collectors).to.deep.equal(collectors);
  });
  it('Should construct and assign event handlers', () => {
    const event_handlers = [
      Math.random(),
      Math.random(),
      Math.random()
    ];
    let pl = new plugin({
      name: '_test_plugin',
      event_handlers: event_handlers
    });

    expect(pl.event_handlers).to.deep.equal(event_handlers);
  });

  it('Should load models into mongoose', () => {

    let load_model_spy = sinon.spy();

    // Rewire database stuff
    let revert = plugin.__set__("mongoose_utils", {
      loadModel: load_model_spy
    });

    after(revert);

    const models = [
      Math.random(),
      Math.random(),
      Math.random()
    ];
    let pl = new plugin({
      name: '_test_plugin',
      models: models
    });

    expect(pl.load_models.bind(pl)).to.not.throw();
    sinon.assert.calledThrice(load_model_spy);
    sinon.assert.calledWith(load_model_spy, models[0]);
    sinon.assert.calledWith(load_model_spy, models[1]);
    sinon.assert.calledWith(load_model_spy, models[2]);

  });

  describe('Creating plugin components', () => {

    class collector_a {
      constructor(args) {
        this.construct_spy = sinon.spy();
        this.construct_spy(args);
      }
    }

    class collector_b {
      constructor(args) {
        this.construct_spy = sinon.spy();
        this.construct_spy(args);
      }
    }

    class handler_a {
      constructor(args) {
        this.construct_spy = sinon.spy();
        this.construct_spy(args);
      }
    }

    class handler_b {
      constructor(args) {
        this.construct_spy = sinon.spy();
        this.construct_spy(args);
      }
    }

    const collectors = [
      collector_a,
      collector_b,
    ];
    const event_handlers = [
      handler_a,
      handler_b,
    ];
    let pl = new plugin({
      name: '_test_plugin',
      collectors: collectors,
      event_handlers: event_handlers,
      version: '0.1.0',
    });

    it('Should throw error creating unknown component type', () => {
      expect(() => pl.create_component('INVALID_TYPE', 'class_name', {})).to.throw(`_test_plugin does not have component of type: INVALID_TYPE.`);
    });

    it('Should throw error cannot find component', () => {
      expect(() => pl.create_component('collectors', 'INVALID_COLLECTOR', {})).to.throw(`Component not found: INVALID_COLLECTOR`);
    });

    it('Should create collector component', () => {
      const args = Math.random();
      component = pl.create_component('collectors', 'collector_a', args);
      expect(component).to.be.instanceof(collector_a);
      sinon.assert.calledWith(component.construct_spy, args);
    });

    it('Should throw error if require_version doesn\'t satisfy plugin version', () => {
      const args = Math.random();
      expect(() => pl.create_component('collectors', 'collector_b', args, '0.2.0')).to.throw(`Version requirements not met. Plugin version: ${pl.version} Semver requirement: 0.2.0.`);
    });

    it('Should throw error if require_version doesn\'t satisfy plugin version', () => {
      const args = Math.random();
      expect(() => pl.create_component('collectors', 'collector_b', args, '1.0.x')).to.throw(`Version requirements not met. Plugin version: ${pl.version} Semver requirement: 1.0.x.`);
    });

    it('Should throw error if require_version isn\t valid semver', () => {
      const args = Math.random();
      expect(() => pl.create_component('collectors', 'collector_b', args, '1')).to.throw(`Version requirements not met. Plugin version: ${pl.version} Semver requirement: 1.`);
    });

    it('Should not throw error if require_version satisfies plugin version', () => {
      const args = Math.random();
      pl.create_component('collectors', 'collector_b', args, '0.1.x');
    });

    it('Should not throw error if require_version satisfies not specified', () => {
      const args = Math.random();
      pl.create_component('collectors', 'collector_b', args, '>=0.0.1');
    });

    it('Should create event handler component', () => {
      const args = Math.random();
      component = pl.create_component('event_handlers', 'handler_b', args);
      expect(component).to.be.instanceof(handler_b);
      sinon.assert.calledWith(component.construct_spy, args);
    });
  });


  describe('Default behavior of override functions', () => {
    let pl = new plugin({name: '_test_plugin'});
    it('on_load should return nothing', () => {
      expect(pl.on_load()).to.be.undefined;
    });
    it('on_unload should return nothing', () => {
      expect(pl.on_unload()).to.be.undefined;
    });
    it('load_routes should return nothing', () => {
      expect(pl.load_routes()).to.be.undefined;
    });
  });

  it('Should never call console.log', () => {
    sinon.assert.neverCalledWith(console_log_spy);
  });
});