//tests for collector
/*
process.env.NODE_ENV = 'test';

var assert = require("assert"),
	dbURI    = 'mongodb://localhost/dev-test',
    mongooseutil = require('../include/mongoose-utilities'),
	clearDB  = require('mocha-mongoose')(dbURI),
	chai = require('chai'),
	chaiAsPromised = require("chai-as-promised"),
    Collector = require('../include/collector.js');

chai.use(chaiAsPromised);

describe("Mongoose", function() {

	beforeEach(function(done) {
	    if (mongooseutil.mongoose.connection.db) return done();
	    mongooseutil.mongoose.connect(dbURI, done);
	});

	it("Should create a collection", function() {
		mongooseutil.createModel('test_model', {id: String});
		assert(mongooseutil.modelExists('test_model'));
	});

});
*/