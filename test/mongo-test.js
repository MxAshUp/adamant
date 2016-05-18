var mongoose = require('mongoose');
var util = require('../mongoose-utilities');
var config = require('../config');

util.connect(config.mongodb.uri).then(function() {

	var Kitten = util.registerModel('Kitten',{
	    name: String,
	    color: String
	});

	var identifying_key = 'name';
	var update_to = {name: 'Maxwell a152', color: 'freaaaaas'};


util.maybeDelete(Kitten,{name: 'Maxwell a152'});

/*	util.updateOrInsert(Kitten,update_to,identifying_key).then(function(res) {
		if(res === true) {
			console.log('New row!');
		} else if(res === false) {
			console.log('Updated row!');
		} else {
			console.log('Nothing');
		}
	}).catch(function(err) {
		console.log(err);
	});
	*/

}).catch(console.log);
