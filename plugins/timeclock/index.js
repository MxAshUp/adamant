/**
 * @todo  load plugin stuff here
 */
module.exports = {
	name: 'TimeClock',
	collectors: [require('./collectors/punch')],
	models: [require('./models/punch')]
};