//Achievements here!

/*
First Week Complete :flag_white: 
1..2..4..10 Year Pro Q Anniversary :one: 
Birthday :birthday: 
*/

var awards = [
	{
		uniqueID:		'birthday',
		name:			'Happy Birthday',
		iconImage:		':birthday:',
		description:	'Happy Birthday to you!',
		requiredData:	['dates'], 
		getLimit:		1,
		getLimitPer:	'user',
		getLimitTime:	'year',
		checkCallback: 	function(dataGetter, user) {
			//Check if dates are defined
			if(!user.dates.birthday) {
				return Promise.resolve(false);
			}

			//Get the Date of users birthday this year 
			var this_year_birth_date = new Date(user.dates.birthday);
			this_year_birth_date.setYear((new Date()).getYear() + 1900);

			//Check if today is the user's birthday
			if((new Date()).toDateString() == this_year_birth_date.toDateString()) {
				return Promise.resolve(true); //Birthday time!
			} else {
				return Promise.resolve(false); //Unbirthday time :(
			}
		}
	}
]

//Create work anniversaries
//Words for each work anniversary
var number_words = ['One','Two','Three','Four','Five','Six','Seven','Eight','Nine','Ten'];
//Loop through words
for (var i = number_words.length - 1; i >= 0; i--) {
	(function() {
		var index = i;
		awards.push({
			uniqueID:		number_words[i].toLowerCase() + '-year-anniversary',
			name:			number_words[i] + ' Year Award',
			iconImage:		':'+number_words[i]+':',
			description:	'Congratulations on your ' + number_words[i].toLowerCase() + ' year work anniversary.',
			requiredData:	['dates'], 
			getLimit:		1,
			getLimitPer:	'user',
			getLimitTime:	'ever',
			checkCallback: 	function(dataGetter, user) {
				//Check if dates are defined
				if(!user.dates.hiredate) {
					return Promise.resolve(false);
				}

				//Get the Date of users birthday this year 
				var anniversary_date = new Date(user.dates.hiredate);
				//Add i years to date of hire
				anniversary_date.setYear(anniversary_date.getYear() + 1900 + index + 1);

				//Check if we've past the mark! If so, award it :)
				if((new Date()) > anniversary_date) {
					return Promise.resolve(true); //Anniversary
				} else {
					return Promise.resolve(false); //No anniversary
				}
			}
		});
	})()
};


module.exports = awards;