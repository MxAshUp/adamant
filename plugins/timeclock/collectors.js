//requires
var moment = require('moment'),
	timeclock = require('./timeclock.js');

//******MAIN DATA COLLECTOR DEFINITION*********//

module.exports = function(_config) {
	return [
		{
			model_name: 'timeclock_timeEntry',
			model_id_key: 'pid',
			model_schema: {
				pid: String,
				employeeId: String,
				employeeName: String,
				punchInTime: Date,
				punchInFlags: String,
				punchInDepartment: String,
				punchOutFlags: String,
				punchOutTime: Date,
				punchOutLunch: Number,
				punchOutADJ: Number,
				punchSTD: Number,
				punchOT1: Number,
				punchOT2: Number,
				punchHOL: Number,
				punchHRS: Number,
				punchLaborDS: Number,
				punchLabor: Number,
			},
			default_args: {
				days_back_to_sync: 7,
				url:'',
				user:'',
				password:''
			},
			initialize: function(args) {
				return timeclock.doLogin( args.url, args.user, args.password );
			},
			prepare: function(args) {
				//Set report ranges
				var start_report = moment().subtract(args.days_back_to_sync,'days');
				var end_report = moment();
				//Get report data Promise
				return timeclock.getReportHTML( args.url, start_report, end_report );
			},
			collect: function* (data, args) {
				for(var data_row of timeclock.parseReport(data)) {
					yield data_row;
				}
			},
			garbage: function(data, args) {
				/** 
				 * @todo Check if local time entry is not in data, then delete it
				 */				
				return [];
			},
		}
	];
};
