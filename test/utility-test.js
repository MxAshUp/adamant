const chai = require('chai'),
  expect = chai.expect,
  assert = chai.assert,
  chaiAsPromised = require('chai-as-promised'),
  sinon = require('sinon'),
  rewire = require('rewire'),
  // components to test
  utility = rewire('../libs/utility');

chai.use(chaiAsPromised);
chai.should();

const maybe_defer = utility.maybe_defer;

let console_log_spy = sinon.spy();
// utility.__set__('console', { log: console_log_spy });

describe('Utilities', () => {
  describe('Maybe Defer', () => {
    let condition_fn_stub = sinon.stub();
    let defer_delay = 10;

    afterEach(() => {
      condition_fn_stub.reset();
      defer_delay = 10;
    });

    it('Should return a promise that resolves', () => {
      condition_fn_stub.resolves(false);

      return maybe_defer(condition_fn_stub, defer_delay).then(() => {
        sinon.assert.callCount(condition_fn_stub, 1);
      });
    });

    it('Should defer N times and call condition_fn (N + 1) times', () => {
      // get random int (1-5)
      const n = Math.floor(Math.random() * 5 + 1);

      condition_fn_stub.resolves(true);
      condition_fn_stub.onCall(n).resolves(false);

      return maybe_defer(condition_fn_stub, defer_delay).then(() => {
        sinon.assert.callCount(condition_fn_stub, n + 1);
      });
    });

    it('Should defer for N milliseconds', () => {
      // get random int (1-10)
      const defer_delay = Math.floor(Math.random() * 10 + 1);
      const start = new Date();

      condition_fn_stub.resolves(true);
      setTimeout(() => {
        condition_fn_stub.resolves(false);
      }, defer_delay);

      return maybe_defer(condition_fn_stub, defer_delay).then(() => {
        const end = new Date();
        const duration = end.getTime() - start.getTime();

        duration.should.be.at.least(defer_delay);
        sinon.assert.callCount(condition_fn_stub, 2);
      });
    });

    it('Should return a promise that rejects when error is thrown in condition_fn', () => {
      condition_fn_stub.throws();

      return maybe_defer(condition_fn_stub, defer_delay).should.be.rejected;
    });

    it('Should never call console.log', () => {
      sinon.assert.neverCalledWith(console_log_spy);
    });
  });
});
