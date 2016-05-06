//Achievements here!

module.exports = [
	{
		uniqueID:		'random-chance',
		name:			'Being Awesome',
		iconImage:		':game_die:',
		description:	'This is awarded randomly once per user per day. Whoah!',
		getLimit:		1,
		getLimitPer:	'user',
		getLimitTime:	'day',
		checkCallback: 	function(dataGetter, user) {
			return new Promise(function(resolve,reject) {

				//Everyone will always get this award! :)
				if(Math.random() > 0.9995) {
					resolve(true);
				} else {
					resolve(false);
				}


			});
		}
	},
]