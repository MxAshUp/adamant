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

describe('Event Handler TSDB', () => {
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
  const HandlerWritePoints = require('../event-handlers/write-point');
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
      const dispatch = metric_write_handler.dispatch(data, 0);

      it('Should return the same data passed to it', done => {
        dispatch.then(result => {
          expect(result).to.equal(data);
          done();
        });
      });

      it('Should add a record to the database', done => {
        const query = `
          SELECT * FROM ${data.measurement}
          WHERE time = ${data.timestamp}
          AND host = '${data.tags.host}'
          AND region = '${data.tags.region}'
          AND event_id = ${data.fields.event_id}
          AND value = ${data.fields.value}
        `;
        influx_client
          .query(query)
          .then(result => {
            // expect(result).to.have.lengthOf(1);
            expect(result).to.have.length.above(0);
            // expect(result).equal(result);
            done();
          })
          .catch(err => {
            done(err.stack);
          });
      });
    });

    describe('revert method', () => {
      const revert = metric_write_handler.revert(data, 0);

      it('Should remove a record from the database', done => {
        // expect(1).to.equal(1);

        const query = `
          SELECT * FROM ${data.measurement}
          WHERE time = ${data.timestamp}
          AND host = '${data.tags.host}'
          AND region = '${data.tags.region}'
          AND event_id = ${data.fields.event_id}
          AND value = ${data.fields.value}
        `;
        influx_client
          .query(query)
          .then(result => {
            expect(result).to.have.lengthOf(0);
            // expect(result).to.equal(0);
            // expect(result).equal(result);
            done();
          })
          .catch(err => {
            done(err.stack);
          });
      });
    });
  });
});
