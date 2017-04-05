const // Test tools
chai = require('chai'),
  expect = chai.expect,
  assert = chai.assert,
  rewire = require('rewire'),
  sinon = require('sinon'),
  Influx = require('influx');
// Modules to test

// @todo - somehow put this in all plugin tests... maybe
global.app_require = function(name) {
  return require('../../../include/' + name);
};

_config = app_require('config.js');
_config.influxdb.host = 'localhost';

const influx_client = new Influx.InfluxDB({
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
// const influx_client = {
//   writePoints: data => {
//     return new Promise((resolve, reject) => {
//       // spy_var(data[0]);
//       // console.log('*** Rewiring stuff yo');
//       resolve(data[0]);
//       // reject('Your mom!');
//     });
//   },
// };
const HandlerWritePoints = require('../event-handlers/write-point');

describe('InfluxDB Plugin Event Handlers', () => {
  describe('metric.write event handler', () => {
    const metric_write_handler = new HandlerWritePoints({
      influxdb_client: influx_client,
    });

    // InfluxDB records consist of a measurement, tags, fields, and a timestamp:
    const data = {
      measurement: 'test_record_update',
      // timestamp: 1434055562000000000,
      // timestamp: Date.now(),
      tags: {},
      fields: {
        value: 0.55,
      },
    };

    const event_id = Date.now() + '';

    describe('dispatch method', () => {
      // const dispatch = metric_write_handler.dispatch(data, event_id);

      it('Should return same data passed to it with added event id', async () => {
        const result = await metric_write_handler.dispatch(data, event_id);
        result.tags.event_id = event_id;
        expect(result).to.equal(data);
      });
    });

    describe('revert method', () => {
      // const revert = metric_write_handler.revert(data, event_id);

      it('Should return the event id', async () => {
        const result = await metric_write_handler.revert(data, event_id);
        expect(result).to.equal(event_id);
      });
    });
  });
});
