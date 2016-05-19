var toggl_dc = require('../data-collectors/toggl.js');

var DataCollector = require('../data-collector.js');

//Database stuff
//var mysqlObject = require('mysql');
var config = require('../config');

/*var mysql = mysqlObject.createPool({
	host: config.mysql.hostname,
	user: config.mysql.user,
	password: config.mysql.password,
	database: config.mysql.database
});
*/
toggl_dc = toggl_dc();
toggl_dc = new DataCollector(toggl_dc[0]);

var util = require('../mongoose-utilities');
var config = require('../config');

util.connect(config.mongodb.uri).then(function() {
	toggl_dc.dbSetup();
	function loop() {

/*	toggl_dc.initialize(toggl_dc.default_args)
	.then(function() {
		return toggl_dc._prepare_and_remove(toggl_dc.default_args);
	}).catch(console.log);*/
	toggl_dc.run().then(function(){setTimeout(loop,1000);}).catch(console.log);
	}
	loop();
});
/*toggl_dc.initialize(toggl_dc.default_args)
.then(toggl_dc.dbSetup)
.then(function() {
	return toggl_dc.prepare(toggl_dc.default_args)
})
.then(console.log)
.catch(console.log)*/
/*.then(self._collect_and_insert)
.then(self._on_success)
.catch(self._on_failure);
*/
/*toggl_dc.run().then(function(res) {
	console.log('result: ',res);
}, function(err) {
	console.log('error: ',err);
});*/