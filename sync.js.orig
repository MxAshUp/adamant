

/* THE FOLLOWING IS TESTING CODE FOR DATA COLLECTOR SERVICE */


const PluginLoader = require('./include/plugin-loader'),
	_config = require('./include/config.js'),
	mongoose_util = require('./include/mongoose-utilities'),
	_ = require('lodash'),
  utilities = require('./include/utilities'),
  LoopService = require('./include/loop-service'),
	chalk = require('chalk');

const plugins = new PluginLoader();

//Get directors of plugins
const plugin_dirs = utilities.getPluginsDirectories();

//Load each plugin
_.forEach(plugin_dirs, (plugin_path) => { console.log(plugin_path); plugins.load_plugin(plugin_path.path,_config); });


const collector_configs = [
	// {
	// 	plugin_name: 'Toggl',
	// 	model_name: 'toggl_timeEntry',
	// 	version: '1.0',
	// 	config: {
	// 		apiToken:'771a871d9670b874655a25e20391640f'
	// 	}
	// },
	// {
	// 	plugin_name: 'TimeClock',
	// 	model_name: 'timeclock_timeEntry',
	// 	version: '1.0',
	// 	config: {
	// 		days_back_to_sync: 1,
	// 		url:'http://192.168.1.29/',
	// 		user:'admin',
	// 		password:'FVnZaHD8HyCe'
	// 	}
	// },
	{
		plugin_name: 'Asana',
		model_name: 'asana_project',
		version: '1.0',
		config: {}
	}
];


function main() {

	//Maybe attach some event handlers?
	plugins.on('create', (model, data) => {
		console.log(`model ${chalk.bgCyan(model)} ${chalk.green('created')}: ${chalk.grey(JSON.stringify(data))}`);
	});
	plugins.on('update', (model, data) => {
		console.log(`model ${chalk.bgCyan(model)} ${chalk.yellow('updated')}: ${chalk.grey(JSON.stringify(data))}`);
	});
	plugins.on('remove', (model, data) => {
		console.log(`model ${chalk.bgCyan(model)} ${chalk.red('removed')}: ${chalk.grey(JSON.stringify(data))}`);
	});

	//Example of plugin/model specific event
	plugins.on('toggl_timeEntry_create', data => console.log(`${chalk.green('NEW TIME ENTRY')}`));

	const collect_services = _.each(collector_configs, (config) => {
		try {

			const collector = plugins.create_collector_instance(config);
			const service = new LoopService(collector.run.bind(collector), collector.stop.bind(collector));

			service.on('error',		(e) => console.log(`${chalk.bgCyan(config.model_name)} service ${chalk.red('Error')}: ${chalk.grey(e.stack)}`));
			service.on('started',	() => console.log(`${chalk.bgCyan(config.model_name)} service ${chalk.bold('started')}.`));
			service.on('stopped',	() => console.log(`${chalk.bgCyan(config.model_name)} service ${chalk.bold('stopped')}.`));
			service.start();

		} catch (e) {
			console.log(`${chalk.bgYellow('Service Loop Error')}: ${chalk.grey(e.stack)}`);
		}
	});

}

//Connect to db, then do main
mongoose_util.connect(_config.mongodb.uri).then(main);
