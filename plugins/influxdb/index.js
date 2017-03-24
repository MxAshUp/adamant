/**
 * @todo load plugin stuff here
 */
module.exports = {
	name: 'InfluxDB Tools',
	event_handlers: [require('./event-handlers/write-points')]
};