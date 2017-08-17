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

let console_log_spy = sinon.spy();
utility.__set__('console', { log: console_log_spy });

describe('Utilities', () => {});
