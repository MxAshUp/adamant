const EventHandler = app_require('event-handler');

/**
 * Event handler for writing data to influxdb.
 *
 * @class HandlerWritePoint
 * @extends {EventHandler}
 */
class HandlerWritePoint extends EventHandler {
  /**
   * Creates an instance of HandlerWritePoint.
   * @param {object} args
   *
   * @memberOf HandlerWritePoint
   */
  constructor(args) {
    super();
    this.default_args = {
      influxdb_client: '',
    };

    // Merges args with default args
    Object.assign(this.args, this.default_args, args);

    this.event_name = 'metric.write';
    this.supports_revert = true;
    this.version = '1.0';
    this.plugin_name = 'InfluxDB Tools';
  }

  dispatch(data, event_id) {
    //@todo - log event_id too!

    return new Promise((resolve, reject) => {
      this.args.influxdb_client.writePoints([data]).then(result => {
        console.log('result: ', result);
        resolve(data);
      });
    });
  }

  revert(data, event_id) {
    // @todo - remove data from tsdb

    console.log('Revert Event ID: ' + event_id);

    // data.fields.value = 0;
    const record = Object.assign({}, data, {
      fields: {
        value: 0,
      },
    });

    this.args.influxdb_client
      .writePoints([record])
      .then(result => {
        // do stuff
        console.log(`Success zeroing record with event id: ${event_id}`);
      })
      .catch(err => {
        console.error(`Error saving data to InfluxDB! ${err.stack}`);
      });

    // influx
    //   .dropSeries({
    //     measurement: data.measurement,
    //     // where: '"event_id" = 0',
    //   })
    //   .then(result => {
    //     // success
    //     console.log(`Success removing record with event id: ${event_id}`);
    //   })
    //   .catch(err => {
    //     console.error(`Error removing data from InfluxDB! ${err.stack}`);
    //   });

    return event_id;
  }
}

module.exports = HandlerWritePoint;
