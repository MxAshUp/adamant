//requires
var TogglClient = require('toggl-api');
var moment = require('moment');

//******MAIN DATA COLLECTOR DEFINITION*********//

module.exports = function() {
	return [
		{
			initialize: function(args) {
				var self = this;
				self.toggl = new TogglClient({apiToken: '771a871d9670b874655a25e20391640f'});//771a871d9670b874655a25e20391640f
				return Promise.resolve();
			},
			prepare: function(args) {
				var self = this;
				//Set report ranges
				var start_report = moment().subtract(args.days_back_to_sync,'days');
				var end_report = moment();
				//Get time entries
				return getTimeEntries(self.toggl,start_report,end_report);
			},
			collect: function* (data, args) {
				for(var entry of data) {
					yield Promise.resolve(entry);
				}
			},
			remove: function(data, args) {
				var self = this;
				var start_report = moment().subtract(args.days_back_to_sync,'days');
				var end_report = moment();
				return getRemovedEntries.call(this,data,start_report,end_report);
			},
			default_args: {
				days_back_to_sync: 1
			},
			model_schema:{
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
			model_key:'id',
			model_name:'toggl_timeEntry',
			onCreate: function(val) {
				console.log('Created',val);
			},
			onUpdate: function(val) {
				console.log('Updated',val);
			},
			onRemove: function(val) {
				console.log('Removed',val);
			},		
		}
	];
};


//******HELPER FUNCTIONS FOR GETTING DATA*********//

//Gets time entries in range
function getTimeEntries(toggl_client, start_report, end_report) {
	return new Promise(function(resolve,reject) {
		toggl_client.getTimeEntries(start_report, end_report, function(err,data) {
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
}


//This function compares the entries in Toggl and the entries in local db,
//then returns the entries that are only in the local db. These need to be removed.
function getRemovedEntries(new_entries, start_report, end_report) {
	var entries_to_remove
	return this.model.find({at:{"$gte": start_report, "$lt": end_report}})
	.then(function(old_entries) {
		//Get the id's of the new entries
		new_entries = new_entries.map(function(obj) {return ''+obj.id;});

		//Get the id's of the old entries
		old_entries = old_entries.map(function(obj) {return obj.id;});

		//Find which entries exist in the old, but not the new, these need to be removed
		entries_to_remove = old_entries.filter(function(i) {return new_entries.indexOf(i) < 0;});

		//Make entries to remove into lookup objects
		entries_to_remove = entries_to_remove.map(function(id) {return {id:id};});

		return Promise.resolve(entries_to_remove);
	});
}