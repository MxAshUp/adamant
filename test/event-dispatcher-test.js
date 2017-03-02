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
  const test_1_dispatch_cb = sinon.spy();
  const test_1_revert_cb = sinon.spy();
  const test_2_dispatch_cb = sinon.spy();
  const test_2_revert_cb = sinon.spy();
  const test_3_dispatch_cb = sinon.spy();
  const test_3_revert_cb = sinon.spy();
  const test_1_config = {
    default_args: {},
    event_name: 'test.event_1',
    supports_revert: true,
    version: '0.1',
    plugin_name: '_test',
    dispatch: test_1_dispatch_cb,
    revert: test_1_revert_cb,
    instance_id: '1'
  };
  const test_2_config = {
    default_args: {},
    event_name: 'test.event_2',
    supports_revert: true,
    version: '0.1',
    plugin_name: '_test',
    dispatch: test_2_dispatch_cb,
    revert: test_2_revert_cb,
    instance_id: '2'
  };
  const test_3_config = {
    default_args: {},
    event_name: 'test.event_2',
    supports_revert: true,
    version: '0.1.5',
    plugin_name: '_test',
    dispatch: test_3_dispatch_cb,
    revert: test_3_revert_cb,
    instance_id: '3'
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
      sinon.assert.calledOnce(test_1_dispatch_cb);
      sinon.assert.calledWith(test_1_dispatch_cb, sample_data);
    });

    it('Should call revert with data', () => {

      const sample_revert_data = Math.random();
      test_handler_1.revert(sample_revert_data);
      sinon.assert.calledOnce(test_1_revert_cb);
      sinon.assert.calledWith(test_1_revert_cb, sample_revert_data);

    });

    it('Should throw error if supports_revert is false and revert() is called', () => {
        const test_handler_1 = new EventHandler({
          default_args: {},
          event_name: 'test.event_2',
          supports_revert: false,
          version: '0.1.5',
          plugin_name: '_test',
          dispatch: null,
          instance_id: '3'
        });
        expect(test_handler_1.revert.bind(null)).to.throw(Error);
    });

  });

  describe('Event Dispatcher', () => {

    const dispatcher = new EventDispatcher();

    dispatcher.load_event_handler(test_handler_1);
    dispatcher.load_event_handler(test_handler_2);
    dispatcher.load_event_handler(test_handler_3);

    // Create some random data to enqueue event with
    const test_1_event_data = Math.random();
    const test_2_event_data = Math.random();
    const test_3_event_data = Math.random();

    dispatcher.enqueue_event('test.to_remove_event', test_3_event_data);
    dispatcher.enqueue_event('test.event_1', test_1_event_data);
    dispatcher.enqueue_event('test.event_2', test_2_event_data);

    afterEach(() => {
      test_1_dispatch_cb.reset();
      test_1_revert_cb.reset();
      test_2_dispatch_cb.reset();
      test_2_revert_cb.reset();
      test_3_dispatch_cb.reset();
      test_3_revert_cb.reset();
    });

    it('Should add event handler to dispatcher', () => {
      // Check dispatcher event handler array
      expect(dispatcher.event_handlers).to.contain(test_handler_1);
      expect(dispatcher.event_handlers).to.contain(test_handler_2);
    });

    it('Should return event handler by instance_id', () => {
      expect(dispatcher.get_event_handler('2')).to.deep.equal(test_handler_2);
    });

    it('Should fail to add event handler to dispatcher (duplicate ids)', () => {
      // Try to load same handler again, should throw error
      expect(dispatcher.load_event_handler.bind(null, test_handler_1)).to.throw(Error);
    });

    it('Should enqueue 3 events', () => {
      expect(dispatcher.event_queue_count).to.equal(3);
    });

    it('Should remove event 3 data from queue', () => {
      expect(dispatcher.shift_event()).to.deep.equal({
        event: 'test.to_remove_event',
        data: test_3_event_data
      });
      expect(dispatcher.event_queue_count).to.equal(2);
    });

    it('Should dispatch event with one handler', (done) => {
      const test_event_data = Math.random();
      let ret = dispatcher.dispatch_event('test.event_1',test_event_data).then(() => {
        // Event handler dispatch should have been called with correct args
        sinon.assert.callCount(test_1_dispatch_cb, 1);
        sinon.assert.calledWith(test_1_dispatch_cb, test_event_data);
      }).then(done).catch(done);

      //Make sure promise was fulfilled
      assert.isFulfilled(ret);

    });

    it('Should dispatch event with two handlers', (done) => {
      const test_event_data = Math.random();
      let ret = dispatcher.dispatch_event('test.event_2', test_event_data).then(() => {
        // Event handler dispatch should have been called with correct args
        sinon.assert.callCount(test_2_dispatch_cb, 1);
        sinon.assert.callCount(test_3_dispatch_cb, 1);
        sinon.assert.calledWith(test_2_dispatch_cb, test_event_data);
        sinon.assert.calledWith(test_3_dispatch_cb, test_event_data);

      }).then(done).catch(done);

      //Make sure promise was filfilled
      assert.isFulfilled(ret);

    });

    it('Should revert event', (done) => {
      const test_event_data = Math.random();
      let ret = dispatcher.revert_event('3', test_event_data).then(() => {
        // Only 1 event handler should have been dispatched
        sinon.assert.callCount(test_3_revert_cb, 1);
        // Event handler dispatch should have been called with correct args
        sinon.assert.calledWith(test_3_revert_cb, test_event_data);

      }).then(done).catch(done);

      //Make sure promise was filfilled
      assert.isFulfilled(ret);

    });

  });

});