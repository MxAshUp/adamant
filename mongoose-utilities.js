var mongoose = require('mongoose');

//Updates or inserts document.
//Resolves with true if doc is new
//Resolves with false if doc is updated
//Resolves wtih null if new data is same as old data (nothing to do)
function updateOrInsert(model,data,identifying_key) {

	return model.count(data)
	.then(function(res) {
		if(res > 0) {
			//Move along, nothing to update
			return Promise.resolve();
		} else {
			//Update time!
			var find = {};
			find[identifying_key] = data[identifying_key];

			return model.findOneAndUpdate(find, data, {
				upsert:true,
				setDefaultsOnInsert:true,
			}).then(function(oldDoc) {
				return Promise.resolve(oldDoc == null);
			});
		}
	});
}

//Attempts to delete model with lookup conditions, resolves with true if document deleted, false if not found
function maybeRemove(model,lookup) {
	return model.findOneAndRemove(lookup).then(function(res) {
		return Promise.resolve(res != null);
	});
}

//Registers model with schema nd name
function registerModel(name,schema) {
	return mongoose.model(name, mongoose.Schema(schema));	
}

//Connects to mondo db with uri
function connect(uri) {
	return mongoose.connect(uri);
}

function findData(model,lookup) {
	return model.find(lookup);
}

module.exports = {
	updateOrInsert:updateOrInsert,
	registerModel:registerModel,
	connect:connect,
	maybeRemove: maybeRemove
};