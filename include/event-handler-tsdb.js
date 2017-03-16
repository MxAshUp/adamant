module.exports = (influx) => {
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
				// 	measurement: 'cpu_load_short',
				// 	timestamp: 1434055562000000000,
				// 	tags: {
				// 		'host': 'server01',
				// 		'region': 'us-west',
				// 	},
				// 	fields: {
				// 		'value': 0.64,
				// 	},
				// }

				influx.writePoints([
		      // {
		      //   measurement: 'response_times',
		      //   tags: { host: os.hostname() },
		      //   fields: { duration, path: req.path },
		      // },
					data,
		    ]).catch(err => {
		      console.error(`Error saving data to InfluxDB! ${err.stack}`)
		    });

				return data;

      },
      revert: (data, event_id) => {
        // @todo - remove data from tsdb
      }
    }
  ];
};
