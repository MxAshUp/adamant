/* This is shared, so only one db connection is meant to be served*/

var mongoose = require('mongoose');

//Connects to mondo db with uri
function connect(uri) {
	return mongoose.connect(uri);
}

module.exports = {
	mongoose:mongoose,
	connect:connect
};