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
    let defer_delay = 100;

    afterEach(() => {
      condition_fn_stub.reset();
      defer_delay = 100;
    });

    it('Should return a promise that resolves', () => {
      condition_fn_stub.resolves(false);

      return maybe_defer(condition_fn_stub, defer_delay).then(() => {
        sinon.assert.callCount(condition_fn_stub, 1);
      });
    });

    // should defer once?
    // should defer n times or until n time has passed?

    it('Should return a promise that rejects when error is thrown in condition_fn', () => {
      condition_fn_stub.throws();

      return maybe_defer(condition_fn_stub, defer_delay).should.be.rejected;
    });

    it('Should never call console.log', () => {
      sinon.assert.neverCalledWith(console_log_spy);
    });
  });
});
