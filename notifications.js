var request = require('request');

var rocketchat_url = 'http://192.168.1.5:3000/chat/api';
// Auth token and user ID for proq.bot:
var rocketchat_headers = {
  'X-Auth-Token': '5lV2Ju3IbjlVt9xs1MeX1E60Xx5IDagbGRAcAk8pkIQ',
  'X-User-Id': 'rocket.cat',
  'Content-Type': 'application/json'
};


function send_message(room,message) {
	return new Promise(function(resolve,reject) {
		// Send to notifications room, room ID is "PxMkZA9G26ATFdWKS":
		request({
			headers: rocketchat_headers,
			body: JSON.stringify({msg: message}),
			uri: rocketchat_url+'/rooms/'+room+'/send',
			method: 'POST'
		}, function(err, res, body) {
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
