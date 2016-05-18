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
			collect: parseTimeEntries,
			default_args: {
				days_back_to_sync: 7
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
			onCreate: function() {
				console.log('Created');
			},
			onUpdate: function() {
				console.log('Updated');
			},
			onRemove: function() {
				console.log('Removed');
			},		
		}
	];
};


//******HELPER FUNCTIONS FOR GETTING DATA*********//

//Formats the time entry data into rows ready to insert into database
function* parseTimeEntries(data) {
	for(var entry of data) {
		yield Promise.resolve(entry);
	}
}

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

function getLocalTimeEntriesInRange(start_report, end_report) {

}