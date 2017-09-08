glob = require('glob');

module.exports = {
  // mp-core components
  collectors: glob.sync(`${__dirname}/collectors/*`).map(require),
	event_handlers: glob.sync(`${__dirname}/event-handlers/*`).map(require),
	models: glob.sync(`${__dirname}/models/*`).map(require),
};