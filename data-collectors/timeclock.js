//requires
var request = require('request');
var cheerio = require('cheerio');
var moment = require('moment');


//******MAIN DATA COLLECTOR DEFINITION*********//

module.exports = function(_config, _mysql) {
	return [
		{
			//data collector initialize function, which logs in
			initialize: function(args) {
				return timeclockLogin( _config.timeclock.url, _config.timeclock.user, _config.timeclock.password );
			},
			prepare: function(args) {
				//Set report ranges
				var start_report = moment().subtract(args.days_back_to_sync,'days');
				var end_report = moment();
				//Get report data Promise
				return timeclockReport( _config.timeclock.url, start_report, end_report );
			},
			collect: function*(data) {
				for(row in parseReport(data)) {
					yield Promise.resolve(row);
				}
			},
			default_args: {
				days_back_to_sync: 7
			},
			//define database data will be put into
			database: {
				mysql_connection: _mysql,
				mysql_table: 'timeclock'
			},
			//run attempt paramters
			run_attempts_limit: 5,
			run_time_between_attempts: 500,
		}
	];
};


//******HELPER FUNCTIONS FOR GETTING DATA*********//


//need to use cookies for logging in
var cjar = request.jar();
request = request.defaults({jar: cjar});

//logs into mavenlink using non-api methods
function timeclockLogin(url,username,password) {

    var loginPage = url + '/login.html';

    loginFormData = [];
    loginFormData.username = username;
    loginFormData.password = password;
    loginFormData.buttonClicked = "Submit";

    return new Promise(function(resolve,reject) {
	    request.post({url:loginPage,form:loginFormData},function(err,res,body) {
	    	//If we were successful, then we should get a redirect
	        if(res && res.statusCode == '301') {
	            //success login!
	            resolve();
	        } else {
	        	//determine error message
	        	var error_message = '';
	        	if(err) {
	        		error_message = err;
	        	} else if(res.statusCode == '301') {
	        		error_message = 'Double check username and password.';
	        	} else if(!res) {
	        		error_message = 'No data was returned from request.';
	        	}
				reject('Could not log into time clock: ' + error_message);
	        }
	    });
    });
}

//Gets HTML content of report from timeclock
function timeclockReport(url,start_date,end_date) {

	var url = url + '/report.html';

	data = [];
	data.rt = "1";
	data.type = "7";
	data.from = start_date.format("MM/DD/YY");
	data.to = end_date.format("MM/DD/YY");
	data.eid = "0";

	return new Promise(function(resolve,reject) {
		request.get({url:url,qs:data},function(err,response,body) {
			if(err || !body) {
				reject('Could not get timeclock report. Maybe reboot timeclock? ' + err);
			} else if(response.statusCode == '301') {
				reject('Could not get timeclock report. User session probably timed out.');
			} else {
				resolve(body);
			}
		});
	});
}

//Tries to parse a float
function tryParseFloat(val) {
	try {
		return isNaN(parseFloat(val)) ? 0 : parseFloat(val);
	} catch(ex) {
		return 0;
	}
}

//Parses html report and returns array of data
function* parseReport(html) {
	var $ = cheerio.load(html);
	var entries = $('#pageContents > .noAccrual, #pageContents > .clear');

	var data = [];

	var current_date;

	var parse_fields = [
		{
			selector: '.punchEmployee > a',
			name: 'employeeId',
			parse_function: function(input) {
				return input.match(/([0-9]+)\-(.*)/)[1];
			}
		},
		{
			selector: '.punchEmployee > a',
			name: 'employeeName',
			parse_function: function(input) {
				return input.match(/([0-9]+)\-(.*)/)[2];
			}
		},
		{
			selector: 'a.punchIn .punchTime',
			name: 'punchInTime',
			parse_function: function(input) {
				if(input == "Add Punch" || !input) return;
				input = input.replace(/^(.*)([a|p])$/,"$1 $2m");
				return moment(new Date(current_date + " " + input)).format("YYYY-MM-DD HH:mm:ss");
			}
		},
		{
			selector: 'a.punchIn .punchFlags',
			name: 'punchInFlags'
		},
		{
			selector: 'a.punchIn .punchDepartment',
			name: 'punchInDepartment'
		},
		{
			selector: 'a.punchOut .punchFlags',
			name: 'punchOutFlags'
		},
		{
			selector: 'a.punchOut .punchTime',
			name: 'punchOutTime',
			parse_function: function(input) {
				if(input == "Add Punch" || !input) return;
				input = input.replace(/^(.*)([a|p])$/,"$1 $2m");
				return moment(new Date(current_date + " " + input)).format("YYYY-MM-DD HH:mm:ss");
			}
		},
		{
			selector: 'a.punchOut .punchLunch',
			name: 'punchOutLunch',
			parse_function: function(input) {
				return tryParseFloat(input)/60; //lunch is in minutes
			}
		},
		{
			selector: 'a.punchOut .punchADJ',
			name: 'punchOutADJ',
			parse_function: function(input) {
				return tryParseFloat(input);
			}
		},
		{
			selector: '.punchSTD',
			name: 'punchSTD',
			parse_function: function(input) {
				return tryParseFloat(input);
			}
		},
		{
			selector: '.punchOT1',
			name: 'punchOT1',
			parse_function: function(input) {
				return tryParseFloat(input);
			}
		},
		{
			selector: '.punchOT2',
			name: 'punchOT2',
			parse_function: function(input) {
				return tryParseFloat(input);
			}
		},
		{
			selector: '.punchHOL',
			name: 'punchHOL',
			parse_function: function(input) {
				return tryParseFloat(input);
			}
		},
		{
			selector: '.punchHRS',
			name: 'punchHRS',
			parse_function: function(input) {
				return tryParseFloat(input);
			}
		},
		{
			selector: '.punchLaborDS',
			name: 'punchLaborDS',
			parse_function: function(input) {
				input = input.replace("$","");
				return tryParseFloat(input);
			}
		},
		{
			selector: '.punchLabor',
			name: 'punchLabor',
			parse_function: function(input) {
				return tryParseFloat(input);
			}
		},
	];

	entries.each(function(i,el) {

		//This is a row giving us the current_date
		if($(this).attr('class') == "clear") {
			current_date = $(this).text().trim();
			return;
		}


		var data_row = {};

		var punch_id = $('.punchIn',this).attr('href');
		punch_id = punch_id.match(/pid=([0-9]+)/)[1];

		data_row['pid'] = punch_id;

		for (var i = parse_fields.length - 1; i >= 0; i--) {
			data_row[parse_fields[i].name] = '';

			var dom_find = $(parse_fields[i].selector,this);
			var val = '';

			if(dom_find.length != 1) {
				val = '';
			} else {
				val = dom_find.text().trim();
			}

			if(typeof parse_fields[i].parse_function !== "undefined") {
				try {
					val = parse_fields[i].parse_function(val);
				} catch(ex) {
					val = '';
				}
			}

			data_row[parse_fields[i].name] = val;
		}

		yield data_row;
	});

}

