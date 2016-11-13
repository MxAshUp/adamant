var request = require('request');

var config = require('./config.js');

// Auth token and user ID for proq.bot:
var rocketchat_headers = {
  'X-Auth-Token': config.rocketchat.token,
  'X-User-Id': config.rocketchat.user,
  'Content-Type': 'application/json'
};

function send_message(room,message) {
/*	console.log(message);
	return Promise.resolve();*/
	return new Promise((resolve,reject) => {
		// Send to notifications room
		request({
			headers: rocketchat_headers,
			body: JSON.stringify({msg: message}),
			uri: config.rocketchat.url+'/rooms/'+room+'/send',
			method: 'POST'
		}, (err, res, body) => {
			if(err) {
				reject(err);
			} else {
				resolve();
			}
		});
	});
}


module.exports = {
	send_message: send_message
};
