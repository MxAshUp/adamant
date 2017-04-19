const App = require('./include/app'),
  utilities = require('./include/utilities'),
  _config = require('./include/config.js'),
  Influx = require('influx');

const app = new App();

// Load plugins
app.load_plugins(utilities.getPluginsDirectories());

// Load toggl collector
// app.load_collector({
//   plugin_name: 'Toggl',
//   collector_name: 'CollectorTimeEntries',
//   version: '1.0',
//   config: {
//     apiToken: '9a273d3973ddace390a130711f3e02e3',
//     days_back_to_sync: 30,
//   },
// });

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

// Load Asana collector
app.load_collector({
  plugin_name: 'Asana',
  collector_name: 'CollectorAsanaProjects',
  version: '1.0',
  config: {
    days_back_to_sync: 30
  }
});

// Simply log details about toggl update event to console
app.load_event_handler({
  plugin_name: 'Debug Tools',
  handler_name: 'HandlerConsoleLogger',
  version: '1.0',
  config: {
    event_name: 'asana.project.update',
    label_style: 'bgYellow',
  },
});

// Simply log details about toggl create event to console
app.load_event_handler({
  plugin_name: 'Debug Tools',
  handler_name: 'HandlerConsoleLogger',
  version: '1.0',
  config: {
    event_name: 'asana.project.create',
    label_style: 'bgGreen',
  },
});

// Simply log details about toggl remove event to console
app.load_event_handler({
  plugin_name: 'Debug Tools',
  handler_name: 'HandlerConsoleLogger',
  version: '1.0',
  config: {
    event_name: 'asana.project.remove',
    label_style: 'bgRed',
  },
});



// Get things going!
app.init().catch((err) => {
  console.log(err);
  process.exit();
}).then(app.run.bind(app));
