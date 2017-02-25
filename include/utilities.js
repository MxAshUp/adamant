var fs = require('fs'),
    path = require('path');


module.exports = {
	/**
	 * Gets the directory path for each plugin
	 *
	 * @returns {Array} Array of strings for each plugin path
	 */
	getPluginsDirectories: function() {
		srcpath = 'plugins';
		return fs.readdirSync(srcpath).filter((file) => {
			return fs.statSync(path.join(srcpath, file)).isDirectory();
		}).map((path) => {
			return {
				name: path,
				path: `${srcpath}/${path}`
			};
		});
	},

}
