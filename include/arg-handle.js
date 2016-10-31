/**
 * This file describes how to handle all command line args passed to the app
 *
 * Args:
 * -v --verbose
 */

var minimist = require('minimist'),
	_ = require('lodash');

class something {

}
var arg_definitions = [
	{
		short: 'v',
		long: 'verbose',
		default_value: false,
		description: 'Show lots of useful goodies in the console.',
		callback: function() {

		}
	},
	{
		short: 'h',
		long: 'help',
		description: 'Displays a list of options and commands for Metric Platform.',
		callback: function() {
			console.log(arg_definitions);
		}
	}
];

class argv_parser {
	constructor(arg_definitions, _args) {
		this.arg_definitions = arg_definitions;
		this.args = [];

		this.args = _args;
		this.args = this.long_keys_to_short(this.args);
	}

	//Expands longhand options to shorthand
	long_keys_to_short() {
		return _.mapKeys(args,
					(arg, k) => _.defaultTo(_.find(this.arg_definitions, {long: k}), {short: k}).short
				);
	}

	//Returns map of each key (shothad) and default value (if any)
	get default_args_map() {
		var default_args = _.mapKeys(this.arg_definitions, arg => arg.short);
		default_args = _.mapValues(default_args, arg => arg.default_value);
		default_args = _.pickBy(default_args, arg => typeof arg !== 'undefined');
		return default_args;
	}

	//Returns keys of unknown args (if any)
	get unknown_args() {
		return _.keys(
					_.pickBy(args,
						(arg, k) => _.isUndefined(_.find(this.arg_definitions, {short: k})) && _.isUndefined(_.find(this.arg_definitions, {long: k}))
					)
				).filter(arg => arg !== '_');
	}
}

//
//function validate_


var default_args = get_default_args_map(arg_definitions);

var args = minimist(process.argv.slice(2), {default: default_args})

//Check if unknown args were passed, display message and move on
if((unknown_args = get_unknown_args(args, arg_definitions)).length) {
	console.log('Unknown options (will be ignored): ', unknown_args);
	args = _.omit(args, unknown_args);
}

//Convert long arg keys to short sytax
args = long_keys_to_short(args, arg_definitions);

console.log(args);
