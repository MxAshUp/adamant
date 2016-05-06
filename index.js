var dataGetter = require('./data-getter.js');
var notifications = require('./notifications.js');
var awardSystem = require('./award-system.js');
awardSystem = awardSystem(dataGetter);

awardSystem
	.loadAwards(require('./awards/example.js'));
/*	.loadAwards(require('./awardSystem.js'))
	.loadAwards(require('./awardSystem.js'))
	.loadAwards(require('./awardSystem.js'));*/

var chat_room_id = 'd7rTWvudhEAbnhBkM';

var users = [
	{
		userID:'101',
		rocketchatName:'lauren'
	},
	{
		userID:'067',
		rocketchatName:'dustin.woods'

	},
	{
		userID:'023',
		rocketchatName:'aaronjamesyoung'

	},
	{
		userID:'223',
		rocketchatName:'Evan'

	},
	{
		userID:'225',
		rocketchatName:'rian.sigvaldsen'

	}
];

function get_user(userID) {
	for(var i in users) {
		if(users[i].userID == userID) {
			return users[i];
		}
	}
}

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
			awardSystem.checkAll(users[i].userID).then(function(response) {
				//Response consists of results of awards, and possible errors

				//Loop through results and format them
				for (var ii = response.results.length - 1; ii >= 0; ii--) {
					var user = response.results[ii].user;
					var award = response.results[ii].award;

					if(typeof returnAwards[user] == 'undefined') {
						returnAwards[user] = [];
					}

					//Put award result in associative array
					returnAwards[user].push(award);

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
			var user = get_user(i);
			if(user.rocketchatName) {

				//loop through each user's achievements
				for (var ii in response.results[i]) {

					var message = response.results[i][ii].iconImage + "\n" + '@' + user.rocketchatName + ' has earned *' + response.results[i][ii].name + '*' + "\n" + '_' + response.results[i][ii].description + '_';

					notifications.send_message(chat_room_id,message).catch(function(err) {
						console.log(err);
					});
				}

			}

		}

		if(response.errors.length) {
			console.log("Errors: ");
			console.log(response.errors);
		}
		setTimeout(main, 1000);
	});
}

main();

/*
Was awarded achievement: %s
Was awarded new achievement: %s*/