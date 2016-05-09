//requires
var request = require('request');
var cheerio = require('cheerio');
var moment = require('moment');
var config  = require('../config.js');

//need to use cookies for logging in
var cjar = request.jar();
request = request.defaults({jar: cjar});

var initialized = false;

//logs into mavenlink using non-api methods
function timeclockLogin(username,password,callback) {

    var loginPage = config.timeclock.url + '/login.html';

    loginFormData = [];
    loginFormData.username = username;
    loginFormData.password = password;
    loginFormData.buttonClicked = "Submit";

    return new Promise(function(resolve,reject) {
	    request.post({url:loginPage,form:loginFormData},function(err,res,body) {
	    	//If we were successful, then we should get a redirect
	        if(res && res.statusCode == '301') {
	            //success login!
				initialized = true;
	            resolve();
	        } else {
				initialized = false;
				reject("Could not log into time clock.");
	        }
	    });
    });

}

//Gets rows of data within date range
function timeclockReport(start_date,end_date) {

	var url = config.timeclock.url + '/report.html';

	data = [];
	data.rt = "1";
	data.type = "7";
	data.from = start_date.format("MM/DD/YY");
	data.to = end_date.format("MM/DD/YY");
	data.eid = "0";

	return new Promise(function(resolve,reject) {
		request.get({url:url,qs:data},function(err,response,body) {
			if(err || !body || response.statusCode == '301') {
				reject();
			} else {
				resolve(parseReport(body));
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
function parseReport(html) {
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

		data.push(data_row);
	});

	return data;
}





/**
* Run this script frequently to sync time entries to a mysql database. It's fun!
*
**/


function main() {

	//Decided if we need to login
	var login_resolve;

	if(initialized) {
		login_resolve = Promise.resolve();
	} else {
		login_resolve = timeclockLogin(config.timeclock_login.user,config.timeclock_login.password);
	}

	return login_resolve.then(function() {
		//Set report ranges
		var start_report = moment().startOf('week');
		var end_report = moment();
		//Run report
		timeclockReport(start_report,end_report).then(function(data) {

			if(data === false) {
				//An error occured, :(
				return Promise.reject();
			}

			//Time to insert rows
			var insert_promises = [];

			for (var i = data.length - 1; i >= 0; i--) {
				insert_promises.push(data.query('REPLACE INTO `proq-time-machine`.`timeclock` SET ?',data[i]));
			}

			return Promise.all(insert_promises)
		});
	});
}

