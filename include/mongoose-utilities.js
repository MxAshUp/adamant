/* This is shared, so only one db connection is meant to be served*/

const mongoose = require('mongoose');
const _ = require('lodash');

let models = [];

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

function getModelByName(model_name) {
	let ret = _.find(models, {name: model_name});
	if(typeof(ret) === 'undefined') {
		throw Error(`Model ${model_name} not found.`);
	}
	return ret;
}

function getModelKey(model_name) {
	return getModelByName(model_name).primary_key;
}

function loadModel(model) {
	let ret_model = createModel(model.name, model.schema);
	models.push(model);
	return ret_model;
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
	loadModel: loadModel
};
