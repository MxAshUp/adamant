/* todo: load plugin stuff here */

module.exports = function(_config) {

	/*Plugin initializing done here...*/

	return {
		name: 'Toggl',
		data_collectors: require('./collectors.js')(_config)
	};
};