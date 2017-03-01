const
  chai = require('chai'),
  expect = chai.expect,
  chaiSubset = require('chai-subset'),
  rewire = require('rewire'),
  sinon = require('sinon'),
  EventHandler = require('../include/event-handler'),
  EventDispatcher = require('../include/event-dispatcher');

chai.use(chaiSubset);

describe('Event System', () => {

  // Need some spies and a mock handler for running tests
  const test_dispatch_db = sinon.spy();
  const test_revert_cb = sinon.spy();
  const test_1_config = {
    default_args: {},
    event_name: 'test.event_1',
    supports_revert: true,
    version: '0.1',
    plugin_name: '_test',
    dispatch: test_dispatch_db,
    revert: test_revert_cb,
    instance_id: '1'
  };
  const test_2_config = {
    default_args: {},
    event_name: 'test.event_2',
    supports_revert: true,
    version: '0.1',
    plugin_name: '_test',
    dispatch: test_dispatch_db,
    revert: test_revert_cb,
    instance_id: '1'
  };
  const test_handler_1 = new EventHandler(test_1_config);
  const test_handler_2 = new EventHandler(test_2_config);

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
      const sample_data = {
        property: 'value',
        thing: 123
      };
      test_handler_1.dispatch(sample_data);
      expect(test_dispatch_db.calledOnce).to.be.true;
      expect(test_dispatch_db.calledWith(sample_data)).to.be.true;
    });
    it('Should call revert with data', () => {

      const sample_revert_data = {
        r_property: 'value',
        r_thing: 123
      };
      test_handler_1.revert(sample_revert_data);
      expect(test_revert_cb.calledOnce).to.be.true;
      expect(test_revert_cb.calledWith(sample_revert_data)).to.be.true;

    });
  });

  describe('Event Dispatcher', () => {

    const dispatcher = new EventDispatcher();

    dispatcher.load_event_handler(test_handler_1);
    dispatcher.load_event_handler(test_handler_2);

    it('Should add event handler to dispatcher.', () => {
      // Check dispatcher event handler array
      expect(dispatcher.event_handlers).to.contain(test_handler_1);
      expect(dispatcher.event_handlers).to.contain(test_handler_2);
    });
    it('Should fail to add event handler to dispatcher (duplicate ids).', () => {
      // Try to load same handler again, should throw error
      expect(() => {
        dispatcher.load_event_handler(test_handler_1);
      }).to.throw(Error);
    });
    it('Should enqueue 4 events.');
    it('Should remove 1 event from queue.');
    it('Should dispatch first event.');
    it('Should return revert data.');
    it('Should revert first event with revert data.');
  });

});