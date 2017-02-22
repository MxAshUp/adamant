// Main app goes here
// Some code action is happening over in /test/

// Handle command line arguments if passed
var arg_handler = require('./include/arg-handle');


// Sample definitions
var arg_def = [
	// -v, --verbose
	new arg_handler.argDefinition({
		short: 'v',
		long: 'verbose',
		default_value: false,
		description: 'Show lots of useful goodies in the console.',
		callback: function() { }
	}),

	// --h, --help
	new arg_handler.argDefinition({
		short: 'h',
		long: 'help',
		default_value: false,
		description: 'Show help documentation somehow',
		callback: function() { }
	})
];

var commands = [
	// No argument
  new arg_handler.commandDefinition({
		command: '',
		description: 'Executes main script',
		callback: function({verbose, help, thing}) {
			console.log('ran without an arg');
			console.log('verbose? ', verbose);
			console.log('help? ', help);
			console.log('thing? ', thing);
		},
		arg_definitions: arg_def
	}),

  // "run"
	new arg_handler.commandDefinition({
		command: 'run',
		description: 'Executes main script',
		callback: function({verbose, help, thing}) {
			console.log('I am a program running!');
			console.log('What is this? ', this);
			console.log('verbose? ', verbose);
			console.log('help? ', help);
			console.log('thing? ', thing);
		},
		arg_definitions: arg_def
	})
];

arg_handler.run_args(commands,process.argv);



/* THE FOLLOWING IS TESTING CODE FOR DATA COLLECTOR SERVICE */
/*
var plugin_loader = require('./include/plugin-loader'),
	_config = require('./include/config.js'),
	mongoose_util = require('./include/mongoose-utilities'),
	Collector = require('./include/collector');

var plugins = plugin_loader.loadPlugins(_config);

var sample_config = {
	'Toggl': {
		data_collector_instances_config: [
			{
				apiToken:'771a871d9670b874655a25e20391640f'
			}
		]
	},
	'TimeClock': {
		data_collector_instances_config: [
			{
				days_back_to_sync: 1,
				url:'http://192.168.1.29/',
				user:'admin',
				password:'FVnZaHD8HyCe'
			}
		]
	}
}

function main() {
	//This loop creates an array of Collector instances based on the config
	var data_collector_instances = [];
	for(var i in plugins) {
		if(plugins[i].name in sample_config) {
			var instance_configs = sample_config[plugins[i].name].data_collector_instances_config;

			for(var ii in instance_configs) {
				for(var iii in plugins[i].data_collectors) {
					try {
						var data_collector = new Collector(plugins[i].data_collectors[iii], instance_configs[ii]);
					} catch (r) {
						console.log(r);
					}
					data_collector_instances.push(data_collector);

				}
			}
		}
	}

	//Now we run!
	for(var i in data_collector_instances) {

		//New scope
		(function() {
			var run_loop = function() {
				data_collector_instances[i].run()
				.catch(function(e) {
					console.log(e);
				})
				.then(function() {
					//console.log('done');
				})
				.then(run_loop);
			};

			run_loop();
		})();
	}
}

//Connect to db, then do main
mongoose_util.connect(_config.mongodb.uri).then(main);*/