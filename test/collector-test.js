const
  // Test tools
  chai = require('chai'),
  expect = chai.expect,
  assert = chai.assert,
  rewire = require('rewire'),
  sinon = require('sinon'),
  sa_sinon = require('sinon-as-promised'),
  _ = require('lodash'),
  errors = require('../include/errors'),
  mongooseMock = require('mongoose-mock'),
  // Modules to test
  Collector = rewire('../include/collector');


// Rewire database stuff
Collector.__set__("mongoose_utils", {
  getModel: mongooseMock.model,
  getModelKey: function(model_name) {
    return 'id';
  }
});


var schema = mongooseMock.Schema({id: String});
var testModel = mongooseMock.model('test.test_model', schema);

describe('Collector Class', () => {

  testModel.count.returns(Promise.resolve(1));
  testModel.findOneAndUpdate.returns(Promise.resolve());
  testModel.findOneAndRemove.returns(Promise.resolve());

  // Test Subclass of Collector
  class TestCollectorClass extends Collector {
    constructor() {
      super();

      // Collector properties
      this.plugin_name = '_Test';
      this._setup_model('test.test_model');
    }
  }

  it('Should construct an instance', () => {
    expect(() => new TestCollectorClass()).to.not.throw();
  });

  describe('run', () => {

    before(() => {
      testModel.findOneAndUpdate.reset();
      testModel.findOneAndRemove.reset();
    });

    describe('with nothing to do', () => {

      let test_collector_instance = new TestCollectorClass();
      test_collector_instance.initialize = sinon.spy();
      test_collector_instance.collect = sinon.stub().returns([]);
      test_collector_instance.prepare = sinon.stub().resolves({});
      test_collector_instance.garbage = sinon.stub().resolves();
      const ret_promise = test_collector_instance.run();

      it('Should call initialize()', (done) => {
        ret_promise.then(() => {
          sinon.assert.calledOnce(test_collector_instance.initialize);
        }).then(done).catch(done);
      });
      it('Should call prepare()', (done) => {
        ret_promise.then(() => {
          sinon.assert.calledOnce(test_collector_instance.prepare);
        }).then(done).catch(done);
      });
      it('Should call collect()', (done) => {
        ret_promise.then(() => {
          sinon.assert.calledOnce(test_collector_instance.collect);
        }).then(done).catch(done);
      });
      it('Should call garbage()', (done) => {
        ret_promise.then(() => {
          sinon.assert.calledOnce(test_collector_instance.garbage);
        }).then(done).catch(done);
      });
      it('Should not call findOneAndUpdate', (done) => {
        ret_promise.then(() => {
          sinon.assert.notCalled(testModel.findOneAndUpdate);
        }).then(done).catch(done);
      });
      it('Should not findOneAndRemove', (done) => {
        ret_promise.then(() => {
          sinon.assert.notCalled(testModel.findOneAndUpdate);
        }).then(done).catch(done);
      });
    });
    describe('Inserting/Updating documents', () => {

      const odl_db_data = [
        {id:'1', foo: 'bar'},
        {id:'3', foo: 'bar3'}
      ];

      const new_data = [
        {id:'1', foo: 'bar'},
        {id:'2', foo: 'bar2'},
        {id:'3', foo: 'updated'}
      ];

      const mock_data = [{id:'1', foo: 'bar'},{id:'2', foo: 'bar2'},{id:'3', foo: 'bar3'}];

      let test_collector_instance = new TestCollectorClass();
      test_collector_instance.initialize = sinon.spy();
      test_collector_instance.prepare = sinon.stub().resolves({});
      test_collector_instance.collect = sinon.stub().returns(new_data);
      test_collector_instance.garbage = sinon.stub().resolves();

      testModel.find.returns(Promise.resolve(null));
      testModel.find.withArgs({id: new_data[0].id}).returns(Promise.resolve(odl_db_data[0]));
      testModel.find.withArgs({id: new_data[1].id}).returns(Promise.resolve(undefined));
      testModel.find.withArgs({id: new_data[2].id}).returns(Promise.resolve(odl_db_data[1]));
      testModel.findOneAndUpdate.withArgs({id: new_data[0].id}).returns(Promise.resolve(new_data[0]));
      testModel.findOneAndUpdate.withArgs({id: new_data[1].id}).returns(Promise.resolve(new_data[1]));
      testModel.findOneAndUpdate.withArgs({id: new_data[2].id}).returns(Promise.resolve(new_data[2]));



      const update_handler = sinon.spy();
      const create_handler = sinon.spy();

      test_collector_instance.on('update', update_handler);
      test_collector_instance.on('create', create_handler);

      const ret_promise = test_collector_instance.run();

      it('Should call collect', (done) => {
        ret_promise.then(() => {
          sinon.assert.calledOnce(test_collector_instance.collect);
        }).then(done).catch(done);
      });

      it('Should not do anything with item 1, no data has changed', (done) => {
        ret_promise.then(() => {
          sinon.assert.neverCalledWith(update_handler,new_data[0]);
          sinon.assert.neverCalledWith(create_handler,new_data[0]);
        }).then(done).catch(done);
      });

      it('Should insert data with item 2, data is new', (done) => {
        ret_promise.then(() => {
          sinon.assert.calledWith(create_handler,new_data[1]);
          sinon.assert.neverCalledWith(update_handler,new_data[1]);
        }).then(done).catch(done);
      });

      it('Should update data with item 3', (done) => {
        ret_promise.then(() => {
          sinon.assert.calledWith(update_handler,new_data[2]);
        }).then(done).catch(done);
      });
    });
    describe('with error in intiialize', () => {
      it('Should call initialize()');
      it('Should reject with CollectorInitializeError');
      it('Should set initialize_flag to false');
    });
    describe('with error in prepare', () => {
      it('Should should call prepare');
      it('Should not call collect');
      it('Should not call garbage');
      it('Should reject with error');
      it('Should set initialize_flag to false');
    });
    describe('with error in collect', () => {
      it('Should call collect');
      it('Should call garbage');
      it('Should reject with error');
      it('Should set initialize_flag to false');
    });
    describe('with reject in item in collect', () => {
      it('Should call collect');
      it('Should not reject with error');
      it('Should not set initialize_flag to false');
      it('Should emit \'error\'');
    });
  });

});