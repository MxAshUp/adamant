
//This is likely to be retired... no more native mysql

var mysqlObject = require('mysql');
var config = require('./config.js');

var mysql = mysqlObject.createPool({
	connectionLimit: 10,
	host: config.mysql.hostname,
	user: config.mysql.user,
	password: config.mysql.password,
	database: config.mysql.database
});

module.exports = {
	query: function(query,params) {
		return new Promise((resolve, reject) => {
			mysql.query(query, params, (error, results, fields) => {
				if(error) {
					reject(error);
				} else {
					resolve(results);
				}
			});
		});
	},
	mysql: mysql
};