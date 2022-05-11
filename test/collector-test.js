// Test tools
const chai = require('chai');
const expect = chai.expect;
const assert = chai.assert;
const chaiAsPromised = require('chai-as-promised');
const rewire = require('rewire');
const sinon = require('sinon');
const _ = require('lodash');
const errors = require('../libs/errors');
const mongooseMock = require('mongoose-mock');
// Modules to test
const CollectorDatabaseError = require('../libs/errors').CollectorDatabaseError;
const Collector = rewire('../libs/components/collector');

chai.use(chaiAsPromised);
chai.should();

// Rewire database stuff
Collector.__set__('mongoose', mongooseMock);

var schema = mongooseMock.Schema({ _id: String });
var testModel = mongooseMock.model('test.test_model', schema);

describe('Collector Class', () => {
  testModel.findOneAndUpdate.returns(Promise.resolve());
  testModel.findOneAndRemove.returns(Promise.resolve());

  // Test Subclass of Collector
  class TestCollectorClass extends Collector {
    constructor() {
      super({model_name: 'test.test_model', run_report_enabled: true});
    }
  }


  it('Should construct an instance', () => {
    new TestCollectorClass();
  });

  it('Should throw error if model_name not specified', () => {
    expect(() => {
      new Collector();
    }).to.throw(Error, 'Missing required parameter: model_name');
  });

  describe('Default behavior of override functions', () => {
    const instance = new TestCollectorClass();
    it('Initialize should return nothing', () => {
      expect(instance.initialize()).to.be.undefined;
    });
    it('Prepare should return nothing', () => {
      expect(instance.prepare()).to.be.undefined;
    });
    it('Garbage should garbage nothing', () => {
      expect(instance.garbage()).to.be.undefined;
    });
    it('Compare should deep match two objects, return true', () => {
      expect(instance.compare({
        someField: '12312',
        anItem: [
          2,
          1,
          3
        ]
      }, {
        someField: '12312',
        anItem: [
          1,
          2,
          3
        ]
      })).to.be.true;
    });
    it('Compare should deep match two objects, return flase', () => {
      expect(instance.compare({
        someField: '12312',
        anItem: [
          'a',
          'v'
        ]
      }, {
        someField: 23,
        anItem: [
          1,
          2,
          3
        ]
      })).to.be.false;
    });
    it('Should return a promise that resolves after events are emitted for data', () => {
      const arr = [Math.random(), Math.random(), Math.random()];
      let count = 0;
      const data_spy = sinon.spy();
      instance.addListener('data', data_spy);
      return instance.collect(arr).then(() => {
        sinon.assert.callCount(data_spy, 3);
        sinon.assert.calledWith(data_spy, arr[0]);
        sinon.assert.calledWith(data_spy, arr[1]);
        sinon.assert.calledWith(data_spy, arr[2]);
      });
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
      let done_handler = sinon.spy();

      test_collector_instance.on('update', update_handler);
      test_collector_instance.on('create', create_handler);
      test_collector_instance.on('done', done_handler);

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
      it('Should emit done', () => {
        return ret_promise.then(() => {
          sinon.assert.calledOnce(done_handler);
        });
      });
      it('Should emit done with empty object parameters', () => {
        return ret_promise.then(() => {
          sinon.assert.calledWith(done_handler, sinon.match({collect: {}, garbage: {}}));
        });
      });
    });

    describe('Collect as a generator function', () => {
      it('Should return a promise that resolves after events are emitted for data', () => {
        // Data to put in database
        const new_data = [
          { _id: '11', foo: 'bar' },
          { _id: '12', foo: 'bar2' },
          { _id: '13', foo: 'updated' },
        ];

        testModel.findOneAndUpdate
          .withArgs({ _id: new_data[0]._id })
          .returns(Promise.resolve(new_data[0]));
        testModel.findOneAndUpdate
          .withArgs({ _id: new_data[1]._id })
          .returns(Promise.resolve(new_data[1]));
        testModel.findOneAndUpdate
          .withArgs({ _id: new_data[2]._id })
          .returns(Promise.resolve(new_data[2]));

        const test_collector_instance = new TestCollectorClass();
        test_collector_instance.prepare = sinon.stub().resolves(new_data);
        test_collector_instance.garbage = sinon.stub().resolves();
        test_collector_instance.collect = function*(prepared_data) {
          for(let i in prepared_data) {
            yield prepared_data[i];
          }
        }
        const create_handler = sinon.spy();
        test_collector_instance.on('create', create_handler);

        return test_collector_instance.run().then(() => {
          sinon.assert.callCount(create_handler, 3);
          sinon.assert.calledWith(create_handler, new_data[0]);
          sinon.assert.calledWith(create_handler, new_data[1]);
          sinon.assert.calledWith(create_handler, new_data[2]);
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

    describe('initializing model', () => {
      it('should reject with CollectorDatabaseError', () => {
        const test_collector_instance = new TestCollectorClass();
        test_collector_instance.initialize = sinon.spy();
        test_collector_instance.collect = sinon.stub().returns([]);
        test_collector_instance.prepare = sinon.stub().resolves({});
        test_collector_instance.garbage = sinon.stub().resolves();
        sinon.stub(mongooseMock, 'model').throws();
        expect(test_collector_instance.model).to.be.undefined;
        return test_collector_instance.run().should.be.rejectedWith(CollectorDatabaseError).then(mongooseMock.model.restore);
      });
      it('Should set model on first run', () => {
        const test_collector_instance = new TestCollectorClass();
        test_collector_instance.initialize = sinon.spy();
        test_collector_instance.collect = sinon.stub().returns([]);
        test_collector_instance.prepare = sinon.stub().resolves({});
        test_collector_instance.garbage = sinon.stub().resolves();
        expect(test_collector_instance.model).to.be.undefined;
        return test_collector_instance.run().then(() => {
          expect(test_collector_instance.model).to.not.be.undefined;
        });
      });
      it('Should not set model if initialize_flag is true', () => {
        const test_collector_instance = new TestCollectorClass();
        test_collector_instance.initialize = sinon.spy();
        test_collector_instance.collect = sinon.stub().returns([]);
        test_collector_instance.prepare = sinon.stub().resolves({});
        test_collector_instance.garbage = sinon.stub().resolves();
        test_collector_instance.initialize_flag = true;
        expect(test_collector_instance.model).to.be.undefined;
        return test_collector_instance.run().then(() => {
          expect(test_collector_instance.model).to.be.undefined;
        });
      });
    })

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
      let done_handler = sinon.spy();

      test_collector_instance.on('update', update_handler);
      test_collector_instance.on('create', create_handler);
      test_collector_instance.on('error', error_handle);
      test_collector_instance.on('remove', remove_handler);
      test_collector_instance.on('done', done_handler);

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
      it('Should not emit error', () => {
        return ret_promise.then(() => {
          sinon.assert.notCalled(error_handle);
        });
      });
      it('Should emit done', () => {
        return ret_promise.then(() => {
          sinon.assert.calledOnce(done_handler);
        });
      });
      it('Should emit done with correct counter parameter', () => {
        return ret_promise.then(() => {
          sinon.assert.calledWith(done_handler, sinon.match({
            collect: {},
            garbage: {
              success: 3,
            }
          }));
        });
      });
    });
    describe('Removing documents with database error', () => {
      // Data to put in database
      let remove_data = [{ _id: '29', foo: 'bar' }, { _id: '31', foo: 'rab' }];

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

      const mock_error = new Error(Math.random() + '');

      testModel.findOneAndRemove
        .withArgs({ _id: remove_data[0]._id })
        .returns(Promise.resolve(remove_data[0]));
      testModel.findOneAndRemove
        .withArgs({ _id: remove_data[1]._id })
        .returns(Promise.reject(mock_error));
      testModel.findOneAndRemove
        .withArgs({ _id: 'notfound' })
        .returns(Promise.resolve(null));

      let error_spy = sinon.spy();

      let error_handle = sinon.spy();
      let update_handler = sinon.spy();
      let create_handler = sinon.spy();
      let remove_handler = sinon.spy();
      let done_handler = sinon.spy();

      test_collector_instance.on('update', update_handler);
      test_collector_instance.on('create', create_handler);
      test_collector_instance.on('error', error_handle);
      test_collector_instance.on('remove', remove_handler);
      test_collector_instance.on('done', done_handler);

      let ret_promise = test_collector_instance.run().catch(error_spy);

      it('Should call garbage', () => {
        return ret_promise.then(() => {
          sinon.assert.calledOnce(test_collector_instance.garbage);
        });
      });
      it('Should emit only 1 remove event', () => {
        return ret_promise.then(() => {
          sinon.assert.calledOnce(remove_handler);
        });
      });
      it('Should emit error with CollectorDatabaseError', () => {
        return ret_promise.then(() => {
          expect(error_handle.lastCall.args[0]).to.be.instanceOf(CollectorDatabaseError);
        });
      });
      it('Should emit error with culprit of mock_error', () => {
        return ret_promise.then(() => {
          expect(error_handle.lastCall.args[0].culprit).to.equal(mock_error);
        });
      });
      it('Should emit done', () => {
        return ret_promise.then(() => {
          sinon.assert.calledOnce(done_handler);
        });
      });
      it('Should emit done with correct counter parameter', () => {
        return ret_promise.then(() => {
          sinon.assert.calledWith(done_handler, sinon.match({
            collect: {},
            garbage: {
              fail: 1,
              success: 2,
            }
          }));
        });
      });
    });
    describe('With error thrown in initialize()', () => {
      let test_collector_instance = new TestCollectorClass();
      test_collector_instance.initialize = sinon.stub().throws(new Error("No way jose"));
      test_collector_instance.prepare = sinon.spy();
      test_collector_instance.collect = sinon.spy();
      test_collector_instance.garbage = sinon.spy();

      let update_handler = sinon.spy();
      let create_handler = sinon.spy();
      let done_handler = sinon.spy();

      test_collector_instance.on('update', update_handler);
      test_collector_instance.on('create', create_handler);
      test_collector_instance.on('done', done_handler);

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
      it('Should emit done', () => {
        return ret_promise.then(() => {
          sinon.assert.calledOnce(done_handler);
        });
      });
      it('Should emit done with undefined counter parameter', () => {
        return ret_promise.then(() => {
          expect(done_handler.lastCall.args[0]).to.be.undefined;
        });
      });
    });
    describe('with error thrown in prepare()', () => {
      let test_collector_instance = new TestCollectorClass();
      test_collector_instance.initialize = sinon
        .stub()
        .returns(Promise.resolve());
      test_collector_instance.prepare = sinon.stub().throws(new Error("Crud!"));
      test_collector_instance.collect = sinon.spy();
      test_collector_instance.garbage = sinon.spy();

      let update_handler = sinon.spy();
      let create_handler = sinon.spy();
      let done_handler = sinon.spy();

      test_collector_instance.on('update', update_handler);
      test_collector_instance.on('create', create_handler);
      test_collector_instance.on('done', done_handler);

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
      it('Should emit done', () => {
        return ret_promise.then(() => {
          sinon.assert.calledOnce(done_handler);
        });
      });
      it('Should emit done with undefined counter parameter', () => {
        return ret_promise.then(() => {
          expect(done_handler.lastCall.args[0]).to.be.undefined;
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
        .returns([new_data[0], Promise.reject(new Error("A nice error")), new_data[2]]);
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
      let done_handler = sinon.spy();


      test_collector_instance.on('update', update_handler);
      test_collector_instance.on('create', create_handler);
      test_collector_instance.on('error', error_handle);
      test_collector_instance.on('done', done_handler);

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
      it('Should not throw error in run()', () => {
        return ret_promise.then(() => {
          sinon.assert.notCalled(error_spy);
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
      it('Should emit done', () => {
        return ret_promise.then(() => {
          sinon.assert.calledOnce(done_handler);
        });
      });
      it('Should emit done with correct counter parameter', () => {
        return ret_promise.then(() => {
          sinon.assert.calledWith(done_handler, sinon.match({
            collect: {
              success: 2,
              fail: 1
            },
            garbage: {}
          }));
        });
      });
    });
    describe('with error thrown in collect', () => {
      let test_collector_instance = new TestCollectorClass();
      test_collector_instance.initialize = sinon.spy();
      test_collector_instance.prepare = sinon.stub().resolves({});
      test_collector_instance.collect = sinon.stub().throws(new Error("Nadda"));
      test_collector_instance.garbage = sinon.stub().resolves();

      let error_spy = sinon.spy();

      let error_handle = sinon.spy();
      let update_handler = sinon.spy();
      let create_handler = sinon.spy();
      let done_handler = sinon.spy();

      test_collector_instance.on('update', update_handler);
      test_collector_instance.on('create', create_handler);
      test_collector_instance.on('error', error_handle);
      test_collector_instance.on('done', done_handler);

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
      it('Should emit done', () => {
        return ret_promise.then(() => {
          sinon.assert.calledOnce(done_handler);
        });
      });
      it('Should emit done with correct counter parameter', () => {
        return ret_promise.then(() => {
          expect(done_handler.lastCall.args[0]).to.be.undefined;
        });
      });
    });
    describe('run_report', () => {

      // Data to put in database
      let new_data = [{ _id: '555', foo: 'bar2b' }, { _id: '333', foo: 'updatedb' }];

      testModel.findOne.returns(Promise.resolve(null));
      testModel.findOne
        .withArgs({ _id: new_data[0]._id })
        .returns(Promise.resolve(null));
      testModel.findOne
        .withArgs({ _id: new_data[1]._id })
        .returns(Promise.resolve(null));

      testModel.findOneAndUpdate
        .withArgs({ _id: new_data[0]._id })
        .returns(Promise.resolve(new_data[0]));
      testModel.findOneAndUpdate
          .withArgs({ _id: new_data[1]._id })
          .returns(Promise.resolve(new_data[1]));

      let test_collector_instance = new TestCollectorClass();
      let timeri = 0;
      // Fake date.now()
      test_collector_instance.run_report_now_fn = () => timeri++;
      test_collector_instance.initialize = sinon.spy();
      test_collector_instance.prepare = sinon.stub().resolves({});
      test_collector_instance.collect = sinon
        .stub()
        .returns(new_data);

      let error_handle = sinon.spy();
      let update_handler = sinon.spy();
      let create_handler = sinon.spy();

      test_collector_instance.on('update', update_handler);
      test_collector_instance.on('create', create_handler);
      test_collector_instance.on('error', error_handle);

      it('Should match report', () => {
        return test_collector_instance.run().then(() => {
          expect(test_collector_instance.run_report).to.deep.equal(
            [
              [ 0, 'run' ],
              [ 1, 'run', 'initialize' ],
              [ 2, 'run', 'initialize', 'done' ],
              [ 3, 'run', 'prepare' ],
              [ 4, 'run', 'prepare', 'done' ],
              [ 5, 'run', 'collect' ],
              [ 6, 'run', 'collect', '555', 'done' ],
              [ 7, 'run', 'collect', '333', 'done' ],
              [ 8, 'run', 'collect', 'done' ],
              [ 9, 'run', 'done' ]
            ]
          );
        });
      });
    });
    describe('with non-objects returned in collect', () => {

      // Data to put in database. Clearly not objects
      let new_data = [
        true,
        'string',
        13,
      ];

      let test_collector_instance = new TestCollectorClass();
      test_collector_instance.initialize = sinon.spy();
      test_collector_instance.prepare = sinon.stub().resolves({});
      test_collector_instance.collect = sinon
        .stub()
        .returns(new_data);

      let error_handle = sinon.spy();
      let update_handler = sinon.spy();
      let create_handler = sinon.spy();

      test_collector_instance.on('update', update_handler);
      test_collector_instance.on('create', create_handler);
      test_collector_instance.on('error', error_handle);

      it('Should emit error events', () => {
        return test_collector_instance.run().then(() => {
          sinon.assert.calledThrice(error_handle);
          expect(error_handle.lastCall.args[0]).to.be.instanceOf(Error);
          expect(error_handle.lastCall.args[0].message).to.equal(
            'Data to insert is not an object.'
          );
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
      let done_handler = sinon.spy();

      test_collector_instance.on('update', update_handler);
      test_collector_instance.on('create', create_handler);
      test_collector_instance.on('error', error_handle);
      test_collector_instance.on('done', done_handler);

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
      it('Should emit done', () => {
        return ret_promise.then(() => {
          sinon.assert.calledOnce(done_handler);
        });
      });
      it('Should emit done with correct counter parameter', () => {
        return ret_promise.then(() => {
          sinon.assert.calledWith(done_handler, sinon.match({
            collect: {
              success: 1,
              fail: 1
            },
            garbage: {}
          }));
        });
      });
    });
  });
});
