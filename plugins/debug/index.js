/**
 * @todo load plugin stuff here
 */
module.exports = function(_config) {

	/*Plugin initializing done here...*/

	return {
		name: 'Debug Tools',
		event_handlers: require('./event-handlers.js')(_config)
	};
};