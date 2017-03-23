const // Test tools
chai = require('chai'),
  expect = chai.expect,
  assert = chai.assert,
  chaiSubset = require('chai-subset'),
  chaiAsPromised = require('chai-as-promised'),
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
  const event_handler_tsdb = require('../include/event-handler-tsdb')(influx);

  describe('metric.write event handler', () => {
    const metric_write_handler = new EventHandler(event_handler_tsdb[0]);
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
      const returned_data = metric_write_handler.dispatch(data, 0);

      it('Should return the same data passed to it', () => {
        expect(returned_data).to.equal(data);
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
        influx
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

      it('Should remove a record from the database', () => {
        // expect(1).to.equal(1);

        const query = `
          SELECT * FROM ${data.measurement}
          WHERE time = ${data.timestamp}
          AND host = '${data.tags.host}'
          AND region = '${data.tags.region}'
          AND event_id = ${data.fields.event_id}
          AND value = ${data.fields.value}
        `;
        influx
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
