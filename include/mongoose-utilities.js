/* This is shared, so only one db connection is meant to be served*/

const mongoose = require('mongoose');

//Set promise library to ES6 default
mongoose.Promise = global.Promise;

//Connects to mondo db with uri
function connect(uri) {
	return mongoose.connect(uri);
}

function modelExists(model_name) {
	try {
		mongoose.model(model_name); //Lets see if the model exists
		return true;
	} catch(e) {
		return false;
	}
}

function getModel(model_name) {
	return mongoose.model(model_name);
}

function getModelKey(model_name) {
	return 'id';
	// @todo - implement
}

function createModel(model_name, model_schema) {

	var schema = mongoose.Schema(model_schema);

	return mongoose.model(model_name, schema); //Nope? Let's make it

}

module.exports = {
	mongoose: mongoose,
	connect: connect,
	modelExists: modelExists,
	getModelKey: getModelKey,
	getModel: getModel,
	createModel: createModel,
};
