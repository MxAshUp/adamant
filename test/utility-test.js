const chai = require('chai'),
  expect = chai.expect,
  assert = chai.assert,
  chaiAsPromised = require('chai-as-promised'),
  sinon = require('sinon'),
  rewire = require('rewire'),
  EventEmitter = require('events').EventEmitter,
  // components to test
  utility = rewire('../libs/utility');

chai.use(chaiAsPromised);
chai.should();

console_log_spy = sinon.stub().callsFake(console.log);
utility.__set__('console', { log: console_log_spy });

describe('Utilities', () => {
  describe('defer_on_event', () => {
    const event_name_test = 'testEvent';
    const defer_fn_stub = sinon.stub();

    afterEach(() => {
      defer_fn_stub.reset();
    });

    it('Should return a promise that resolves', () => {
      defer_fn_stub.resolves(true);
      const event_emitter = new EventEmitter();

      const promise = utility.defer_on_event(
        event_name_test,
        defer_fn_stub,
        event_emitter
      );

      event_emitter.emit(event_name_test);

      return promise.then(() => {
        sinon.assert.callCount(defer_fn_stub, 1);
      });
    });

    // should return a promise that rejects when defer_fn throws an error

    it('Should never call console.log', () => {
      sinon.assert.neverCalledWith(console_log_spy);
    });
  });
});
