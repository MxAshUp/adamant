var expect = require('chai').expect;

var rewire = require("rewire");
var utilities = rewire('../include/utilities');



describe('Utility Functions', function() {
	describe('Get plugin directories', function() {

		//Setup mock data
		var mock_plugins = [
			{name: 'myplugin1', path: 'plugins/myplugin1'},
			{name: 'Another dir next', path: 'plugins/Another dir next'},
			{name: 'great C', path: 'plugins/great C'},
		];
		var mock_plugins_dirs = [
			'myplugin1',
			'Another dir next',
			'great C'
		];
		//This guy should not be seen as a plugin dir
		var mock_files = [
			'README.txt'
		];

		//Avoids using actual fs with mock functions
		utilities.__set__("fs", {
			readdirSync: function(path) {
				if(path !== 'plugins') {
					throw 'Wrong plugin path';
				}
				return mock_plugins_dirs.concat(mock_files);
			},
			statSync: function(path) {
				return {
					isDirectory: function() {
						return mock_plugins_dirs.indexOf(path.replace(/^[^\/]*\//,'')) !== -1;
					}
				};
			}
		});

		var plugins_dirs = utilities.getPluginsDirectories();

		it('Should return array of directories', function () {
	  		expect(plugins_dirs).to.be.instanceof(Array);
		});

		it('Should return correct directories', function () {
	  		expect(plugins_dirs).to.deep.equal(mock_plugins);
		});

		it('Should return only 3 plugin directories', function () {
	  		expect(plugins_dirs.length).to.equal(3);
		});
	});
});