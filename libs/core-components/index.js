glob = require('glob');

const models = glob.sync(`${__dirname}/models/*`).map(require);
const collectors = glob.sync(`${__dirname}/collectors/*`).map(require);
const event_handlers = glob.sync(`${__dirname}/event-handlers/*`).map(require);
const components = [].concat(event_handlers, collectors);

module.exports = {
  // mp-core components
  components,
	models,
};