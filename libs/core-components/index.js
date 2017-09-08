glob = require('glob');

module.exports = {
  // mp-core components
  collectors: glob.sync(__dirname + '/libs/core-components/collectors/*').map(require),
	event_handlers: glob.sync(__dirname + '/libs/core-components/event-handlers/*').map(require),
	models: glob.sync(__dirname + '/libs/core-components/models/*').map(require),
};