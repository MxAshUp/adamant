/**
 * @todo load plugin stuff here
 */

module.exports = {
	name: 'Toggl',
	collectors: [require(__dirname + '/collectors/time-entry')],
	models: [require(__dirname + '/models/time-entry')]
};
