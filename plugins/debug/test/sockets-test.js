const
  // Test tools
  rewire = require('rewire'),
  chai = require('chai'),
  expect = chai.expect,
  assert = chai.assert,
  sinon = require('sinon'),
  _ = require('lodash'),
  SocketMock = require('socket-io-mock');

// Modules to test
let socket_events = rewire('../sockets');


const app = {
  io: {
    on: (event, fn) => {

    }
  },
  collect_services: [

  ]
};


// We don't want our test modules to have left over console.log calls
let console_log_spy = sinon.spy();
socket_events.__set__("console", {log: console_log_spy});

describe('Socket events', () => {

  // Put tests here

  it('Should never call console.log', () => {
    sinon.assert.neverCalledWith(console_log_spy);
  });

});