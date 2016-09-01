var fs = require('fs'),
    path = require('path');

module.exports = {
	getPluginsDirectories: function() {
		srcpath = 'plugins';
		return fs.readdirSync(srcpath).filter(function(file) {
			return fs.statSync(path.join(srcpath, file)).isDirectory();
		}).map(function(path) {
			return 'plugins/' + path;
		});
	}
}


