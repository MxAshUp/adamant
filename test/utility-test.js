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

const immmediatePromise = () => {
  return new Promise(resolve => {
    setImmediate(resolve);
  })
};

describe('Utilities', () => {
  describe('defer_on_event', () => {
    const event_name_test = 'testEvent';
    const defer_fn_stub = sinon.stub();
    const event_emitter = new EventEmitter();
    const resolved_spy = sinon.spy();
    let promise = Promise.resolve();

    beforeEach(() => {
      defer_fn_stub.resolves(true);
      promise = utility.defer_on_event(
        event_name_test,
        defer_fn_stub,
        event_emitter
      ).then(resolved_spy);
    })

    afterEach(() => {
      resolved_spy.reset();
      defer_fn_stub.reset();
    });

    it('Should call defer_fn with event data', () => {
      const mock_data = Math.random();

      return Promise.resolve()
        .then(() => {
          // Triggering this event will allow it to be resolved
          event_emitter.emit(event_name_test,mock_data);
          return immmediatePromise();
        })
        .then(() => {
          // Shouldn't be resolved yet
          sinon.assert.calledWith(defer_fn_stub, mock_data);
        });
    });

    it('Should return a promise that resolves after event is emitted', () => {

      return Promise.resolve()
        .then(() => {
          // Shouldn't be resolved yet
          sinon.assert.notCalled(resolved_spy);
          return immmediatePromise();
        })
        .then(() => {
          // Triggering this event will allow it to be resolved
          event_emitter.emit(event_name_test);
          return immmediatePromise();
        })
        .then(() => {
          // Should now be resolved
          sinon.assert.calledOnce(resolved_spy);
        });
    });

    it('Should not resolve promise because defer_fn returns false', () => {

      // Keep deferring
      defer_fn_stub.resolves(false);

      return Promise.resolve()
        .then(() => {
          // Shouldn't be resolved yet
          sinon.assert.notCalled(resolved_spy);
          return immmediatePromise();
        })
        .then(() => {
          // Triggering this event will allow it to be resolved
          event_emitter.emit(event_name_test);
          return immmediatePromise();
        })
        .then(() => {
          // Shouldn't be resolved yet
          sinon.assert.notCalled(resolved_spy);

          // Now we can resolve
          defer_fn_stub.resolves(true);

          return immmediatePromise();
        })
        .then(() => {
          // Triggering this event will allow it to be resolved
          event_emitter.emit(event_name_test);
          return immmediatePromise();
        })
        .then(() => {
          // Should now be resolved
          sinon.assert.calledOnce(resolved_spy);
        });

    });

    it('Should not have any event listeners', () => {

      // Triggering this event will allow it to be resolved
      event_emitter.emit(event_name_test);

      return promise.then(() => {
        // Now it should be resolved
        expect(event_emitter.listenerCount(event_name_test)).to.equal(0);
      });
    });
  });

  describe('defer_on_event errors', () => {
    const event_name_test = 'testEvent';
    const mock_error = 'An Error message ' + Math.random();
    const defer_fn_stub = sinon.stub();
    const event_emitter = new EventEmitter();
    const resolved_spy = sinon.spy();
    const rejected_spy = sinon.spy();
    let promise = Promise.resolve();

    beforeEach(() => {
      defer_fn_stub.throws(new Error(mock_error));
      promise = utility.defer_on_event(
        event_name_test,
        defer_fn_stub,
        event_emitter
      );
    })

    afterEach(() => {
      resolved_spy.reset();
      rejected_spy.reset();
      defer_fn_stub.reset();
    });

    it('Should return a promise that rejects if defer_fn throws an error', () => {
      event_emitter.emit(event_name_test);
      return promise.should.be.rejectedWith(mock_error);
    });

    it('Should return a promise that rejects, and not have any listeners', () => {
      event_emitter.emit(event_name_test);
      return promise.should.be.rejectedWith(mock_error).then(() => {
        // Now it should be resolved
        expect(event_emitter.listenerCount(event_name_test)).to.equal(0);
      });
    });

  });

  it('Should never call console.log', () => {
    sinon.assert.neverCalledWith(console_log_spy);
  });
});
