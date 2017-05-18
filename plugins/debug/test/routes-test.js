const
  // Test tools
  rewire = require('rewire'),
  chai = require('chai'),
  expect = chai.expect,
  assert = chai.assert,
  sinon = require('sinon'),
  _ = require('lodash');


// Modules to test
let routes = rewire('../routes');

// We don't want our test modules to have left over console.log calls
let console_log_spy = sinon.spy();
routes.__set__("console", {log: console_log_spy});

describe('Socket events', () => {

  // Put tests here

  it('Should never call console.log', () => {
    sinon.assert.neverCalledWith(console_log_spy);
  });

});