var expect = require('chai').expect;

var sinon = require('sinon');

var arg_handle = require('../include/arg-handle');



describe('Command line', function() {
	describe('Arg handler', function() {

		//Sample argument definitions
		var arg_def_verbose = new arg_handle.arg_definition({
			short: 'v',
			long: 'verbose',
			default_value: false,
			description: 'Show lots of useful goodies in the console.',
		});
		var arg_def_user = new arg_handle.arg_definition({
			short: 'u',
			long: 'user',
			default_value: 0,
			description: 'Sets user for running.',
		});

		var sinon_callback = sinon.spy();

		var commands = [
			new arg_handle.command_definition({
				command: 'run',
				description: 'Executes main script',
				callback: sinon_callback,
				arg_definitions: [
					arg_def_verbose,
					arg_def_user
				]
			})
		];

		function test_command(command) {
			var command_base = [ '/usr/local/bin/node', '/usr/src/app/app.js' ];
			command = command_base.concat(command.split(' '));
			if(arg_handle.run_args(commands,command) == 1) {
				//If it returns 1 (exit code), then error!
				throw 'Exit code 1';
			}
			return sinon_callback.args[sinon_callback.args.length - 1];
		}

		var test_commands = [
			{
				command: 'run',
				expected_args: {_: ['run'], verbose: true, user: 0},
				expected_sinon: sinon_callback
			},
			{
				command: 'invalid',
				should_fail: true
			},
			{
				command: 'run -x',
				should_fail: true
			},
			{
				command: 'run --invalid',
				should_fail: true
			},
			{
				command: 'run -v',
				expected_args: {_: ['run'], verbose: true, user: 0},
				expected_sinon: sinon_callback
			},
			{
				command: 'run -v false',
				expected_args: {_: ['run'], verbose: false, user: 0},
				expected_sinon: sinon_callback
			},
			{
				command: 'run',
				expected_args: {_: ['run'], verbose: false, user: 0},
				expected_sinon: sinon_callback
			},
			{
				command: 'run --verbose',
				expected_args: {_: ['run'], verbose: true, user: 0},
				expected_sinon: sinon_callback
			},
			{
				command: 'run -uv',
				expected_args: {_: ['run'], verbose: true, user: 0},
				expected_sinon: sinon_callback
			},
			{
				command: 'run -v true',
				expected_args: {_: ['run'], verbose: true, user: 0},
				expected_sinon: sinon_callback
			},
			{
				command: 'run -vu 8123',
				expected_args: {_: ['run'], verbose: true, user: 8123},
				expected_sinon: sinon_callback
			},
			{
				command: 'run --user=123',
				expected_args: {_: ['run'], verbose: true, user: 8123},
				expected_sinon: sinon_callback
			},
			{
				command: 'run --verbose --user 1',
				expected_args: {_: ['run'], verbose: true, user: 1},
				expected_sinon: sinon_callback
			}
		];

		for(var i in test_commands) {
			describe('Command "' + test_commands[i].command + '"', function() {

				let had_error = false;

				try {
					var args = test_command(test_commands[i].command);
				} catch(e) {
					had_error = true;
				}

				if(test_commands[i].should_fail) {
					it('Should fail', () => {
						expect(had_error);
					});
					return;
				}

				it('Callback should be called', () => {
					expect(sinon_callback.called);
				});

				it('Callback should be called with args: ' + JSON.stringify(test_commands[i].expected_args), () => {
					expect(args[0]).to.eql(test_commands[i].expected_args);
				});

			});
		}




	});
});