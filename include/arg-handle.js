/**
 * This file describes how to handle all command line args passed to the app
 *
 * Args:
 * -v --verbose
 */

var minimist = require('minimist'),
	_ = require('lodash');

class arg_definition {
	constructor(options) {

		//Set default properties
		this.short = '';
		this.long = '';
		this.description = '';
		this.validate = undefined;

		//Set object properties from options parameter
		_.each(_.keys(this), k => this[k] = this[k] || options[k]);

	}
}

class command_definition {
	constructor(options) {

		//Set default properties
		this.command = '';
		this.description = '';
		this.callback = undefined;
		this.arg_definitions = [];

		//Add arg definitions using add_argument_definition
		_.each(options['arg_definitions'] || [], k => this.add_argument_definition(k));
		delete options['arg_definitions'];

		//Set object properties from options parameter
		_.each(_.keys(this), k => this[k] = this[k] || options[k]);

	}

	//Adds argument definition
	add_argument_definition(arg) {
		this.arg_definitions.push(arg);
	}

	//Calls a command's callback with arguments
	run_command(args, context) {
		return this.callback.apply(context, [args]);
	}

}

//Parses arguments by cross checking with argument definitions
class argv_parser {
	constructor(arg_definitions, _args) {
		this.arg_definitions = arg_definitions;
		this.args = {};

		this.args = this.base_args = minimist(_args.slice(2), {default: this.default_args_map});
		this.args = this.short_keys_to_long();
	}

	//Expands longhand options to shorthand
	short_keys_to_long() {
		return _.mapKeys(this.args,
					(arg, k) => _.defaultTo(_.find(this.arg_definitions, {short: k}), {long: k}).long
				);
	}

	//Returns map of each key (shorthand) and default value (if any)
	get default_args_map() {
		var default_args = _.mapKeys(this.arg_definitions, arg => arg.short);
		default_args = _.mapValues(default_args, arg => arg.default_value);
		default_args = _.pickBy(default_args, arg => typeof arg !== 'undefined');
		return default_args;
	}

	//Returns keys of unknown args (if any)
	get unknown_args() {
		return _.keys(
					_.pickBy(this.base_args,
						(arg, k) => _.isUndefined(_.find(this.arg_definitions, {short: k})) && _.isUndefined(_.find(this.arg_definitions, {long: k}))
					)
				).filter(arg => arg !== '_');
	}
}

function run_args(commands, argv) {

	this.commands = commands;

	//Parse and run
	var pargv = minimist(argv.slice(2), {});

	var command = pargv['_'];
	if(command.length > 1) {
		//TODO: show help and syntax
		console.log('Unknown command: ', command);
		return 1;
	} else if(command.length == 0) {
		//Set default command
	} else {
		command = command[0];
	}

	var o_command = _.find(commands, cmd => cmd.command == command);

	if(typeof o_command === 'undefined') {
		console.log('Unknown command: ', command);
		return 1;
	}

	parsed_args = new argv_parser(o_command.arg_definitions, argv);

	return o_command.run_command(parsed_args.args, this);

}



module.exports = {
	run_args: run_args,
	arg_definition: arg_definition,
	command_definition: command_definition
};