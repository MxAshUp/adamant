/* todo: load plugin stuff here */

module.exports = function(_config) {

	/*Plugin initializing done here...*/

	return {
		name: 'Toggl',
		collectors: require('./collectors.js')(_config)
	};
};