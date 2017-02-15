/** 
 * @todo  load plugin stuff here
 */			
module.exports = function(_config) {

	/*Plugin initializing done here...*/

	return {
		name: 'TimeClock',
		collectors: require('./collectors.js')(_config)
	};
};