/**
 * @todo load plugin stuff here
 */
module.exports = {
	name: 'Asana',
	collectors: [require('./collectors/asana_project')],
	models: [require('./models/asana_project')]
};
