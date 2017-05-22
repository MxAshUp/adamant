/* This is shared, so only one db connection is meant to be served*/

let mongoose = require('mongoose'),
		_ = require('lodash');


let models = [];

//Set promise library to ES6 default
mongoose.Promise = global.Promise;

function modelExists(model_name) {
	try {
		return typeof mongoose.model(model_name) !== 'undefined'; //Lets see if the model exists
	} catch(e) {
		return false;
	}
}

function getModelByName(model_name) {
	let ret = _.find(models, {name: model_name});
	if(typeof(ret) === 'undefined') {
		throw Error(`Model ${model_name} not found.`);
	}
	return ret;
}

function loadModel(model) {
	let ret_model = mongoose.model(model.name, mongoose.Schema(model.schema));
	models.push(model);
	return ret_model;
}


module.exports = {
	mongoose: mongoose,
	modelExists: modelExists,
	getModelByName: getModelByName,
	loadModel: loadModel
};
