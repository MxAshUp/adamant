const
  // Test tools
  chai = require('chai'),
  expect = chai.expect,
  assert = chai.assert,
  chaiSubset = require('chai-subset'),
  chaiAsPromised = require("chai-as-promised"),
  rewire = require('rewire'),
  sinon = require('sinon'),
  // Modules to test
  EventHandler = require('../include/event-handler'),
  EventDispatcher = require('../include/event-dispatcher');

chai.use(chaiAsPromised);
chai.use(chaiSubset);

describe('Event System - ', () => {

  // Need some spies and a mock handler for running tests
  const test_1_dispatch_db = sinon.spy();
  const test_1_revert_cb = sinon.spy();
  const test_2_dispatch_db = sinon.spy();
  const test_2_revert_cb = sinon.spy();
  const test_3_dispatch_db = sinon.spy();
  const test_3_revert_cb = sinon.spy();
  const test_1_config = {
    default_args: {},
    event_name: 'test.event_1',
    supports_revert: true,
    version: '0.1',
    plugin_name: '_test',
    dispatch: test_1_dispatch_db,
    revert: test_1_revert_cb,
    instance_id: '1'
  };
  const test_2_config = {
    default_args: {},
    event_name: 'test.event_2',
    supports_revert: true,
    version: '0.1',
    plugin_name: '_test',
    dispatch: test_2_dispatch_db,
    revert: test_2_revert_cb,
    instance_id: '1'
  };
  const test_3_config = {
    default_args: {},
    event_name: 'test.event_2',
    supports_revert: true,
    version: '0.1.5',
    plugin_name: '_test',
    dispatch: test_3_dispatch_db,
    revert: test_3_revert_cb,
    instance_id: '1'
  };
  const test_handler_1 = new EventHandler(test_1_config);
  const test_handler_2 = new EventHandler(test_2_config);
  const test_handler_3 = new EventHandler(test_3_config);

  describe('Event Handler', () => {

    it('Should create two Event Handler instances', () => {
      expect(test_handler_1).to.be.instanceof(EventHandler);
      expect(test_handler_2).to.be.instanceof(EventHandler);
    });

    it('Should have correct properties', () => {
      expect(test_handler_1).to.containSubset(test_1_config);
      expect(test_handler_2).to.containSubset(test_2_config);
    });

    it('Should call dispatch with data', () => {
      const sample_data = Math.random();
      test_handler_1.dispatch(sample_data);
      expect(test_1_dispatch_db.calledOnce).to.be.true;
      expect(test_1_dispatch_db.calledWith(sample_data)).to.be.true;
    });

    it('Should call revert with data', () => {

      const sample_revert_data = Math.random();
      test_handler_1.revert(sample_revert_data);
      expect(test_1_revert_cb.calledOnce).to.be.true;
      expect(test_1_revert_cb.calledWith(sample_revert_data)).to.be.true;

    });
  });

  describe('Event Dispatcher', () => {

    const dispatcher = new EventDispatcher();

    dispatcher.load_event_handler(test_handler_1);
    dispatcher.load_event_handler(test_handler_2);

    // Create some random data to enqueue event with
    const test_1_event_data = Math.random();
    const test_2_event_data = Math.random();
    const test_3_event_data = Math.random();

    dispatcher.enqueue_event('test.event_1', test_1_event_data);
    dispatcher.enqueue_event('test.event_2', test_2_event_data);
    dispatcher.enqueue_event('test.to_remove_event', test_3_event_data);


    it('Should add event handler to dispatcher', () => {
      // Check dispatcher event handler array
      expect(dispatcher.event_handlers).to.contain(test_handler_1);
      expect(dispatcher.event_handlers).to.contain(test_handler_2);
    });

    it('Should fail to add event handler to dispatcher (duplicate ids)', () => {
      // Try to load same handler again, should throw error
      expect(() => {
        dispatcher.load_event_handler(test_handler_1);
      }).to.throw(Error);
    });

    it('Should enqueue 3 events', () => {
      expect(dispatcher.event_queue_count).to.equal(3);
    });

    it('Should remove event 3 data from queue', () => {
      expect(dispatcher.shift_event()).to.deep.equal({
        event: test.to_remove_event,
        data: test_3_event_data
      });
      expect(dispatcher.event_queue_count).to.equal(2);
    });

    it('Should dispatch event with one handler', (done) => {
      const test_event_data = Math.random();
      dispatcher.dispatch_event('test.event_1',test_event_data).then(() => {
        // Event handler dispatch should have been called with correct args
        expect(test_1_dispatch_db.firstCall.args).to.equal([test_event_data]);
        // Only 1 event handler should have been dispatched
        expect(test_1_dispatch_db.callCount).to.equal(1);
        done();
      }).catch(done);

      //Make sure promise was filfilled
      assert.isFulfilled(ret);

    });

    it('Should dispatch event with two handlers', (done) => {
      const test_event_data = Math.random();
      dispatcher.dispatch_event('test.event_2',test_event_data).then(() => {
        // Event handler dispatch should have been called with correct args
        expect(test_2_dispatch_db.firstCall.args).to.equal([test_event_data]);
        expect(test_3_dispatch_db.firstCall.args).to.equal([test_event_data]);
        // Only 1 event handler should have been dispatched
        expect(test_2_dispatch_db.callCount).to.equal(1);
        expect(test_3_dispatch_db.callCount).to.equal(1);
        done();
      }).catch(done);

      //Make sure promise was filfilled
      assert.isFulfilled(ret);

    });

    it('Should revert event', (done) => {
      const test_event_data = Math.random();
      dispatcher.revert_event(3, test_event_data).then(() => {
        // Event handler dispatch should have been called with correct args
        expect(test_3_revert_cb.firstCall.args).to.equal([test_event_data]);
        // Only 1 event handler should have been dispatched
        expect(test_3_revert_cb.callCount).to.equal(1);
        done();
      }).catch(done);

      //Make sure promise was filfilled
      assert.isFulfilled(ret);

    });

  });

});