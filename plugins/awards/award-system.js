var moment = require('moment');

var dataGetter;


//Award object
var Award = function(args) {
	
	//I guess we need account for a changing scope
	var self = this;

	//Default accessible properties
	self.uniqueID = ''; //max length:32
	self.name = '';
	self.iconImage = '';
	self.description = '';
	self.getLimit = 1;//1, 2, 3...
	self.getLimitPer = 'user';//user, company
	self.getLimitTime = 'day';//ever, day, week, month, year

	//Function to check if award criteria is met
	//Should return a promise
	self.checkCallback = function(dataGetter, user) {
		//    return new Promise(function (resolve, reject) { });

	};

	//Set object properties from args
	for(var i in args) {
		self[i] = args[i];
	}

	//Private variables
	self._getCount = {};
	self._getCountExpiration = {};

	//Counts awards for user
	//This function returns a promise
	self.getAwardCount = function(user) {

		//If the count is non existent or expired, we need to update it
		if(	typeof self._getCount[user.ID] === 'undefined' ||
			typeof self._getCountExpiration[user.ID] === 'undefined' ||
			moment() >= self._getCountExpiration[user.ID] )
		{

			var next_exp =moment().add(1,'day').startOf('day');

			//Since count is expired, we need to query for the count...
			var queryParams = [];
			var query = 'SELECT COUNT(*) as count FROM `awards` WHERE `awards`.`ID` = ? AND `awards`.`date` >= ?';

			var start_report = self.getLimitTime === 'ever' ? moment(new Date('0')) : moment().startOf(self.getLimitTime);
			start_report = start_report.format("YYYY-MM-DD HH:mm:ss");

			queryParams.push(self.uniqueID);
			queryParams.push(start_report);

			if(self.getLimitPer == 'user') {
				query += ' AND `awards`.`userID` = ?';
				queryParams.push(user.ID);
			}

			//Query the database
			return dataGetter.query(query,queryParams).then(function(res) {
				self._getCount[user.ID] = res[0].count;
				//This looks excessive, but it basically resets the expiration new new_exp, only if new_exp is greater than the old expiration
				self._getCountExpiration[user.ID] = self._getCountExpiration[user.ID] === 'undefined' || next_exp > self._getCountExpiration[user.ID] ? next_exp : self._getCountExpiration[user.ID]; //This count will expire at the start of tomorrow

				//Return the count
				return Promise.resolve(self._getCount[user.ID]);
			}, function(err) {
				//Could not update database, we're inconclusive
				return Promise.reject(err);
			});


		} else {
			//The count is not expired, so it's ready to return
			//Return the count
			return Promise.resolve(self._getCount[user.ID]);
		}
	}

	self.giveAward = function(user) {

		var query = 'INSERT INTO `awards` (`ID`, `userID`) VALUES ( ? , ? )';
		var queryParams = [self.uniqueID, user.ID];

		return dataGetter.query(query, queryParams).then(function() {
			//If we're successful, increment the count!
			self._getCount[user.ID]++;
		});

	}

	//Checks if user needs to be given award, returns promise
	self.maybeGiveAward = function(user) {

		//Let's make sure the user is setup correctly to be checked
		for (var i = self.requiredData.length - 1; i >= 0; i--) {
			if(typeof user[self.requiredData[i]] === 'undefined') {
				//User doesn't have this connector set up! Cannot get award :(
				return Promise.resolve();
			}
		};

		//Get award count for the period
		return self.getAwardCount(user)
		.then(function(count) {
			//Proceed if we are under the limit
			if(count < self.getLimit) {
				//Now check if the criteria is met
				return self.checkCallback(dataGetter, user);
			} else {
				//Cannot get award, limit is reached
				return Promise.resolve(false);
			}
		})
		.then(function(shouldAward) {
			if(shouldAward) {
				//Award ready to be given!
				return self.giveAward(user).then(function() {
					//Return some nice info
					return {
						user: user,
						award: self,
					};
				});
			}
		})
		.catch(function(err) {
			return Promise.reject('Error checking award "' + self.name + '" for user ' + user + '. Error: ' + err);
		});
	}
}

//Stores all the awards info
var allAwards = [];

//Adds more awards to the array for checking
function loadAwards(path) {

	var _awards = require(path);

	for (var i = _awards.length - 1; i >= 0; i--) {
		award = new Award(_awards[i]);
		allAwards.push(award);
	}

	return this;
}

//Returns a promise that is fulfilled when all awards are checked
function checkAll(user) {
	var manyPromises = [];
	var awardsGiven = [];
	var caughtErrors = [];
	for (var i = allAwards.length - 1; i >= 0; i--) {
		manyPromises.push(
			allAwards[i].maybeGiveAward(user)
			.catch(function(err) {
				caughtErrors.push(err);
			})
			.then(function(ret) {
				if(ret) {
					awardsGiven.push(ret);
				}
			})
		);
	};
	return Promise.all(manyPromises).then(function() {
		return {
			results: awardsGiven,
			errors: caughtErrors,
		}
	});
}

//We need to initialize this module to start using it, by giving it a dataGetter
function initialize(_dataGetter) {
	dataGetter = _dataGetter;
	return {
		loadAwards: loadAwards,
		checkAll: checkAll,
	};
}

module.exports = initialize;