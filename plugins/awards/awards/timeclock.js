var moment = require('moment');

module.exports = [
	{
		uniqueID:		'early-bird',
		name:			'Early Bird',
		iconImage:		':hatched_chick:',
		description:	'First person to clock in before 8:30.',
		requiredData:	['timeclock'], 
		getLimit:		1,
		getLimitPer:	'company',
		getLimitTime:	'day',
		checkCallback: 	function(dataGetter, user) {

			var start_s = moment().startOf('day');
			var end_s = moment().startOf('day').set('hour',8).set('minute',30); //8:30 this morning

			//This query will see if user is the first one to clock in between start of day and 8:30am
			var query = 'SELECT IF((SELECT employeeId FROM `timeclock` WHERE punchInTime BETWEEN ? AND ? ORDER BY `pid` ASC LIMIT 1) = ?,1,0) as res';
			var params = [start_s.format(), end_s.format(), user.timeclock.user];
			return dataGetter.query(query,params)
			.then(function(res) {
				if(res[0].res) {
					return Promise.resolve(true);
				} else {
					return Promise.resolve(false);
				}
			});
		}
	},
	{
		uniqueID:		'early-bird-week',
		name:			'Bird Watcher',
		iconImage:		':bird:',
		description:	'First one to clock in every day for the week.',
		requiredData:	['timeclock'],
		getLimit:		1,
		getLimitPer:	'company',
		getLimitTime:	'week',
		checkCallback: 	function(dataGetter, user) {

			var start_s = moment().startOf('week');
			var end_s = moment().endOf('week');

			//This query will see if user is the first one to clock in between start of day and 8:30am
			var query = 'SELECT COUNT(*) as num_days FROM (SELECT timeclock.employeeName,timeclock.employeeId,timeclock.punchInTime FROM timeclock RIGHT JOIN (SELECT MIN(pid) as pid FROM `timeclock` WHERE timeclock.punchInTime BETWEEN ? AND ? GROUP BY DATE(punchInTime)) as T1 ON T1.pid = timeclock.pid) as T2 WHERE T2.employeeId = ?';
			var params = [start_s.format(), end_s.format(), user.timeclock.user];
			return dataGetter.query(query,params)
			.then(function(res) {
				if(res[0]) {
					var num_days = res[0].num_days;
					if(num_days == 5) {
						//If we got 5 days this week, awarded!
						return Promise.resolve(true);
					}
				}
				return Promise.resolve(false);
			});
		}
	},
	{
		uniqueID:		'rythmic',
		name:			'Rythmic',
		iconImage:		':notes:',
		description:	'Clocked in the same time each day for a week.',
		requiredData:	['timeclock'],
		getLimit:		1,
		getLimitPer:	'user',
		getLimitTime:	'week',
		checkCallback: 	function(dataGetter, user) {

			var start_s = moment().startOf('week');
			var end_s = moment().endOf('week');

			//This query will see if user is the first one to clock in between start of day and 8:30am
			var query = 'SELECT COUNT(*) as res FROM timeclock RIGHT JOIN (SELECT MIN(pid) as pid FROM `timeclock` WHERE timeclock.punchInTime BETWEEN ? AND ? AND employeeId = ? GROUP BY DATE(punchInTime)) as T1 ON T1.pid = timeclock.pid GROUP BY TIME(timeclock.punchInTime)';
			var params = [start_s.format(), end_s.format(), user.timeclock.user];
			return dataGetter.query(query,params)
			.then(function(res) {
				//If there is only 1 uniruqe clock in time this week, and there are 5 of those
				if(res.length == 1 && res[0].res == 5) {
					return Promise.resolve(true);
				}

				return Promise.resolve(false);
			});
		}
	},
	{
		uniqueID:		'night-owl',
		name:			'Night Owl',
		iconImage:		':crescent_moon:',
		description:	'Working late, clock out after 6:00.',
		requiredData:	['timeclock'], 
		getLimit:		1,
		getLimitPer:	'user',
		getLimitTime:	'day',
		checkCallback: 	function(dataGetter, user) {

			var start_s = moment().startOf('day').set('hour',18);
			var end_s = moment().endOf('day');

			//This query will see if user is the first one to clock in between start of day and 8:30am
			var query = 'SELECT `punchOutTime` FROM `timeclock` WHERE timeclock.punchOutTime BETWEEN ? AND ? AND employeeId = ? ORDER BY `pid` DESC LIMIT 1';
			var params = [start_s.format(), end_s.format(), user.timeclock.user];
			return dataGetter.query(query,params)
			.then(function(res) {
				if(res.length) {
					return Promise.resolve(true);
				}

				return Promise.resolve(false);
			});
		}
	},
	{
		uniqueID:		'weekend-warrior',
		name:			'Weekend Warrior',
		iconImage:		':crossed_swords:',
		description:	'Working on the weekend.',
		requiredData:	['timeclock'], 
		getLimit:		1,
		getLimitPer:	'user',
		getLimitTime:	'week',
		checkCallback: 	function(dataGetter, user) {

			var start_s = moment().startOf('week');
			var end_s = moment().endOf('week');

			//This query counts the clock-ins on the weekend for this week
			var query = 'SELECT COUNT(*) as res FROM `timeclock` WHERE WEEKDAY(`punchInTime`) >= 5 AND timeclock.punchInTime BETWEEN ? AND ? AND employeeId = ?';
			var params = [start_s.format(), end_s.format(), user.timeclock.user];
			return dataGetter.query(query,params)
			.then(function(res) {
				//If you clocked in at least once during the weekend
				if(res[0].res > 0) {
					return Promise.resolve(true);
				}

				return Promise.resolve(false);
			});
		}
	},
	{
		uniqueID:		'recharge',
		name:			'Recharge',
		iconImage:		':battery:',
		description:	'Awarded for taking some time off.',
		requiredData:	['timeclock'],
		getLimit:		1,
		getLimitPer:	'user',
		getLimitTime:	'month',
		checkCallback: 	function(dataGetter, user) {

			return Promise.resolve(false); //Temmporarily disabling. Issue: should award only the day you get back

			var start_s = moment().startOf('day').subtract(1,'week');
			var end_s = moment().endOf('day');

			//This query counts how many days you were present for the past week
			var query = 'SELECT IF((SELECT `punchOutTime` FROM `timeclock` WHERE `employeeId` = ? ORDER BY `punchInTime` DESC LIMIT 1) IS NOT NULL, 0, 1) AS is_clocked_in, COUNT(DISTINCT DATE(`punchInTime`)) AS days_present FROM `timeclock` WHERE timeclock.punchInTime BETWEEN ? AND ? AND `employeeId`=?';
			var params = [user.timeclock.user, start_s.format(), end_s.format(), user.timeclock.user];
			return dataGetter.query(query,params)
			.then(function(res) {
				//If you missed at least a day in the last week, and you are currently clocked in, you are awarded!
				if(res[0] && res[0].is_clocked_in && res[0].days_present < 6) {
					return Promise.resolve(true);
				}

				return Promise.resolve(false);
			});
		}
	},
	{
		uniqueID:		'40-hour-week',
		name:			'Finish Line',
		iconImage:		':checkered_flag:',
		description:	'40 hours for the week complete!',
		requiredData:	['timeclock'],
		getLimit:		1,
		getLimitPer:	'user',
		getLimitTime:	'week',
		checkCallback: 	function(dataGetter, user) {

			var start_s = moment().startOf('week');
			var end_s = moment().endOf('day');

			//Counts the clocked in hours for the date range
			var query = 'SELECT SUM(punchHRS) + (SELECT (UNIX_TIMESTAMP() - UNIX_TIMESTAMP(punchInTime))/3600 as elapsed FROM `timeclock` WHERE punchOutTime IS NULL AND timeclock.punchInTime BETWEEN ? AND ? AND employeeId = ? ORDER BY punchInTime DESC LIMIT 1) as hours FROM `timeclock` WHERE punchOutTime IS NOT NULL AND timeclock.punchInTime BETWEEN ? AND ? AND employeeId = ?';
			var params = [start_s.format(), end_s.format(), user.timeclock.user, start_s.format(), end_s.format(), user.timeclock.user];
			return dataGetter.query(query,params)
			.then(function(res) {
				//Check if hours are at least 40!
				if(res[0].hours !== null && res[0].hours >= 40) {
					return Promise.resolve(true);
				}

				return Promise.resolve(false);
			});
		}
	},
	{
		uniqueID:		'best-friends',
		name:			'Best Friends',
		iconImage:		':dancers:',
		description:	'Clocking in together.',
		requiredData:	['timeclock'],
		getLimit:		1,
		getLimitPer:	'user',
		getLimitTime:	'day',
		checkCallback: 	function(dataGetter, user) {

			var start_s = moment().startOf('day');
			var end_s = moment().endOf('day');

			//Counts the clocked in hours for the date range
			var query = 'SELECT COUNT(*) as res FROM `timeclock` as A LEFT JOIN `timeclock` as B ON A.`punchInTime`=B.`punchInTime` AND A.`pid`!=B.`pid` WHERE B.`pid` IS NOT NULL AND A.`punchInTime` BETWEEN ? AND ? AND A.employeeId = ?';
			var params = [start_s.format(), end_s.format(), user.timeclock.user];
			return dataGetter.query(query,params)
			.then(function(res) {
				//Check if we have samesies!
				if(res[0].res > 0) {
					return Promise.resolve(true);
				}

				return Promise.resolve(false);
			});
		}
	},
	{
		uniqueID:		'drinks-together',
		name:			'Let\'s Get Drinks',
		iconImage:		':beers:',
		description:	'Clocking out together.',
		requiredData:	['timeclock'],
		getLimit:		1,
		getLimitPer:	'user',
		getLimitTime:	'day',
		checkCallback: 	function(dataGetter, user) {

			var start_s = moment().startOf('day');
			var end_s = moment().endOf('day');

			//Counts the clocked in hours for the date range
			var query = 'SELECT COUNT(*) as res FROM `timeclock` as A LEFT JOIN `timeclock` as B ON A.`punchOutTime`=B.`punchOutTime` AND A.`pid`!=B.`pid` WHERE B.`pid` IS NOT NULL AND A.`punchOutTime` IS NOT NULL AND A.`punchInTime` BETWEEN ? AND ? AND A.employeeId = ?';
			var params = [start_s.format(), end_s.format(), user.timeclock.user];
			return dataGetter.query(query,params)
			.then(function(res) {
				//Check if we have samesies!
				if(res[0].res > 0) {
					return Promise.resolve(true);
				}

				return Promise.resolve(false);
			});
		}
	},
	{
		uniqueID:		'on-the-dot',
		name:			'On The Dot',
		iconImage:		':dart:',
		description:	'Clock in or out on the hour.',
		requiredData:	['timeclock'],
		getLimit:		1,
		getLimitPer:	'user',
		getLimitTime:	'day',
		checkCallback: 	function(dataGetter, user) {

			var start_s = moment().startOf('day');
			var end_s = moment().endOf('day');

			//Counts the number of on-the-dot clock-ins for the day
			var query = 'SELECT COUNT(*) as res FROM `timeclock` WHERE (MINUTE(punchInTime) = 0 OR (punchOutTime IS NOT NULL AND Minute(punchOutTime) = 0)) AND punchInFlags = \'\' AND punchOutFlags = \'\' AND `punchInTime` BETWEEN ? AND ? AND employeeId = ?';
			var params = [start_s.format(), end_s.format(), user.timeclock.user];
			return dataGetter.query(query,params)
			.then(function(res) {
				//Check if we are on the dot
				if(res[0].res > 0) {
					return Promise.resolve(true);
				}

				return Promise.resolve(false);
			});
		}
	},
	{
		uniqueID:		'archery-master',
		name:			'Archery Master',
		iconImage:		':bow_and_arrow:',
		description:	'You have the precision of a master archer!',
		requiredData:	['timeclock'],
		getLimit:		1,
		getLimitPer:	'user',
		getLimitTime:	'day',
		checkCallback: 	function(dataGetter, user) {

			var start_s = moment().startOf('day');
			var end_s = moment().endOf('day');

			//Counts the number of on-the-dot clock-ins for the day
			var query = 'SELECT SUM(IF(MINUTE(punchInTime) = 0,1,0)) + SUM(IF((punchOutTime IS NOT NULL AND Minute(punchOutTime) = 0),1,0)) as res FROM `timeclock` WHERE punchInFlags = \'\' AND punchOutFlags = \'\' AND `punchInTime` BETWEEN ? AND ? AND employeeId = ?';
			var params = [start_s.format(), end_s.format(), user.timeclock.user];
			return dataGetter.query(query,params)
			.then(function(res) {
				//Check if we were on the dot 4 times today (all clock-in and outs)
				if(res[0].res >= 4) {
					return Promise.resolve(true);
				}

				return Promise.resolve(false);
			});
		}
	},
	{
		uniqueID:		'timeclock-dj',
		name:			'Timeclock DJ',
		iconImage:		':play_pause:',
		description:	'Clocking in, in-in-in and out. Yo! Clocking in, then out, in in in then OUT.',
		requiredData:	['timeclock'],
		getLimit:		1,
		getLimitPer:	'user',
		getLimitTime:	'day',
		checkCallback: 	function(dataGetter, user) {

			var start_s = moment().startOf('day');
			var end_s = moment().endOf('day');

			//Counts the time entries for the day
			var query = 'SELECT COUNT(*) as res FROM `timeclock` WHERE `punchInTime` BETWEEN ? AND ? AND employeeId = ?';
			var params = [start_s.format(), end_s.format(), user.timeclock.user];
			return dataGetter.query(query,params)
			.then(function(res) {
				//Check if we have 4 or more time entries for the day
				if(res[0].res >= 4) {
					return Promise.resolve(true);
				}

				return Promise.resolve(false);
			});
		}
	},
	{
		uniqueID:		'second-breakfast',
		name:			'Second Breakfast',
		iconImage:		':egg:',
		description:	'What about elevenses? Luncheon? Afternoon tea? Dinner? Supper?',
		requiredData:	['timeclock'],
		getLimit:		1,
		getLimitPer:	'user',
		getLimitTime:	'day',
		checkCallback: 	function(dataGetter, user) {

			//Take lunch break before 10
			var start_s = moment().startOf('day');
			var end_s = moment().startOf('day').set('hour',10);;

			//Counts the number of time entries before 10am
			var query = 'SELECT COUNT(*) as res FROM `timeclock` WHERE `punchInTime` BETWEEN ? AND ? AND employeeId = ?';
			var params = [start_s.format(), end_s.format(), user.timeclock.user];
			return dataGetter.query(query,params)
			.then(function(res) {
				//Check if there are at least 2 time entries
				if(res[0].res >= 2) {
					return Promise.resolve(true);
				}

				return Promise.resolve(false);
			});
		}
	},
]