const chai = require('chai');
const expect = chai.expect;
const assert = chai.assert;
const sinon = require('sinon');
const rewire = require('rewire');
// components to test
const App = rewire('../libs/app');

const PluginLoaderLoadPluginSpy = sinon.spy();
const PluginLoaderMock = sinon.stub().returns({
  load_plugin: PluginLoaderLoadPluginSpy,
  load_plugin_models: null,
  load_plugin_routes: null,
  load_plugin_sockets: null,
  create_collector: null,
  create_event_handler: null,
});

console_log_spy = sinon.spy();
App.__set__('console', { log: console_log_spy });
App.__set__('PluginLoader', PluginLoaderMock);

describe('App', () => {
  it('Should construct an instance without throwing an error', () => {
    return new App();
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
