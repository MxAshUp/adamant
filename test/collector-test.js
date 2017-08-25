const // Test tools
  chai = require('chai'),
  expect = chai.expect,
  assert = chai.assert,
  chaiAsPromised = require('chai-as-promised'),
  rewire = require('rewire'),
  sinon = require('sinon'),
  _ = require('lodash'),
  errors = require('../libs/errors'),
  mongooseMock = require('mongoose-mock'),
  // Modules to test
  Collector = rewire('../libs/collector');

chai.use(chaiAsPromised);
chai.should();

let get_model_by_name_stub = sinon.stub();

// Rewire database stuff
Collector.__set__('mongoose', mongooseMock);

console_log_spy = sinon.stub().callsFake(console.log);
Collector.__set__("console", {log: console_log_spy});

var schema = mongooseMock.Schema({ _id: String });
var testModel = mongooseMock.model('test.test_model', schema);

get_model_by_name_stub.withArgs('test.test_model').returns({
  name: 'test.test_model',
  schema: schema,
});

describe('Collector Class', () => {
  testModel.findOneAndUpdate.returns(Promise.resolve());
  testModel.findOneAndRemove.returns(Promise.resolve());

  // Test Subclass of Collector
  class TestCollectorClass extends Collector {
    constructor() {
      super();

      // Collector properties
      this.plugin_name = '_Test';
      this.model_name = 'test.test_model';
    }
  }


  it('Should construct an instance', () => {
    expect(() => new TestCollectorClass()).to.not.throw();
  });

  describe('Default behavior of override functions', () => {
    let instance = new TestCollectorClass();
    it('Initialize should return nothing', () => {
      expect(instance.initialize()).to.be.undefined;
    });
    it('Prepare should return nothing', () => {
      expect(instance.prepare()).to.be.undefined;
    });
    it('Garbage should garbage nothing', () => {
      expect(instance.garbage()).to.be.undefined;
    });
    it('Collect should be a generator that yields each item in prepared_data', () => {
      const arr = [Math.random(), Math.random(), Math.random()];
      let count = 0;
      const iter = instance.collect(arr);
      expect(iter.next().value).to.equal(arr[0]);
      expect(iter.next().value).to.equal(arr[1]);
      expect(iter.next().value).to.equal(arr[2]);
    });
  });

  describe('run', () => {
    after(() => {
      testModel.findOneAndUpdate.reset();
      testModel.findOneAndRemove.reset();
      testModel.findOne.reset();
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

      it('Should call initialize()', () => {
        return ret_promise.then(() => {
          sinon.assert.calledOnce(test_collector_instance.initialize);
        });
      });
      it('Should call prepare()', () => {
        return ret_promise.then(() => {
          sinon.assert.calledOnce(test_collector_instance.prepare);
        });
      });
      it('Should call collect()', () => {
        return ret_promise.then(() => {
          sinon.assert.calledOnce(test_collector_instance.collect);
        });
      });
      it('Should call garbage()', () => {
        return ret_promise.then(() => {
          sinon.assert.calledOnce(test_collector_instance.garbage);
        });
      });
      it('Should not emit insert or update events', () => {
        return ret_promise.then(() => {
          sinon.assert.notCalled(update_handler);
          sinon.assert.notCalled(create_handler);
        });
      });
    });

    describe('Run when already initialized', () => {
      let test_collector_instance = new TestCollectorClass();
      test_collector_instance.initialize = sinon.spy();
      test_collector_instance.collect = sinon.stub().returns([]);
      test_collector_instance.prepare = sinon.stub().resolves({});
      test_collector_instance.garbage = sinon.stub().resolves();
      let ret_promise = test_collector_instance
        .run()
        .then(test_collector_instance.run.bind(test_collector_instance));

      let update_handler = sinon.spy();
      let create_handler = sinon.spy();

      test_collector_instance.on('update', update_handler);
      test_collector_instance.on('create', create_handler);

      it('Should run initialize only once', () => {
        return ret_promise.then(() => {
          sinon.assert.calledOnce(test_collector_instance.initialize);
        });
      });
      it('Should run prepare twice', () => {
        return ret_promise.then(() => {
          sinon.assert.calledTwice(test_collector_instance.prepare);
        });
      });
      it('Should run collect twice', () => {
        return ret_promise.then(() => {
          sinon.assert.calledTwice(test_collector_instance.collect);
        });
      });
      it('Should run garbage twice', () => {
        return ret_promise.then(() => {
          sinon.assert.calledTwice(test_collector_instance.garbage);
        });
      });
    });

    describe('Inserting/Updating documents', () => {
      // Data currently in the db
      let old_db_data = [{ _id: '1', foo: 'bar' }, { _id: '3', foo: 'bar3' }];

      // Data to put in database
      let new_data = [
        { _id: '1', foo: 'bar' },
        { _id: '2', foo: 'bar2' },
        { _id: '3', foo: 'updated' },
        { foo: 'so bar' },
      ];

      new_data.forEach(function(data) {
        data.toObject = function () {
          const ret = Object.assign({}, data);
          delete ret.toObject;
          return ret;
        };
      });

      let test_collector_instance = new TestCollectorClass();
      test_collector_instance.initialize = sinon.spy();
      test_collector_instance.prepare = sinon.stub().resolves({});
      test_collector_instance.collect = sinon.stub().returns(new_data);
      test_collector_instance.garbage = sinon.stub().resolves();

      testModel.findOne.returns(Promise.resolve(null));
      testModel.findOne
        .withArgs({ _id: new_data[0]._id })
        .returns(Promise.resolve(old_db_data[0]));
      testModel.findOne
        .withArgs({ _id: new_data[1]._id })
        .returns(Promise.resolve(null));
      testModel.findOne
        .withArgs({ _id: new_data[2]._id })
        .returns(Promise.resolve(old_db_data[1]));
      testModel.findOneAndUpdate
        .withArgs({ _id: new_data[0]._id })
        .returns(Promise.resolve(new_data[0]));
      testModel.findOneAndUpdate
        .withArgs({ _id: new_data[1]._id })
        .returns(Promise.resolve(new_data[1]));
      testModel.findOneAndUpdate
        .withArgs({ _id: new_data[2]._id })
        .returns(Promise.resolve(new_data[2]));

      let error_spy = sinon.spy();

      let update_handler = sinon.spy();
      let create_handler = sinon.spy();
      let error_handler = sinon.spy();

      test_collector_instance.on('update', update_handler);
      test_collector_instance.on('create', create_handler);
      test_collector_instance.on('error', error_handler);

      let ret_promise = test_collector_instance.run().catch(error_spy);

      it('Should not throw errors', () => {
        return ret_promise.then(() => {
          sinon.assert.notCalled(error_spy);
        });
      });

      it('Should call collect', () => {
        return ret_promise.then(() => {
          sinon.assert.calledOnce(test_collector_instance.collect);
        });
      });

      it('Should not do anything with item 1, no data has changed', () => {
        return ret_promise.then(() => {
          sinon.assert.neverCalledWith(update_handler, new_data[0]);
          sinon.assert.neverCalledWith(create_handler, new_data[0]);
        });
      });

      it('Should insert data with item 2, data is new', () => {
        return ret_promise.then(() => {
          sinon.assert.calledWith(create_handler, new_data[1]);
          sinon.assert.neverCalledWith(update_handler, new_data[1]);
        });
      });

      it('Should update data with item 3', () => {
        return ret_promise.then(() => {
          sinon.assert.calledWith(update_handler,new_data[2]);
        });
      });

      it('Should call findOneAndUpdate with upsert:true', () => {
        return ret_promise.then(() => {
          expect(testModel.findOneAndUpdate.lastCall.args[2].upsert).to.equal(
            true
          );
        });
      });

      it('Should call findOneAndUpdate with setDefaultsOnInsert:true', () => {
        return ret_promise.then(() => {
          expect(
            testModel.findOneAndUpdate.lastCall.args[2].setDefaultsOnInsert
          ).to.equal(true);
        });
      });

      it('Should call findOneAndUpdate with new:true', () => {
        return ret_promise.then(() => {
          expect(testModel.findOneAndUpdate.lastCall.args[2].new).to.equal(
            true
          );
        });
      });

      it('Should throw error "Primary key not specified."', () => {
        return ret_promise.then(() => {
          expect(error_handler.lastCall.args[0]).to.be.instanceOf(Error);
          expect(error_handler.lastCall.args[0].message).to.equal(
            'Primary key not specified.'
          );
        });
      });
    });

    describe('Removing documents', () => {
      // Data to put in database
      let remove_data = [{ _id: '9', foo: 'bar' }, { _id: '11', foo: 'rab' }];

      let test_collector_instance = new TestCollectorClass();
      test_collector_instance.initialize = sinon.spy();
      test_collector_instance.prepare = sinon.stub().resolves({});
      test_collector_instance.collect = sinon.stub().returns([]);
      test_collector_instance.garbage = sinon
        .stub()
        .resolves([
          { _id: remove_data[0]._id },
          { _id: remove_data[1]._id },
          { _id: 'notfound' },
        ]);

      testModel.findOneAndRemove
        .withArgs({ _id: remove_data[0]._id })
        .returns(Promise.resolve(remove_data[0]));
      testModel.findOneAndRemove
        .withArgs({ _id: remove_data[1]._id })
        .returns(Promise.resolve(remove_data[1]));
      testModel.findOneAndRemove
        .withArgs({ _id: 'notfound' })
        .returns(Promise.resolve(null));

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

      it('Should call garbage', () => {
        return ret_promise.then(() => {
          sinon.assert.calledOnce(test_collector_instance.garbage);
        });
      });
      it('Should emit only 2 remove events', () => {
        return ret_promise.then(() => {
          sinon.assert.calledTwice(remove_handler);
        });
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

      it('Should call initialize()', () => {
        return ret_promise.then(() => {
          sinon.assert.calledOnce(test_collector_instance.initialize);
          sinon.assert.threw(test_collector_instance.initialize);
        });
      });
      it('Should reject with CollectorInitializeError', () => {
        return ret_promise.then(() => {
          assert.instanceOf(
            error_spy.lastCall.args[0],
            errors.CollectorInitializeError
          );
        });
      });
      it('Should set initialize_flag to false', () => {
        return ret_promise.then(() => {
          expect(test_collector_instance.initialize_flag).to.be.equal(false);
        });
      });
      it('Should not call prepare, collect, or garbage', () => {
        return ret_promise.then(() => {
          sinon.assert.notCalled(test_collector_instance.prepare);
          sinon.assert.notCalled(test_collector_instance.collect);
          sinon.assert.notCalled(test_collector_instance.garbage);
        });
      });
    });
    describe('with error thrown in prepare()', () => {
      let test_collector_instance = new TestCollectorClass();
      test_collector_instance.initialize = sinon
        .stub()
        .returns(Promise.resolve());
      test_collector_instance.prepare = sinon.stub().throws();
      test_collector_instance.collect = sinon.spy();
      test_collector_instance.garbage = sinon.spy();

      let update_handler = sinon.spy();
      let create_handler = sinon.spy();

      test_collector_instance.on('update', update_handler);
      test_collector_instance.on('create', create_handler);

      let error_spy = sinon.spy();

      let ret_promise = test_collector_instance.run().catch(error_spy);

      it('Should call prepare', () => {
        return ret_promise.then(() => {
          sinon.assert.calledOnce(test_collector_instance.prepare);
          sinon.assert.threw(test_collector_instance.prepare);
        });
      });
      it('Should not call collect or garbage', () => {
        return ret_promise.then(() => {
          sinon.assert.notCalled(test_collector_instance.collect);
          sinon.assert.notCalled(test_collector_instance.garbage);
        });
      });
      it('Should reject with error', () => {
        return ret_promise.then(() => {
          assert.instanceOf(error_spy.lastCall.args[0], Error);
        });
      });
      it('Should set initialize_flag to false', () => {
        return ret_promise.then(() => {
          expect(test_collector_instance.initialize_flag).to.be.equal(false);
        });
      });
    });
    describe('with reject thrown in collect', () => {
      // Data currently in the db
      let old_db_data = [{ _id: '4', foo: 'barb' }, { _id: '6', foo: 'bar3b' }];

      // Data to put in database
      let new_data = [
        { _id: '4', foo: 'barb' },
        { _id: '5', foo: 'bar2b' },
        { _id: '6', foo: 'updatedb' },
      ];

      new_data.forEach(function(data) {
        data.toObject = function () {
          const ret = Object.assign({}, data);
          delete ret.toObject;
          return ret;
        };
      });

      let test_collector_instance = new TestCollectorClass();
      test_collector_instance.initialize = sinon.spy();
      test_collector_instance.prepare = sinon.stub().resolves({});
      test_collector_instance.collect = sinon
        .stub()
        .returns([new_data[0], Promise.reject(new Error()), new_data[2]]);
      test_collector_instance.garbage = sinon.stub().resolves();

      testModel.findOne.returns(Promise.resolve(null));
      testModel.findOne
        .withArgs({ _id: new_data[0]._id })
        .returns(Promise.resolve(old_db_data[0]));
      testModel.findOne
        .withArgs({ _id: new_data[1]._id })
        .returns(Promise.resolve(null));
      testModel.findOne
        .withArgs({ _id: new_data[2]._id })
        .returns(Promise.resolve(old_db_data[1]));
      testModel.findOneAndUpdate
        .withArgs({ _id: new_data[0]._id })
        .returns(Promise.resolve(new_data[0]));
      testModel.findOneAndUpdate
        .withArgs({ _id: new_data[2]._id })
        .returns(Promise.resolve(new_data[2]));

      let error_spy = sinon.spy();

      let error_handle = sinon.spy();
      let update_handler = sinon.spy();
      let create_handler = sinon.spy();

      test_collector_instance.on('update', update_handler);
      test_collector_instance.on('create', create_handler);
      test_collector_instance.on('error', error_handle);

      let ret_promise = test_collector_instance.run().catch(error_spy);

      it('Should call collect', () => {
        return ret_promise.then(() => {
          sinon.assert.calledOnce(test_collector_instance.collect);
        });
      });
      it('Should call update just once', () => {
        return ret_promise.then(() => {
          sinon.assert.calledOnce(update_handler);
        });
      });
      it('Should emit error event', () => {
        return ret_promise.then(() => {
          sinon.assert.calledOnce(error_handle);
        });
      });
      it('Should call garbage', () => {
        return ret_promise.then(() => {
          sinon.assert.calledOnce(test_collector_instance.garbage);
        });
      });
      it('Should not set initialize_flag to false', () => {
        return ret_promise.then(() => {
          expect(test_collector_instance.initialize_flag).to.be.equal(true);
        });
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

      it('Should call collect and throw error', () => {
        return ret_promise.then(() => {
          sinon.assert.calledOnce(test_collector_instance.collect);
          sinon.assert.threw(test_collector_instance.collect);
        });
      });
      it('Should not call garbage', () => {
        return ret_promise.then(() => {
          sinon.assert.notCalled(test_collector_instance.garbage);
        });
      });
      it('Should not emit insert or update event', () => {
        return ret_promise.then(() => {
          sinon.assert.notCalled(update_handler);
          sinon.assert.notCalled(create_handler);
        });
      });
      it('Should not emit error event (error event is a per-document basis)', () => {
        return ret_promise.then(() => {
          sinon.assert.notCalled(error_handle);
        });
      });
      it('Should set initialize_flag to false', () => {
        return ret_promise.then(() => {
          expect(test_collector_instance.initialize_flag).to.be.equal(false);
        });
      });
      it('Should reject run with Error', () => {
        return ret_promise.then(() => {
          sinon.assert.calledOnce(error_spy);
        });
      });
    });
    describe('With db error', () => {
      // Data currently in the db
      let old_db_data = [{ _id: '8', foo: 'bar3b' }];

      // Data to put in database
      let new_data = [{ _id: '7', foo: 'bar2b' }, { _id: '8', foo: 'updatedb' }];

      new_data.forEach(function(data) {
        data.toObject = function () {
          const ret = Object.assign({}, data);
          delete ret.toObject;
          return ret;
        };
      });

      let test_collector_instance = new TestCollectorClass();
      test_collector_instance.initialize = sinon.spy();
      test_collector_instance.prepare = sinon.stub().resolves({});
      test_collector_instance.collect = sinon
        .stub()
        .returns([new_data[0], new_data[1]]);
      test_collector_instance.garbage = sinon.stub().resolves();

      testModel.findOne.returns(Promise.resolve(null));
      testModel.findOne
        .withArgs({ _id: new_data[0]._id })
        .returns(Promise.resolve(null));
      testModel.findOne
        .withArgs({ _id: new_data[1]._id })
        .returns(Promise.resolve(old_db_data[0]));
      testModel.findOneAndUpdate
        .withArgs({ _id: new_data[0]._id })
        .returns(Promise.reject());
      testModel.findOneAndUpdate
        .withArgs({ _id: new_data[1]._id })
        .returns(Promise.resolve(new_data[1]));

      let error_spy = sinon.spy();

      let error_handle = sinon.spy();
      let update_handler = sinon.spy();
      let create_handler = sinon.spy();

      test_collector_instance.on('update', update_handler);
      test_collector_instance.on('create', create_handler);
      test_collector_instance.on('error', error_handle);

      let ret_promise = test_collector_instance.run().catch(error_spy);

      it('Should call collect', () => {
        return ret_promise.then(() => {
          sinon.assert.calledOnce(test_collector_instance.collect);
        });
      });
      it('Should emit update just once', () => {
        return ret_promise.then(() => {
          sinon.assert.calledOnce(update_handler);
        });
      });
      it('Should not emit create', () => {
        return ret_promise.then(() => {
          sinon.assert.notCalled(create_handler);
        });
      });
      it('Should emit update', () => {
        return ret_promise.then(() => {
          sinon.assert.calledOnce(update_handler);
        });
      });
      it('Should emit error event with CollectorDatabaseError', () => {
        return ret_promise.then(() => {
          sinon.assert.calledOnce(error_handle);
          assert.instanceOf(
            error_handle.lastCall.args[0],
            errors.CollectorDatabaseError
          );
        });
      });
      it('Should call garbage', () => {
        return ret_promise.then(() => {
          sinon.assert.calledOnce(test_collector_instance.garbage);
        });
      });
      it('Should not set initialize_flag to false', () => {
        return ret_promise.then(() => {
          expect(test_collector_instance.initialize_flag).to.be.equal(true);
        });
      });
    });
  });

  it('Should never call console.log', () => {
    expect(console_log_spy.callCount).to.equal(0);
  });
});
