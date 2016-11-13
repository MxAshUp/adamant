var fs = require('fs'),
    path = require('path');

module.exports = {
	getPluginsDirectories: function() {
		srcpath = 'plugins';
		return fs.readdirSync(srcpath).filter((file) => {
			return fs.statSync(path.join(srcpath, file)).isDirectory();
		}).map((path) => {
			return 'plugins/' + path;
		});
	},
	promiseLoop: function(fn, condition_fn) {

		return new Promise((resolve,reject) => {
			let loop = function() {
				condition_fn()
				.catch(() => {
					resolve();
					return Promise.reject();
				})
				.then(() => {
					return fn().catch((e) => {
						reject(e);
						return Promise.reject();
					})
				})
				.then(loop);
			};

			loop();
		});
	}
}



