var awards = [
	{
		uniqueID:		'training-wheels',
		name:			'No More Training Wheels',
		iconImage:		':bicyclist:',
		description:	'It\'s 4 weeks at Pro Q!',
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
			var four_weeks_later = new Date(user.dates.hiredate);
			//Adds 4 weeks from date of hire
			four_weeks_later.setDate(four_weeks_later.getDate() + 4*7);

			//Check if we've past the mark! If so, award it :)
			if((new Date()) > four_weeks_later) {
				return Promise.resolve(true);
			} else {
				return Promise.resolve(false);
			}
		}
	},
	{
		uniqueID:		'welcome',
		name:			'Liftoff',
		iconImage:		':rocket:',
		description:	'Welcome to Pro Q!',
		requiredData:	['dates'],
		getLimit:		1,
		getLimitPer:	'user',
		getLimitTime:	'ever',
		checkCallback: 	function(dataGetter, user) {
			//Check if dates are defined
			if(!user.dates.hiredate) {
				return Promise.resolve(false);
			}

			//Get the Date of users hiredate this year
			var hire_date = new Date(user.dates.hiredate);

			//Check if today is the user's hiredate
			if((new Date()).toDateString() == hire_date.toDateString()) {
				return Promise.resolve(true);
			} else {
				return Promise.resolve(false);
			}
		}
	}
];

module.exports = awards;