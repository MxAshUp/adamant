var vsprintf = require("sprintf-js").vsprintf,
	dataGetter = require('./data-getter.js'),
	notifications = require('./notifications.js'),
	config = require('./config.js'),
	users = require('./user-config.js');

var awardSystem = require('./award-system.js');
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
		//loop through users
		for (var i in response.results) {
			var user = users.filter(function(obj) {
				return obj.ID == i;
			});
			user = user[0];

			if(user.rocketchat.user) {

				//loop through each user's achievements
				for (var ii in response.results[i]) {
					var award = response.results[i][ii];
					var message = vsprintf("@%s has earned *%s*!\n_%s_\n%s",[user.rocketchat.user,award.name,award.description,award.iconImage]);
					notifications.send_message(config.rocketchat.roomid,message).catch(function(err) {
						console.log("Could not send notification: ", err);
					});
				}
			}
		}

		if(response.errors.length) {
			console.log("Errors: ", response.errors);
		}
		setTimeout(main, config.checkInterval);
	});
}

main();

/*
Was awarded achievement: %s
Was awarded new achievement: %s*/