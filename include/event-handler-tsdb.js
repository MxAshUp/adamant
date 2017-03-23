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

        influx.writePoints([data]).catch(err => {
          console.error(`Error saving data to InfluxDB! ${err.stack}`);
        });

        return data;
      },
      revert: (data, event_id) => {
        // @todo - remove data from tsdb

        console.log('Revert Event ID: ' + event_id);

        // data.fields.value = 0;
        const record = Object.assign({}, data, {
          fields: {
            value: 0,
          },
        });

        influx
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
      },
    },
  ];
};
