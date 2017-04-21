const
  // Test tools
  rewire = require('rewire'),
  chai = require('chai'),
  chaiAsPromised = require('chai-as-promised'),
  expect = chai.expect,
  assert = chai.assert,
  sinon = require('sinon'),
  sa_promised = require('sinon-as-promised'),
  _ = require('lodash'),
  _moment = require('moment'),
  mongooseMock = require('mongoose-mock');

chai.use(chaiAsPromised);
chai.should();

// Set app_require function, used by timeEntryCollector
let rewires = {};
global.app_require = function(name) {
    let ret = rewire('../../../include/' + name);
    rewires[name] = ret;
    return ret;
};

// Modules to test
let TimeEntryCollector = rewire('../collectors/time-entry');
let toggl_time_entry_model = require('../models/time-entry');

let get_model_by_name_stub = sinon.stub();

// Rewire database stuff
rewires.collector.__set__("mongoose_utils", {
  getModel: mongooseMock.model,
  mongoose: mongooseMock,
  getModelByName: get_model_by_name_stub
});

get_model_by_name_stub.withArgs(toggl_time_entry_model.name).returns(toggl_time_entry_model);

var schema = mongooseMock.Schema(toggl_time_entry_model.schema);
var testModel = mongooseMock.model(toggl_time_entry_model.name, schema);

// When we call moment() we want it to always return a single time
const moment = (arg) => {
  if(_.isUndefined(arg))
    return _moment('2014-11-17T20:47:00Z');
  return _moment(arg);
};

// We don't want our test modules to have left over console.log calls
let console_log_spy = sinon.spy();
TimeEntryCollector.__set__("console", {log: console_log_spy});

// Create stub for toggl api
let get_time_entries_stub = sinon.stub();
let toggl_client_stub = sinon.stub().returns({
    getTimeEntries: get_time_entries_stub
});

// Rewire TimeEntryCollector
TimeEntryCollector.__set__("TogglClient", toggl_client_stub);
TimeEntryCollector.__set__("moment", moment);


describe('TimeEntryCollector Class', () => {

  it('Should construct an instance', () => {
    expect(() => new TimeEntryCollector()).to.not.throw();
  });

  describe('Initialize', () => {

    it('Should resolve and create new toggl client with args.apiToken', () => {
      const args = {api_token: Math.random()};
      const cl = new TimeEntryCollector(args);
      let prom = cl.initialize(args);
      return prom.then((data) => {
        sinon.assert.calledWith(toggl_client_stub, {apiToken: args.api_token});
      });
    });

    it('Should fail to create toggl client and reject with error', () => {
      toggl_client_stub.withArgs({apiToken: ''}).throws(Error('You should either specify apiToken or username and password'));
      const args = {api_token: ''};
      const cl = new TimeEntryCollector(args);
      return assert.isRejected(cl.initialize(args), Error, 'You should either specify apiToken or username and password');
    });
  });
  describe('Prepare', () => {

    it('Should pass data from getTimeEntries', () => {

      const args = {api_token: 'SOME_API_TOKEN'};
      const cl = new TimeEntryCollector(args);
      const report_test_data = Math.random();
      get_time_entries_stub.yields('',report_test_data);
      return cl.initialize(args).then(cl.prepare.bind(cl,args)).then((data) => {
        expect(data).to.equal(report_test_data);
      });

    });

    it('Should use correct date range when calling getTimeEntries', () => {

      const start_report = moment().subtract(30,'days').format();
      const end_report = moment().format();
      const args = {api_token: 'SOME_API_TOKEN', days_back_to_sync: 30};
      const cl = new TimeEntryCollector(args);
      return cl.initialize(args).then(cl.prepare.bind(cl,args)).then((data) => {
        sinon.assert.calledWith(get_time_entries_stub, start_report, end_report);
      });

    });

    it('Should default args to 1 day', () => {

      const start_report = moment().subtract(1,'days').format();
      const end_report = moment().format();
      const args = {api_token: 'SOME_API_TOKEN'};
      const cl = new TimeEntryCollector(args);
      return cl.initialize(args).then(() => {
        expect(cl.args.days_back_to_sync).to.equal(1);
      });

    });

    it('Should reject with error if getTimeEntries throws error', () => {

      const args = {api_token: 'SOME_API_TOKEN'};
      const cl = new TimeEntryCollector(args);
      get_time_entries_stub.yields({data: 'AN_ERROR_MESSAGE', code: '100'},'');
      return assert.isRejected(cl.initialize(args).then(cl.prepare.bind(cl,args)), Error, `API Error (code: 100): AN_ERROR_MESSAGE`);

    });

    it('Should reject with auth failure message if error code is 403', () => {

      const args = {api_token: 'SOME_API_TOKEN'};
      const cl = new TimeEntryCollector(args);
      get_time_entries_stub.yields({data: '', code: '403'},'');
      return assert.isRejected(cl.initialize(args).then(cl.prepare.bind(cl,args)), Error, `API Error (code: 403): Auth failed, check API token.`);

    });

    it('Should reject with error if err is returned from getTimeEntries', () => {

      const args = {api_token: 'SOME_API_TOKEN'};
      const cl = new TimeEntryCollector(args);
      get_time_entries_stub.resetBehavior();
      get_time_entries_stub.throws(Error('AN_ERROR_THROWN_MESSAGE'));
      return assert.isRejected(cl.initialize(args).then(cl.prepare.bind(cl,args)), Error, 'AN_ERROR_THROWN_MESSAGE');

    });
  });
  describe('Garbage', () => {

    const days_back = 30;
    const start_report = moment().subtract(days_back,'days');
    const end_report = moment();
    beforeEach(() => {
      testModel.find.reset();
    });
    testModel.find = sinon.stub();
    testModel.find.resolves([
      {id: '1'},
      {id: '2'},
      {id: '3'},
      {id: '4'}
    ]);

    const new_data_array = [
      {id: '1'},
      {id: '4'}
    ];

    const remove_data_array = [
      {id: '2'},
      {id: '3'}
    ];

    it('Should query mongoose for time entries within last ' + days_back + ' days', () => {
      const args = {api_token: 'SOME_API_TOKEN', days_back_to_sync: days_back};
      const cl = new TimeEntryCollector(args);
      return cl.initialize(args).then(cl.garbage.bind(cl,new_data_array,args)).then(() => {
        //expect(testModel.find.lastCall.args[0]).to.deep.equal({at:{'$gte': start_report, '$lt': end_report}});
        sinon.assert.calledWith(testModel.find, {at:{'$gte': start_report, '$lt': end_report}});
      });
    });

    it('Should resolve with difference array of time entries', () => {
      const args = {api_token: 'SOME_API_TOKEN', days_back_to_sync: days_back};
      const cl = new TimeEntryCollector(args);
      return cl.initialize(args).then(cl.garbage.bind(cl,new_data_array,args)).should.eventually.deep.equal(remove_data_array);
    });

  });

  it('Should never call console.log', () => {
    sinon.assert.neverCalledWith(console_log_spy);
  });

});