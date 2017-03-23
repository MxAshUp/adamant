const EventHandler = app_require('event-handler'),
  chalk = require('chalk');

/**
 * Event handler for debugging events. Simply logs event data to console based on event being listened for.
 *
 * @class HandlerConsoleLogger
 * @extends {EventHandler}
 */
class HandlerConsoleLogger extends EventHandler {
  /**
   * Creates an instance of HandlerConsoleLogger.
   * @param {object} args
   *
   * @memberOf HandlerConsoleLogger
   */
  constructor(args) {
    super();
    this.default_args = {
      label_style: 'bgCyan',
      event_name: ''
    };

    // Merges args with default args
    Object.assign(this.args, this.default_args, args);

    if(!this.args.event_name) {
      throw Error('event_name required.');
    }

    if(typeof(chalk[this.args.label_style]) !== 'function') {
      throw Error(`invalid chalk style: ${this.args.label_style}`);
    }

    this.event_name = this.args.event_name;
    this.supports_revert = false;
    this.version = '1.0';
    this.plugin_name = 'Debug Tools';
  }

  dispatch(data, event_id) {
    console.log(`${chalk[this.args.label_style](this.args.event_name)} (#${event_id}): ${chalk.grey(JSON.stringify(data))}`);
  }

}

module.exports = HandlerConsoleLogger;