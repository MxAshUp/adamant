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

  it('Should not allow second call to _setup_model', () => {
    let instance = new TestCollectorClass();
    expect(instance._setup_model.bind(instance)).to.throw();
  });

  describe('run', () => {

    before(() => {
      testModel.findOneAndUpdate.reset();
      testModel.findOneAndRemove.reset();
      testModel.find.reset();
    });

    describe('with nothing to do', () => {

      let test_collector_instance = new TestCollectorClass();
      test_collector_instance.initialize = sinon.spy();
      test_collector_instance.collect = sinon.stub().returns([]);
      test_collector_instance.prepare = sinon.stub().resolves({});
      test_collector_instance.garbage = sinon.stub().resolves();
      let ret_promise = test_collector_instance.run();

      let update_handler = sinon.spy();
      let create_handler = sinon.spy();

      test_collector_instance.on('update', update_handler);
      test_collector_instance.on('create', create_handler);

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
      it('Should not emit insert or update events', (done) => {
        ret_promise.then(() => {
          sinon.assert.notCalled(update_handler);
          sinon.assert.notCalled(create_handler);
        }).then(done).catch(done);
      });
    });

    describe('Run when already initialized', () => {
      let test_collector_instance = new TestCollectorClass();
      test_collector_instance.initialize = sinon.spy();
      test_collector_instance.collect = sinon.stub().returns([]);
      test_collector_instance.prepare = sinon.stub().resolves({});
      test_collector_instance.garbage = sinon.stub().resolves();
      let ret_promise = test_collector_instance.run().then(test_collector_instance.run.bind(test_collector_instance));

      let update_handler = sinon.spy();
      let create_handler = sinon.spy();

      test_collector_instance.on('update', update_handler);
      test_collector_instance.on('create', create_handler);

      it('Should run initialize only once', (done) => {
        ret_promise.then(() => {
          sinon.assert.calledOnce(test_collector_instance.initialize);
        }).then(done).catch(done);
      });
      it('Should run prepare twice', (done) => {
        ret_promise.then(() => {
          sinon.assert.calledTwice(test_collector_instance.prepare);
        }).then(done).catch(done);
      });
      it('Should run collect twice', (done) => {
        ret_promise.then(() => {
          sinon.assert.calledTwice(test_collector_instance.collect);
        }).then(done).catch(done);
      });
      it('Should run garbage twice', (done) => {
        ret_promise.then(() => {
          sinon.assert.calledTwice(test_collector_instance.garbage);
        }).then(done).catch(done);
      });
    });

    describe('Inserting/Updating documents', () => {

      // Data currently in the db
      let old_db_data = [
        {id:'1', foo: 'bar'},
        {id:'3', foo: 'bar3'}
      ];

      // Data to put in database
      let new_data = [
        {id:'1', foo: 'bar'},
        {id:'2', foo: 'bar2'},
        {id:'3', foo: 'updated'}
      ];

      let test_collector_instance = new TestCollectorClass();
      test_collector_instance.initialize = sinon.spy();
      test_collector_instance.prepare = sinon.stub().resolves({});
      test_collector_instance.collect = sinon.stub().returns(new_data);
      test_collector_instance.garbage = sinon.stub().resolves();

      testModel.find.returns(Promise.resolve(null));
      testModel.find.withArgs({id: new_data[0].id}).returns(Promise.resolve(old_db_data[0]));
      testModel.find.withArgs({id: new_data[1].id}).returns(Promise.resolve(undefined));
      testModel.find.withArgs({id: new_data[2].id}).returns(Promise.resolve(old_db_data[1]));
      testModel.findOneAndUpdate.withArgs({id: new_data[0].id}).returns(Promise.resolve(new_data[0]));
      testModel.findOneAndUpdate.withArgs({id: new_data[1].id}).returns(Promise.resolve(new_data[1]));
      testModel.findOneAndUpdate.withArgs({id: new_data[2].id}).returns(Promise.resolve(new_data[2]));

      let error_spy = sinon.spy();

      let update_handler = sinon.spy();
      let create_handler = sinon.spy();

      test_collector_instance.on('update', update_handler);
      test_collector_instance.on('create', create_handler);

      let ret_promise = test_collector_instance.run().catch(error_spy);

      it('Should not throw errors', (done) => {
        ret_promise.then(() => {
          sinon.assert.notCalled(error_spy);
        }).then(done).catch(done);
      });

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

    describe('Removing documents', () => {

      // Data to put in database
      let remove_data = [
        {id:'9', foo: 'bar'},
        {id:'11', foo: 'rab'}
      ];

      let test_collector_instance = new TestCollectorClass();
      test_collector_instance.initialize = sinon.spy();
      test_collector_instance.prepare = sinon.stub().resolves({});
      test_collector_instance.collect = sinon.stub().returns([]);
      test_collector_instance.garbage = sinon.stub().resolves([
        {id: remove_data[0].id},
        {id: remove_data[1].id},
        {id: 'notfound'}
      ]);

      testModel.findOneAndRemove.withArgs({id: remove_data[0].id}).returns(Promise.resolve(remove_data[0]));
      testModel.findOneAndRemove.withArgs({id: remove_data[1].id}).returns(Promise.resolve(remove_data[1]));
      testModel.findOneAndRemove.withArgs({id: 'notfound'}).returns(Promise.resolve(undefined));

      let error_spy = sinon.spy();

      let error_handle = sinon.spy();
      let update_handler = sinon.spy();
      let create_handler = sinon.spy();
      let remove_handler = sinon.spy();

      test_collector_instance.on('update', update_handler);
      test_collector_instance.on('create', create_handler);
      test_collector_instance.on('error', error_handle);
      test_collector_instance.on('remove', remove_handler);

      let ret_promise = test_collector_instance.run().catch(error_spy);

      it('Should call garbage', (done) => {
        ret_promise.then(() => {
          sinon.assert.calledOnce(test_collector_instance.garbage);
        }).then(done).catch(done);
      });
      it('Should emit only 2 remove events', (done) => {
        ret_promise.then(() => {
          sinon.assert.calledTwice(remove_handler);
        }).then(done).catch(done);
      });
    });

    describe('With error thrown in initialize()', () => {

      let test_collector_instance = new TestCollectorClass();
      test_collector_instance.initialize = sinon.stub().throws();
      test_collector_instance.prepare = sinon.spy();
      test_collector_instance.collect = sinon.spy();
      test_collector_instance.garbage = sinon.spy();

      let update_handler = sinon.spy();
      let create_handler = sinon.spy();

      test_collector_instance.on('update', update_handler);
      test_collector_instance.on('create', create_handler);

      let error_spy = sinon.spy();

      let ret_promise = test_collector_instance.run().catch(error_spy);

      it('Should call initialize()', (done) => {
        ret_promise.then(() => {
          sinon.assert.calledOnce(test_collector_instance.initialize);
          sinon.assert.threw(test_collector_instance.initialize);
        }).then(done).catch(done);
      });
      it('Should reject with CollectorInitializeError', (done) => {
        ret_promise.then(() => {
          assert.instanceOf(error_spy.lastCall.args[0],errors.CollectorInitializeError);
        }).then(done).catch(done);
      });
      it('Should set initialize_flag to false', (done) => {
        ret_promise.then(() => {
          expect(test_collector_instance.initialize_flag).to.be.equal(false);
        }).then(done).catch(done);
      });
      it('Should not call prepare, collect, or garbage', (done) => {
        ret_promise.then(() => {
          sinon.assert.notCalled(test_collector_instance.prepare);
          sinon.assert.notCalled(test_collector_instance.collect);
          sinon.assert.notCalled(test_collector_instance.garbage);
        }).then(done).catch(done);
      });
    });
    describe('with error thrown in prepare()', () => {

      let test_collector_instance = new TestCollectorClass();
      test_collector_instance.initialize = sinon.stub().returns(Promise.resolve());
      test_collector_instance.prepare = sinon.stub().throws();
      test_collector_instance.collect = sinon.spy();
      test_collector_instance.garbage = sinon.spy();

      let update_handler = sinon.spy();
      let create_handler = sinon.spy();

      test_collector_instance.on('update', update_handler);
      test_collector_instance.on('create', create_handler);

      let error_spy = sinon.spy();

      let ret_promise = test_collector_instance.run().catch(error_spy);

      it('Should call prepare', (done) => {
        ret_promise.then(() => {
          sinon.assert.calledOnce(test_collector_instance.prepare);
          sinon.assert.threw(test_collector_instance.prepare);
        }).then(done).catch(done);
      });
      it('Should not call collect or garbage', (done) => {
        ret_promise.then(() => {
          sinon.assert.notCalled(test_collector_instance.collect);
          sinon.assert.notCalled(test_collector_instance.garbage);
        }).then(done).catch(done);
      });
      it('Should reject with error', (done) => {
        ret_promise.then(() => {
          assert.instanceOf(error_spy.lastCall.args[0],Error);
        }).then(done).catch(done);
      });
      it('Should set initialize_flag to false', (done) => {
        ret_promise.then(() => {
          expect(test_collector_instance.initialize_flag).to.be.equal(false);
        }).then(done).catch(done);
      });
    });
    describe('with reject thrown in collect', () => {

      // Data currently in the db
      let old_db_data = [
        {id:'4', foo: 'barb'},
        {id:'6', foo: 'bar3b'}
      ];

      // Data to put in database
      let new_data = [
        {id:'4', foo: 'barb'},
        {id:'5', foo: 'bar2b'},
        {id:'6', foo: 'updatedb'}
      ];

      let test_collector_instance = new TestCollectorClass();
      test_collector_instance.initialize = sinon.spy();
      test_collector_instance.prepare = sinon.stub().resolves({});
      test_collector_instance.collect = sinon.stub().returns([
        new_data[0],
        Promise.reject(new Error()),
        new_data[2]
      ]);
      test_collector_instance.garbage = sinon.stub().resolves();

      testModel.find.returns(Promise.resolve(null));
      testModel.find.withArgs({id: new_data[0].id}).returns(Promise.resolve(old_db_data[0]));
      testModel.find.withArgs({id: new_data[1].id}).returns(Promise.resolve(undefined));
      testModel.find.withArgs({id: new_data[2].id}).returns(Promise.resolve(old_db_data[1]));
      testModel.findOneAndUpdate.withArgs({id: new_data[0].id}).returns(Promise.resolve(new_data[0]));
      testModel.findOneAndUpdate.withArgs({id: new_data[2].id}).returns(Promise.resolve(new_data[2]));

      let error_spy = sinon.spy();

      let error_handle = sinon.spy();
      let update_handler = sinon.spy();
      let create_handler = sinon.spy();

      test_collector_instance.on('update', update_handler);
      test_collector_instance.on('create', create_handler);
      test_collector_instance.on('error', error_handle);

      let ret_promise = test_collector_instance.run().catch(error_spy);

      it('Should call collect', (done) => {
        ret_promise.then(() => {
          sinon.assert.calledOnce(test_collector_instance.collect);
        }).then(done).catch(done);
      });
      it('Should call update just once', (done) => {
        ret_promise.then(() => {
          sinon.assert.calledOnce(update_handler);
        }).then(done).catch(done);
      });
      it('Should emit error event', (done) => {
        ret_promise.then(() => {
          sinon.assert.calledOnce(error_handle);
        }).then(done).catch(done);
      });
      it('Should call garbage', (done) => {
        ret_promise.then(() => {
          sinon.assert.calledOnce(test_collector_instance.garbage);
        }).then(done).catch(done);
      });
      it('Should not set initialize_flag to false', (done) => {
        ret_promise.then(() => {
          expect(test_collector_instance.initialize_flag).to.be.equal(true);
        }).then(done).catch(done);
      });
    });
    describe('with error thrown in collect', () => {


      let test_collector_instance = new TestCollectorClass();
      test_collector_instance.initialize = sinon.spy();
      test_collector_instance.prepare = sinon.stub().resolves({});
      test_collector_instance.collect = sinon.stub().throws();
      test_collector_instance.garbage = sinon.stub().resolves();

      let error_spy = sinon.spy();

      let error_handle = sinon.spy();
      let update_handler = sinon.spy();
      let create_handler = sinon.spy();

      test_collector_instance.on('update', update_handler);
      test_collector_instance.on('create', create_handler);
      test_collector_instance.on('error', error_handle);

      let ret_promise = test_collector_instance.run().catch(error_spy);

      it('Should call collect and throw error', (done) => {
        ret_promise.then(() => {
          sinon.assert.calledOnce(test_collector_instance.collect);
          sinon.assert.threw(test_collector_instance.collect);
        }).then(done).catch(done);
      });
      it('Should not call garbage', (done) => {
        ret_promise.then(() => {
          sinon.assert.notCalled(test_collector_instance.garbage);
        }).then(done).catch(done);
      });
      it('Should not emit insert or update event', (done) => {
        ret_promise.then(() => {
          sinon.assert.notCalled(update_handler);
          sinon.assert.notCalled(create_handler);
        }).then(done).catch(done);
      });
      it('Should not emit error event (error event is a per-document basis)', (done) => {
        ret_promise.then(() => {
          sinon.assert.notCalled(error_handle);
        }).then(done).catch(done);
      });
      it('Should set initialize_flag to false', (done) => {
        ret_promise.then(() => {
          expect(test_collector_instance.initialize_flag).to.be.equal(false);
        }).then(done).catch(done);
      });
      it('Should reject run with Error', (done) => {
        ret_promise.then(() => {
          sinon.assert.calledOnce(error_spy);
        }).then(done).catch(done);
      });
    });
    describe('With db error', () => {

      // Data currently in the db
      let old_db_data = [
        {id:'8', foo: 'bar3b'}
      ];

      // Data to put in database
      let new_data = [
        {id:'7', foo: 'bar2b'},
        {id:'8', foo: 'updatedb'}
      ];

      let test_collector_instance = new TestCollectorClass();
      test_collector_instance.initialize = sinon.spy();
      test_collector_instance.prepare = sinon.stub().resolves({});
      test_collector_instance.collect = sinon.stub().returns([
        new_data[0],
        new_data[1]
      ]);
      test_collector_instance.garbage = sinon.stub().resolves();

      testModel.find.returns(Promise.resolve(null));
      testModel.find.withArgs({id: new_data[0].id}).returns(Promise.resolve(undefined));
      testModel.find.withArgs({id: new_data[1].id}).returns(Promise.resolve(old_db_data[0]));
      testModel.findOneAndUpdate.withArgs({id: new_data[0].id}).returns(Promise.reject());
      testModel.findOneAndUpdate.withArgs({id: new_data[1].id}).returns(Promise.resolve(new_data[1]));

      let error_spy = sinon.spy();

      let error_handle = sinon.spy();
      let update_handler = sinon.spy();
      let create_handler = sinon.spy();

      test_collector_instance.on('update', update_handler);
      test_collector_instance.on('create', create_handler);
      test_collector_instance.on('error', error_handle);

      let ret_promise = test_collector_instance.run().catch(error_spy);

      it('Should call collect', (done) => {
        ret_promise.then(() => {
          sinon.assert.calledOnce(test_collector_instance.collect);
        }).then(done).catch(done);
      });
      it('Should emit update just once', (done) => {
        ret_promise.then(() => {
          sinon.assert.calledOnce(update_handler);
        }).then(done).catch(done);
      });
      it('Should not emit create', (done) => {
        ret_promise.then(() => {
          sinon.assert.notCalled(create_handler);
        }).then(done).catch(done);
      });
      it('Should emit update', (done) => {
        ret_promise.then(() => {
          sinon.assert.calledOnce(update_handler);
        }).then(done).catch(done);
      });
      it('Should emit error event with CollectorDatabaseError', (done) => {
        ret_promise.then(() => {
          sinon.assert.calledOnce(error_handle);
          assert.instanceOf(error_handle.lastCall.args[0],errors.CollectorDatabaseError);
        }).then(done).catch(done);
      });
      it('Should call garbage', (done) => {
        ret_promise.then(() => {
          sinon.assert.calledOnce(test_collector_instance.garbage);
        }).then(done).catch(done);
      });
      it('Should not set initialize_flag to false', (done) => {
        ret_promise.then(() => {
          expect(test_collector_instance.initialize_flag).to.be.equal(true);
        }).then(done).catch(done);
      });

    });
  });

});