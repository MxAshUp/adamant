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
    const data = {
      measurement: 'cpu_load_short',
      timestamp: 1434055562000000000,
      tags: {
        'host': 'server01',
        'region': 'us-west',
      },
      fields: {
        'value': 0.44,
      },
    };
    const returned_data = metric_write_handler.dispatch(data, 0);

    it('Should return the same data passed to it', () => {

      expect(returned_data).to.equal(data);

    });

    it('Should add a record to the database', (done) => {

      // influx.query(`
      //   select * from cpu_load_short
      //   where host = ${data.tags.host} and region = ${data.tags.region}
      //   order by time desc
      //   limit 10
      // `).then(result => {
      //   // res.json(result);
      //   // expect(result).to.have.length.above(0);
      //   done();
      // }).catch(err => {
      //   // res.status(500).send(err.stack);
      //   done(err.stack);
      // });

      const query = influx.query(`
        select * from cpu_load_short
        where host = ${data.tags.host} and region = ${data.tags.region}
        order by time desc
        limit 10
      `);

      // return query.should.eventually.have.length.above(0);
      return expect(query).to.eventually.be.a('array');

    });

  });

});
