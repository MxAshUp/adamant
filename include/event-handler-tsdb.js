module.exports = influx => {
  return [
    {
      default_args: {},
      event_name: 'metric.write',
      supports_revert: true,
      version: '0.1',
      plugin_name: '_core',
      dispatch: (data, event_id) => {
        // @todo - write data to tsdb
        // @todo - return data maybe necessary for revert()

        // InfluxDB records consist of a measurement, tags, fields, and a timestamp:
        // {
        //   measurement: 'cpu_load_short',
        //   // timestamp: 1434055562000000000,
        //   timestamp: Date.now(),
        //   tags: {
        //     host: 'server01',
        //     region: 'us-west',
        //   },
        //   fields: {
        //     value: 0.55,
        //     event_id: 0,
        //   },
        // }

        influx.writePoints([data]).catch(err => {
          console.error(`Error saving data to InfluxDB! ${err.stack}`);
        });

        return data;
      },
      revert: (data, event_id) => {
        // @todo - remove data from tsdb

        console.log('Revert Event ID: ' + event_id);

        data.fields.value = 0;

        influx
          .writePoints([data])
          .then(result => {
            // do stuff
            console.log(`Success zeroing record with event id: ${event_id}`);
          })
          .catch(err => {
            console.error(`Error saving data to InfluxDB! ${err.stack}`);
          });

        // influx
        //   .dropSeries({ where: `"event_id" = ${data.fields.event_id}` })
        //   // .then(result => {
        //   //   // success
        //   //   console.log(`Success removing record with event id: ${event_id}`);
        //   // })
        //   .catch(err => {
        //     console.error(`Error removing data from InfluxDB! ${err.stack}`);
        //   });

        return event_id;
      },
    },
  ];
};
