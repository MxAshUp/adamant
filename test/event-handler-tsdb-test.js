const
  // Test tools
  chai = require('chai'),
  expect = chai.expect,
  assert = chai.assert,
  chaiSubset = require('chai-subset'),
  chaiAsPromised = require("chai-as-promised"),
  rewire = require('rewire'),
  sinon = require('sinon'),
  _config = require('../include/config.js'),
  Influx = require('influx'),
  // Modules to test
  EventHandler = require('../include/event-handler'),
  EventDispatcher = require('../include/event-dispatcher');

chai.use(chaiAsPromised);
chai.use(chaiSubset);

describe('Event Handler TSDB', function() {

  const influx = new Influx.InfluxDB({
    host: _config.influxdb.host,
    database: _config.influxdb.database,
    // schema: [
    //   {
    //     measurement: 'response_times',
    //     fields: {
    //       path: Influx.FieldType.STRING,
    //       duration: Influx.FieldType.INTEGER
    //     },
    //     tags: [
    //       'host'
    //     ]
    //   }
    // ],
  });
  const event_handler_tsdb = require('../include/event-handler-tsdb')( influx );

  describe('metric.write event handler', function() {

    const metric_write_handler = new EventHandler( event_handler_tsdb[0] );

    it('Should return the same data passed to it', () => {

      const data = {
        measurement: 'cpu_load_short',
        timestamp: 1434055562000000000,
        tags: {
          'host': 'server01',
          'region': 'us-west',
        },
        fields: {
          'value': 0.64,
        },
      };
      const returned_data = metric_write_handler.dispatch(data, 0);

      expect(returned_data).to.equal(data);

    });

  });

});
