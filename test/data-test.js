var timeclock_dc = require('../data-collectors/timeclock.js');

//Database stuff
var mysqlObject = require('mysql');
var config = require('../config');

var mysql = mysqlObject.createPool({
	host: config.mysql.hostname,
	user: config.mysql.user,
	password: config.mysql.password,
	database: config.mysql.database
});

timeclock_dc = timeclock_dc(config,mysql);

timeclock_dc.run().then(function(res) {
	console.log('result: ',res);
}, function(err) {
	console.log('error: ',err);
});