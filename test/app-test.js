const rewire = require('rewire'),
  sinon = require('sinon'),
  chai = require('chai'),
  expect = chai.expect,
  assert = chai.assert,
  // components to test
  app = rewire('../libs/app');

console_log_spy = sinon.spy();
app.__set__('console', { log: console_log_spy });

describe('App', () => {
  it('Should construct an instance without throwing an error', () => {
    return new app();
  });

  it('Should never call console.log', () => {
    sinon.assert.neverCalledWith(console_log_spy);
  });
});
