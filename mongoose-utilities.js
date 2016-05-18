var mongoose = require('mongoose');

//Connects to mondo db with uri
function connect(uri) {
	return mongoose.connect(uri);
}

module.exports = {
	mongoose:mongoose,
	connect:connect
};