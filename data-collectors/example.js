//requires
//var request = require('request');


//******MAIN DATA COLLECTOR DEFINITION*********//

module.exports = function(_config, _mysql) {
	return [
		{
			initialize: function(args) {
				/* Funciton here to initialize data collector, such as getting refresh token, logging in , etc... Should return a promise*/
			},
			prepare: function(args) {
				/* Function here begins the data collection, for example: get a list of data to collect. args will provide custom arguments for syncing */
			},
			collect: function*(data) {
				/* Function here is a generator, so it must yield each row of data that is to be synced. Specifically, yield a promise that will return the row of data*/
			},
			default_args: {
				/* Default args that are used for collecting and initializing, this will be the same structure as args passed in collect()*/
			},
			//define database data will be put into
			database: {
				mysql_connection: _mysql,
				mysql_table: /*Table name to sync data to*/
			},
			//run attempt paramters
			run_attempts_limit: 5,
			run_time_between_attempts: 500,
		}
	];
};


//******HELPER FUNCTIONS FOR GETTING DATA*********//

//...