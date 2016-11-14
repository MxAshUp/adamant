//requires
var TogglClient = require('toggl-api'),
	moment = require('moment'),
	_ = require('lodash');

//******MAIN DATA COLLECTOR DEFINITION*********//

module.exports = function() {
	return [
		{
			model_name:'toggl_timeEntry',
			model_id_key:'id',
			model_schema: {
				id: String,
				guid: String,
				wid: String,
				pid: String,
				tid: String,
				billable: Boolean,
				start: Date,
				stop: Date,
				duration: Number,
				duronly: Boolean,
				at: Date,
				uid: String,
				description: String,
				tags: [String]
			},
			default_args: {
				days_back_to_sync: 1,
				apiToken:''
			},
			initialize: function(args) {
				var self = this;
				try {
					self.toggl = new TogglClient({apiToken: args.apiToken});
					return Promise.resolve();
				} catch(e) {
					return Promise.reject(e);
				}
			},
			prepare: function(args) {
				var self = this;
				//Set report ranges
				var start_report = moment().subtract(args.days_back_to_sync,'days');
				var end_report = moment();
				//Get time entries
				return new Promise((resolve,reject) => {
					self.toggl.getTimeEntries(start_report, end_report, (err,data) => {
						//Error getting data
						if(err) {
							if(err.code == '403') {
								err.data = err.data ? '' : ("Auth failed, check API token.");
							}
							reject("API Error (code: " + err.code + "): "+err.data);
						} else {
							resolve(data);
						}
					});
				});
			},
			collect: function(data, args) {
				return data;
			},
			remove: function(data, args) {
				var self = this;
				var start_report = moment().subtract(args.days_back_to_sync,'days');
				var end_report = moment();

				var entries_to_remove;

				//This function compares the entries in Toggl and the entries in local db,
				//then returns the entries that are only in the local db. These need to be removed.
				return this.model.find({at:{"$gte": start_report, "$lt": end_report}})
				.then(function(old_entries) {
					//Get the id's of the new entries
					new_entries = _.map(data, (obj) => String(obj.id));

					//Get the id's of the entries currently stored
					old_entries = _.map(old_entries, (obj) => String(obj.id));

					//Find which entries exist in the old, but not the new, these need to be removed
					entries_to_remove = _.difference(old_entries, new_entries);

					//Make entries to remove into lookup objects
					entries_to_remove = _.map(entries_to_remove, (idv) => {return {id:idv}});

					return entries_to_remove;
				});
			},
		}
	];
};
