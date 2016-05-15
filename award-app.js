var vsprintf = require("sprintf-js").vsprintf,
	dataGetter = require('./data-getter.js'),
	notifications = require('./notifications.js'),
	config = require('./config.js'),
	users = require('./user-config.js');

var awardSystem = require('./award.js');
	awardSystem = awardSystem(dataGetter);

awardSystem
	.loadAwards('./awards/dates.js')
	.loadAwards('./awards/new-employees.js')
	.loadAwards('./awards/timeclock.js');
/*	.loadAwards('./awards/example.js')
	.loadAwards('./awards/example.js')
	.loadAwards('./awards/example.js');*/



//Loops through all users, and checks is awards are given
function checkAllUserAchievements() {
	//Promises for all checks
	var manyPromises = [];
	//Array of awards that were given
	var returnAwards = {};
	//Array of errors that happen while checking
	var returnErrors = [];

	//Loop through users
	for (var i = users.length - 1; i >= 0; i--) {

		//Check awards given, add promise to array
		manyPromises.push(
			//Check all awards for user[i]
			awardSystem.checkAll(users[i]).then(function(response) {
				//Response consists of results of awards, and possible errors

				//Loop through results and format them
				for (var ii = response.results.length - 1; ii >= 0; ii--) {
					var user = response.results[ii].user;
					var award = response.results[ii].award;

					if(typeof returnAwards[user.ID] == 'undefined') {
						returnAwards[user.ID] = [];
					}

					//Put award result in associative array
					returnAwards[user.ID].push(award);

				}

				//Concatenate possible errors
				returnErrors = returnErrors.concat(response.errors);
			})
		);
	};
	return Promise.all(manyPromises).then(function() {
		//Finally return the results of the whole check:
		return {
			results: returnAwards,
			errors: returnErrors,
		}
	});
}

//Main check loop
function main() {
	checkAllUserAchievements().then(function(response) {

		var grouped_by_award = {};
		//Loop through user IDs
		for (var i in response.results) {
			//loop through awards
			for (var ii = response.results[i].length - 1; ii >= 0; ii--) {
				var award = response.results[i][ii];
				if(typeof grouped_by_award[award.uniqueID] == "undefined") {
					grouped_by_award[award.uniqueID] = {
						award: award,
						users: []
					}
				}
				grouped_by_award[award.uniqueID]['users'].push(i);
			}
		}


		for (var i in grouped_by_award) {

			var user_string = '';
			var user_names = [];
			for (var ii = grouped_by_award[i].users.length - 1; ii >= 0; ii--) {

				var user = users.filter(function(obj) {
					return obj.ID == grouped_by_award[i].users[ii];
				});
				user = user[0];

				if(user.rocketchat.user) {
					user_names.push('@' + user.rocketchat.user);
				}
			}

			if(user_names.length == 0) {
				continue;
			}

			//Turn names into readable english list with oxford comma
			user_string = user_names.length == 1 ? user_names[0] : user_names.slice(0,-1).join(', ') + ' and '+user_names[user_names.length-1];

			var has_or_have = user_names.length > 1 ? 'have' : 'has';

			var award = grouped_by_award[i].award;
			var message = vsprintf("%s %s earned *%s*!\n_%s_\n%s",[user_string,has_or_have,award.name,award.description,award.iconImage]);
			notifications.send_message(config.rocketchat.roomid,message).catch(function(err) {
				console.log("Could not send notification: ", err);
			});
		}

		setTimeout(main, config.checkInterval);
	});
}

main();

/*
Was awarded achievement: %s
Was awarded new achievement: %s*/