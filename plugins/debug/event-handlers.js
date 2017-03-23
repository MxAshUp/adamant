const chalk = require('chalk');

module.exports = [
  {
    default_args: {},
    event_name: 'toggl.time_entry.create',
    supports_revert: false,
    version: '0.1',
    plugin_name: '_core',
    dispatch: (data, event_id) => {
        console.log(`${chalk.bgCyan('Toggle TimeEntry')} ${chalk.green('created')}: ${chalk.grey(JSON.stringify(data))}`);
    }
  },
  {
    default_args: {},
    event_name: 'toggl.time_entry.update',
    supports_revert: false,
    version: '0.1',
    plugin_name: '_core',
    dispatch: (data, event_id) => {
      console.log(`${chalk.bgCyan('Toggle TimeEntry')} ${chalk.yellow('updated')}: ${chalk.grey(JSON.stringify(data))}`);
    }
  },
  {
    default_args: {},
    event_name: 'toggl.time_entry.remove',
    supports_revert: false,
    version: '0.1',
    plugin_name: '_core',
    dispatch: (data, event_id) => {
      console.log(`${chalk.bgCyan('Toggle TimeEntry')} ${chalk.red('removed')}: ${chalk.grey(JSON.stringify(data))}`);
    }
  }
];