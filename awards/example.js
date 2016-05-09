//Achievements here!

module.exports = [
	{
		uniqueID:		'random-chance',
		name:			'Being Awesome',
		iconImage:		':game_die:',
		description:	'This is awarded randomly once per user per day. Whoah!',
		requiredData:	['timeclock'], 
		getLimit:		1,
		getLimitPer:	'user',
		getLimitTime:	'day',
		checkCallback: 	function(dataGetter, user) {

			//Everyone will always get this award! :)
			if(user.timeclock.user == '067') {
				return Promise.resolve(true);
			} else {
				return Promise.resolve(false);
			}
		}
	},
]