

/* THE FOLLOWING IS TESTING CODE FOR DATA COLLECTOR SERVICE */


const App = require('./include/app'),
  utilities = require('./include/utilities');

const app = new App();

app.load_plugins(utilities.getPluginsDirectories());

app.load_collector({
	plugin_name: 'Toggl',
	collector_name: 'CollectorTimeEntries',
	version: '1.0',
	config: {
		apiToken:'771a871d9670b874655a25e20391640f'
	}
});

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

app.load_event_handler({
	plugin_name: 'Debug Tools',
	handler_name: 'HandlerConsoleLogger',
	version: '1.0',
	config: {
		event_name: 'toggl.time_entry.update',
		label_style: 'bgYellow'
	}
});
app.load_event_handler({
	plugin_name: 'Debug Tools',
	handler_name: 'HandlerConsoleLogger',
	version: '1.0',
	config: {
		event_name: 'toggl.time_entry.create',
		label_style: 'bgGreen'
	}
});
app.load_event_handler({
	plugin_name: 'Debug Tools',
	handler_name: 'HandlerConsoleLogger',
	version: '1.0',
	config: {
		event_name: 'toggl.time_entry.remove',
		label_style: 'bgRed'
	}
});
app.init().then(app.run.bind(app));
