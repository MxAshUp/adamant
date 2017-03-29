const App = require('./include/app'),
  utilities = require('./include/utilities'),
  _config = require('./include/config.js'),
  Influx = require('influx');

const app = new App();

// Load plugins
app.load_plugins(utilities.getPluginsDirectories());

// Load toggl collector
app.load_collector({
  plugin_name: 'Toggl',
  collector_name: 'CollectorTimeEntries',
  version: '1.0',
  config: {
    apiToken: '9a273d3973ddace390a130711f3e02e3',
  },
});

// Load TimeClock collector
// app.load_collector({
// 	plugin_name: 'TimeClock',
// 	collector_name: 'CollectorPunches',
// 	version: '1.0',
// 	config: {
// 		days_back_to_sync: 1,
// 		url:'http://192.168.1.29/',
// 		user:'admin',
// 		password:'FVnZaHD8HyCe'
// 	}
// });

// Simply log details about toggl update event to console
app.load_event_handler({
  plugin_name: 'Debug Tools',
  handler_name: 'HandlerConsoleLogger',
  version: '1.0',
  config: {
    event_name: 'toggl.time_entry.update',
    label_style: 'bgYellow',
  },
});

// Simply log details about toggl create event to console
app.load_event_handler({
  plugin_name: 'Debug Tools',
  handler_name: 'HandlerConsoleLogger',
  version: '1.0',
  config: {
    event_name: 'toggl.time_entry.create',
    label_style: 'bgGreen',
  },
});

// Simply log details about toggl remove event to console
app.load_event_handler({
  plugin_name: 'Debug Tools',
  handler_name: 'HandlerConsoleLogger',
  version: '1.0',
  config: {
    event_name: 'toggl.time_entry.remove',
    label_style: 'bgRed',
  },
});

// Add handler for writing data to influxdb
const influxdb_client = new Influx.InfluxDB({
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
app.load_event_handler({
  plugin_name: 'InfluxDB Tools',
  handler_name: 'HandlerWritePoint',
  version: '1.0',
  config: {
    influxdb_client,
  },
});

// This handler will listen for a time entry update event, and enqueue a new event
app.load_event_handler({
  plugin_name: 'Debug Tools',
  handler_name: 'HandlerAdapter',
  version: '1.0',
  config: {
    listen_event_name: 'toggl.time_entry.update',
    call_event_name: '_adapter.time_entry.log',
    mutator_fn: data => `A beautiful string ${data.id}`,
  },
});

// This handler will listen for the custom event triggered in the above adaper
app.load_event_handler({
  plugin_name: 'Debug Tools',
  handler_name: 'HandlerConsoleLogger',
  version: '1.0',
  config: {
    event_name: '_adapter.time_entry.log',
    label_style: 'underline',
  },
});

// This handler will listen for a time entry update event, and enqueue a new event
app.load_event_handler({
  plugin_name: 'Debug Tools',
  handler_name: 'HandlerAdapter',
  version: '1.0',
  config: {
    listen_event_name: 'toggl.time_entry.update',
    call_event_name: 'metric.write',
    // mutator_fn: data => `A beautiful string ${data.id}`,
    mutator_fn: data => {
      console.log('mutator func called');
      console.log('data pre modify: ', data);

      data = {
        measurement: 'toggl_entry_update',
        // timestamp: 1434055562000000000,
        timestamp: Date.now(),
        tags: {
          host: 'server01',
          region: 'us-west',
        },
        fields: {
          value: 0.55,
        },
      };

      return data;
    },
  },
});

// Get things going!
app.init().then(app.run.bind(app));
