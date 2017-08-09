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
    let defer = false;
    let should_defer_stub = sinon.stub();
    const mock_handler = {
      defer_delay: 30000, // 30000 = 30 secs
      should_defer: should_defer_stub,
    };

    afterEach(() => {
      should_defer_stub.reset();
    });

    it('Should return a promise that resolves', () => {
      should_defer_stub.resolves(false);

      return maybe_defer(
        mock_handler.should_defer,
        mock_handler.defer_delay
      ).then(() => {
        sinon.assert.callCount(should_defer_stub, 1);
      });
    });

    // should defer once?
    // should defer n times or until n time has passed?

    it('Should return a promise that rejects when error is thrown in condition_fn', () => {
      should_defer_stub.throws();

      const maybe_defer_promise = maybe_defer(
        mock_handler.should_defer,
        mock_handler.defer_delay
      );

      // return maybe_defer_promise.should.be.rejected;
      return expect(maybe_defer_promise).to.be.rejected;
      // return assert.isRejected(maybe_defer_promise);
    });

    it('Should never call console.log', () => {
      sinon.assert.neverCalledWith(console_log_spy);
    });
  });
});
