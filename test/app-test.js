const chai = require('chai');
const expect = chai.expect;
const assert = chai.assert;
const sinon = require('sinon');
const rewire = require('rewire');
// components to test
const app = rewire('../libs/app');

console_log_spy = sinon.spy();
app.__set__('console', { log: console_log_spy });

describe('App', () => {
  it('Should construct an instance without throwing an error', () => {
    return new app();
  });

  describe('init', () => {});

  describe('load_plugins', () => {});

  describe('load_collector', () => {});

  describe('load_event_handler', () => {});

  describe('run', () => {});

  describe('stop', () => {});

  it('Should never call console.log', () => {
    sinon.assert.neverCalledWith(console_log_spy);
  });
});
