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

// const influx_client = new Influx.InfluxDB({
//   host: _config.influxdb.host,
//   database: _config.influxdb.database,
//   // schema: [
//   //   {
//   //     measurement: 'response_times',
//   //     fields: {
//   //       path: Influx.FieldType.STRING,
//   //       duration: Influx.FieldType.INTEGER
//   //     },
//   //     tags: [
//   //       'host'
//   //     ]
//   //   }
//   // ],
// });
const influx_client = {
  writePoints: data => {
    return new Promise((resolve, reject) => {
      // spy_var(data[0]);
      // console.log('*** Rewiring stuff yo');
      resolve(data[0]);
      // reject('Your mom!');
    });
  },
};
const HandlerWritePoints = rewire('../event-handlers/write-point');

describe('InfluxDB Plugin Event Handlers', () => {
  const metric_write_handler = new HandlerWritePoints({
    influxdb_client: influx_client,
  });

  describe('metric.write event handler', () => {
    // InfluxDB records consist of a measurement, tags, fields, and a timestamp:
    const data = {
      measurement: 'cpu_load_short',
      // timestamp: 1434055562000000000,
      timestamp: Date.now(),
      tags: {
        host: 'server01',
        region: 'us-west',
      },
      fields: {
        value: 0.55,
        event_id: 0,
      },
    };
    // console.log('timestamp: ' + data.timestamp);

    describe('dispatch method', () => {
      const dispatch = metric_write_handler.dispatch(
        data,
        data.fields.event_id
      );

      it('Should return the same data passed to it', done => {
        dispatch.then(result => {
          expect(result).to.equal(data);
          done();
        });
      });
    });

    describe('revert method', () => {
      const revert = metric_write_handler.revert(data, data.fields.event_id);

      it('Should return the event id', done => {
        revert.then(result => {
          expect(result).to.equal(data.fields.event_id);
          done();
        });
      });
    });
  });
});
