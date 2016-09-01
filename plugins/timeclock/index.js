/* todo: load plugin stuff here */

module.exports = function(_config) {

	/*Plugin initializing done here...*/

	_config['timeclock'] = { /*These settings should be in plugin */
		url: 'http://192.168.1.29',
		user: 'admin',
		password: 'FVnZaHD8HyCe'
	};

	return {
		name: 'TimeClock',
		data_collectors: require('./data-collectors.js')(_config)
	};
};