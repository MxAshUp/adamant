//******HELPER FUNCTIONS FOR GETTING DATA*********//

//Currently this is a static library in that you cannot login as mutliple users.

//need to use cookies for logging in
var request = require('request'),
	cjar = request.jar(),
	cheerio = require('cheerio'),
	moment = require('moment');

request = request.defaults({jar: cjar});

//logs into mavenlink using non-api methods
function doLogin(url,username,password) {

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
function getReportHTML(url,start_date,end_date) {

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

	var current_date;

	//This is where we define how fields are parsed in the report
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


	//Get all time entry rows and date rows
	var entries = $('#pageContents > .noAccrual, #pageContents > .clear');

	var data = [];

	for (var j = entries.length - 1; j >= 0; j--) {

		//This is a row giving us the current_date, and that is all
		if($(entries[j]).attr('class') == "clear") {
			current_date = $(entries[j]).text().trim();
			continue;
		}

		var punch_id = $('.punchIn', entries[j]).attr('href');
		if(typeof punch_id === "undefined") {
			continue;
		}
		punch_id = punch_id.match(/pid=([0-9]+)/)[1];

		var data_row = {};

		data_row['pid'] = punch_id;

		//Loop through fields to parse
		for (var i in parse_fields) {
			data_row[parse_fields[i].name] = '';

			var dom_find = $(parse_fields[i].selector, entries[j]);

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
	}
}

//Export them functions
module.exports = {
	doLogin: doLogin,
	getReportHTML: getReportHTML,
	parseReport: parseReport
};