//Main app goes here
//Some code action is happening over in /test/



/* THE FOLLOWING IS TESTING CODE FOR DATA COLLECTOR SERVICE */

var plugin_loader = require('./include/plugin-loader'),
	_config = require('./include/config.js'),
	mongoose_util = require('./include/mongoose-utilities'),
	DataCollector = require('./include/data-collector'),
	_ = require('lodash'),
	semver = require('semver'),
	sprintf = require('sprintf-js').sprintf,
	LoopService = require('./include/loop-service');

var plugins = plugin_loader.loadPlugins(_config);

console.log("Plugins loaded");

var collector_instances = [
	{
		plugin_name: 'Toggl',
		collection_name: 'toggl_timeEntry',
		version: '1.0',
		config: {
			apiToken:'771a871d9670b874655a25e20391640f'
		}
	},
	{
		plugin_name: 'TimeClock',
		collection_name: 'timeclock_timeEntry',
		version: '1.0',
		config: {
			days_back_to_sync: 1,
			url:'http://192.168.1.29/',
			user:'admin',
			password:'FVnZaHD8HyCe'
		}
	}
];

function load_collector(collector_instance) {
	
	//Find plugin
	var plugin = _.find(plugins, {name: collector_instance.plugin_name, enabled: true});
	if(!plugin) throw new Error(sprintf("Plugin not loaded: %s", collector_instance.plugin_name));
	
	//Find data collector in plugin
	var data_collector = _.find(plugin.data_collectors, {model_name: collector_instance.collection_name})
	if(!data_collector) throw new Error(sprintf("Collection not found: %s", collector_instance.collection_name));
	
	//Check version
	if(data_collector.version && data_collector.version !== collector_instance.version) {
		//TODO: Do better version check, and also maybe run update on current config
		throw new Error("Collection version not the same.");
	}

	//Time to create data colector instance
	try {
		var data_collector = new DataCollector(data_collector, collector_instance.config);
	} catch (r) {
		throw new Error(sprintf("Error creating data collector instance: $s", r));
	}

	return data_collector;
}



function main() {

	var data_collector_instances;

	data_collector_instances = _.map(collector_instances, function(collector_instance) {
		try {
			console.log('Loading instance...');
			return load_collector(collector_instance);
		} catch (e) {
			//TODO: Log error somewhere better
			console.log(e);
			return;
		}
	});

	//Remove instances failed to load
	data_collector_instances = _.filter(data_collector_instances, i => !_.isUndefined(i));

	console.log(sprintf("%s collectors loaded.", data_collector_instances.length));

	try {

		var collect_services = _.map(data_collector_instances, (i) => new LoopService(i.run));

		_.each(collect_services, function(service) {
			service.on('error',		(e) => console.log('Error in service: ' + e));
			service.on('started',	() => console.log('Service started.'));
			service.on('stopped',	() => console.log('Service stopped.', service));
			service.start();
		});

		setTimeout(collect_services[0].stop,3000);
		setTimeout(collect_services[1].stop,4000);

	} catch(e) {
		console.log(e);
	}
}

//Connect to db, then do main
mongoose_util.connect(_config.mongodb.uri).then(main);