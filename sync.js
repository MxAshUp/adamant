

/* THE FOLLOWING IS TESTING CODE FOR DATA COLLECTOR SERVICE */


const App = require('./include/app'),
  utilities = require('./include/utilities');

const app = new App();

app.load_plugins(utilities.getPluginsDirectories());

app.load_collector({
	plugin_name: 'Toggl',
	model_name: 'toggl_timeEntry',
	version: '1.0',
	config: {
		apiToken:'771a871d9670b874655a25e20391640f'
	}
});

// app.load_collector({
// 	plugin_name: 'TimeClock',
// 	model_name: 'timeclock_timeEntry',
// 	version: '1.0',
// 	config: {
// 		days_back_to_sync: 1,
// 		url:'http://192.168.1.29/',
// 		user:'admin',
// 		password:'FVnZaHD8HyCe'
// 	}
// });

app.init().then(app.run.bind(app));
