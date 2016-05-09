var awards = [
	{
		uniqueID:		'training-wheels',
		name:			'No More Training Wheels',
		iconImage:		':bicyclist:',
		description:	'It\'s been four weeks, I think you\'ve got the hang of this!',
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
	}
];

module.exports = awards;