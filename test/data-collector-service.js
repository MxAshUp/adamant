var plugin_loader = require('../include/plugin-loader'),
	_config = require('../include/config.js'),
	mongoose_util = require('../include/mongoose-utilities'),
	DataCollector = require('../include/data-collector');

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
				days_back_to_sync: 7,
				url:'http://192.168.1.29/',
				user:'admin',
				password:'FVnZaHD8HyCe'
			}
		]
	}
}



mongoose_util.connect(_config.mongodb.uri).then(function() {

	var data_collector_instances = [];

	for(var i in plugins) {
		if(plugins[i].name in sample_config) {
			var instance_configs = sample_config[plugins[i].name].data_collector_instances_config;

			for(var ii in instance_configs) {
				for(var iii in plugins[i].data_collectors) {
					try {
						var data_collector = new DataCollector(plugins[i].data_collectors[iii], instance_configs[ii]);
					} catch (r) {
						console.log(r);
					}
					data_collector_instances.push(data_collector);

				}
			}
		}
	}

	for(var i in data_collector_instances) {

		data_collector_instances[i].run()
		.catch(function(e) {
			console.log(e);
		})
		.then(function() {
			console.log('finished');
		});
	}

/*	toggl_dc.dbSetup();
	function loop() {

		toggl_dc.run().then(
			function(){
				setTimeout(loop,1000);
			}
		).catch(console.log);
	}
	loop();*/
});