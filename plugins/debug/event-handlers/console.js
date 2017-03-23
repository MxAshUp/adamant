const EventHandler = app_require('event-handler'),
  chalk = require('chalk');

class HandlerConsoleLogger extends EventHandler {
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