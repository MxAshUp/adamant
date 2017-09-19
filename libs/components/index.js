glob = require('glob');

// Get all files this this director, except self (index)
const components = glob.sync(`${__dirname}/*.js`, {ignore: __filename}).map(require);

// Load models
const models = glob.sync(`${__dirname}/models/*`).map(require);

module.exports = {
  // mp-core components
  components,
	models,
};