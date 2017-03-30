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
    if (data.tags) {
      data.tags.event_id = event_id + '';
    }

    return new Promise((resolve, reject) => {
      this.args.influxdb_client
        .writePoints([data])
        .then(() => {
          // console.log(`Success adding record with event id: ${event_id}`);
          resolve(data);
        })
        .catch(err => {
          console.error(`Error saving data to InfluxDB! ${err.stack}`);
          reject(new Error(`Error: ${err.stack}`));
        });
    });
  }

  revert(data, event_id) {
    // console.log('Revert Event ID: ' + event_id);

    return new Promise((resolve, reject) => {
      this.args.influxdb_client
        .dropSeries({
          measurement: data.measurement,
          where: `"event_id" = '${event_id}'`,
        })
        .then(result => {
          // success
          // console.log(`Success removing record with event id: ${event_id}`);
          resolve(event_id);
        })
        .catch(err => {
          console.error(`Error removing data from InfluxDB! ${err.stack}`);
          reject(new Error(`Error: ${err.stack}`));
        });
    });
  }
}

module.exports = HandlerWritePoint;
