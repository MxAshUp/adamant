const
  // Test tools
  chai = require('chai'),
  expect = chai.expect,
  assert = chai.assert,
  chaiSubset = require('chai-subset'),
  chaiAsPromised = require("chai-as-promised"),
  rewire = require('rewire'),
  sinon = require('sinon'),
  _ = require('lodash'),
  // Modules to test
  EventHandler = require('../include/event-handler'),
  EventDispatcher = require('../include/event-dispatcher'),
  Event = require('../include/event');

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
    revert: test_1_revert_cb
  };
  const test_2_config = {
    default_args: {},
    event_name: 'test.event_2',
    supports_revert: true,
    version: '0.1',
    plugin_name: '_test',
    dispatch: test_2_dispatch_cb,
    revert: test_2_revert_cb
  };
  const test_3_config = {
    default_args: {},
    event_name: 'test.event_2',
    supports_revert: true,
    version: '0.1.5',
    plugin_name: '_test',
    dispatch: test_3_dispatch_cb,
    revert: test_3_revert_cb
  };
  const test_handler_1 = new EventHandler(test_1_config);
  const test_handler_2 = new EventHandler(test_2_config);
  const test_handler_3 = new EventHandler(test_3_config);
  const test_handler_4 = new EventHandler(test_3_config);

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
        dispatch: null
      });
      expect(test_handler_1.revert.bind(null)).to.throw('Handler does not support revert.');
    });

  });

  describe('Event Dispatcher', () => {

    const dispatcher = new EventDispatcher();

    // Create some random data to enqueue event with
    const test_1_event_data = Math.random();
    const test_2_event_data = Math.random();
    const test_3_event_data = Math.random();

    let test_1_event = {};
    let test_2_event = {};
    let test_3_event = {};

    let event_handler_id_1, event_handler_id_2, event_handler_id_3, event_handler_id_4;
    let event_id_1, event_id_2, event_id_3;

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
      event_handler_id_1 = dispatcher.load_event_handler(test_handler_1);
      event_handler_id_2 = dispatcher.load_event_handler(test_handler_2);
      event_handler_id_3 = dispatcher.load_event_handler(test_handler_3);
      event_handler_id_4 = dispatcher.load_event_handler(test_handler_4);
      expect(dispatcher.event_handlers).to.contain(test_handler_1);
      expect(dispatcher.event_handlers).to.contain(test_handler_2);
      expect(dispatcher.event_handlers).to.contain(test_handler_3);
      expect(dispatcher.event_handlers).to.contain(test_handler_4);
    });

    it('Should remove event handler', () => {
      // Removed event handler, check if proper object returned
      expect(dispatcher.remove_event_handler(event_handler_id_4)).to.deep.equal(test_handler_4);
      // Make sure it's no longer in dispatcher
      expect(dispatcher.get_event_handler(event_handler_id_4)).to.be.undefined;
    });

    it('All event handlers should have unique ID', () => {
      expect(dispatcher.event_handlers.length).to.equal(_.uniqBy(dispatcher.event_handlers, (handler) => handler.instance_id).length);
    });

    it('Should return event handler by instance_id', () => {
      expect(dispatcher.get_event_handler(event_handler_id_2)).to.deep.equal(test_handler_2);
    });




    it('Should enqueue 3 events', () => {

      test_1_event = new Event('test.to_remove_event', test_3_event_data);
      test_2_event = new Event('test.event_1', test_1_event_data);
      test_3_event = new Event('test.event_2', test_2_event_data);

      event_id_1 = dispatcher.enqueue_event(test_1_event);
      event_id_2 = dispatcher.enqueue_event(test_2_event);
      event_id_3 = dispatcher.enqueue_event(test_3_event);

      expect(dispatcher.event_queue_count).to.equal(3);
    });

    it('All events should have have unique ID', () => {
      expect(dispatcher.event_queue.length).to.equal(_.uniqBy(dispatcher.event_queue, (event) => event.queue_id).length);
    });

    it('Should remove event 1 data from queue', () => {
      expect(dispatcher.shift_event()).to.deep.equal(test_1_event);
      expect(dispatcher.event_queue_count).to.equal(2);
    });

    it('Should dispatch event with one handler', (done) => {
      const test_event_data = Math.random();
      let ret = dispatcher.dispatch_event(new Event('test.event_1',test_event_data)).then(() => {
        // Event handler dispatch should have been called with correct args
        sinon.assert.callCount(test_1_dispatch_cb, 1);
        sinon.assert.calledWith(test_1_dispatch_cb, test_event_data);
      }).then(done).catch(done);

      //Make sure promise was fulfilled
      assert.isFulfilled(ret);

    });

    it('Should dispatch event with two handlers', (done) => {
      const test_event_data = Math.random();
      let ret = dispatcher.dispatch_event(new Event('test.event_2', test_event_data)).then(() => {
        // Event handler dispatch should have been called with correct args
        sinon.assert.callCount(test_2_dispatch_cb, 1);
        sinon.assert.callCount(test_3_dispatch_cb, 1);
        sinon.assert.calledWith(test_2_dispatch_cb, test_event_data);
        sinon.assert.calledWith(test_3_dispatch_cb, test_event_data);

      }).then(done).catch(done);

      //Make sure promise was filfilled
      assert.isFulfilled(ret);

    });

    it('Should dispatch event only for specific handler');

    it('Should revert event');

    it('Should revert event on specific handler', (done) => {
      const test_event_data = Math.random();
      let ret = dispatcher.revert_event(new Event('test.event_2', test_event_data), event_handler_id_3).then(() => {
        // Only 1 event handler should have been dispatched
        sinon.assert.callCount(test_3_revert_cb, 1);
        // Event handler dispatch should have been called with correct args
        sinon.assert.calledWith(test_3_revert_cb, test_event_data);

      }).then(done).catch(done);

      //Make sure promise was filfilled
      assert.isFulfilled(ret);

    });

    it('Should catch and emit error from event handler dispatch');


  });

});