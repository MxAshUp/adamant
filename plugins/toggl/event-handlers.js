const chalk = require('chalk');

module.exports = (_config) => {
	return [
		{
      default_args: {},
      event_name: 'toggl_timeEntry.create',
      supports_revert: false,
      version: '0.1',
      plugin_name: '_core',
      dispatch: (data, event_id) => {
         console.log(`${chalk.bgCyan('Toggle TimeEntry')} ${chalk.green('created')}: ${chalk.grey(JSON.stringify(data))}`);
      }
    },
		{
      default_args: {},
      event_name: 'toggl_timeEntry.update',
      supports_revert: false,
      version: '0.1',
      plugin_name: '_core',
      dispatch: (data, event_id) => {
        console.log(`${chalk.bgCyan('Toggle TimeEntry')} ${chalk.yellow('updated')}: ${chalk.grey(JSON.stringify(data))}`);
      }
    },
		{
      default_args: {},
      event_name: 'toggl_timeEntry.remove',
      supports_revert: false,
      version: '0.1',
      plugin_name: '_core',
      dispatch: (data, event_id) => {
        console.log(`${chalk.bgCyan('Toggle TimeEntry')} ${chalk.red('removed')}: ${chalk.grey(JSON.stringify(data))}`);
      }
    }
  ];
};