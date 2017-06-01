const
  // Test tools
  chai = require('chai'),
  expect = chai.expect,
  assert = chai.assert,
  rewire = require('rewire'),
  sinon = require('sinon'),
  _ = require('lodash'),
  errors = require('../libs/errors'),
  mongooseMock = require('mongoose-mock'),
  // Modules to test
  mongoose_utils = rewire('../libs/mongoose-utilities');


// Rewire database stuff
mongoose_utils.__set__("mongoose", mongooseMock);

console_log_spy = sinon.spy();
mongoose_utils.__set__("console", {log: console_log_spy});

let test_model =
{
  name: 'test.testmodel',
  primary_key: 'name',
  schema:
  {
    name:    String,
    binary:  Buffer,
    living:  Boolean,
    updated: { type: Date, default: Date.now },
    age:     { type: Number, min: 18, max: 65 },
    mixed:   mongooseMock.Schema.Types.Mixed,
    _someId: mongooseMock.Schema.Types.ObjectId,
    array:      [],
    ofString:   [String],
    ofNumber:   [Number],
    ofDates:    [Date],
    ofBuffer:   [Buffer],
    ofBoolean:  [Boolean],
    ofMixed:    [mongooseMock.Schema.Types.Mixed],
    ofObjectId: [mongooseMock.Schema.Types.ObjectId],
    nested: {
      stuff: { type: String, lowercase: true, trim: true }
    },
    schema_callback: ''
  }
};

describe('Mongoose utilities', () => {

  let model = null;

	describe('modelExists', () => {
    let model_throw_stub = sinon.stub().throws();
    after(mongoose_utils.__set__("mongoose", {model: model_throw_stub}));
    it('Should return false model hasn\'t been loaded', () => {
      expect(mongoose_utils.modelExists(test_model.name)).to.equal(false);
    });
  });

	describe('loadModel', () => {

    const mock_schema = Math.random();

    beforeEach(() => {
      sinon.stub(mongooseMock, 'Schema');
      mongooseMock.Schema.returns(mock_schema);
    });

    afterEach(() => {
      mongooseMock.Schema.restore();
    });

    it('Should return mongoose model object', () => {
      model = mongoose_utils.loadModel(test_model);
    });
    it('Should run schema_callback with schema parameter', () => {

      test_model.schema_callback = sinon.stub();
      mongoose_utils.loadModel(test_model);
      sinon.assert.calledWith(test_model.schema_callback, mock_schema);

      test_model.schema_callback = '';

    });
  });

	describe('modelExists', () => {
    it('Should return true now that model has been loaded', () => {
      expect(mongoose_utils.modelExists(test_model.name)).to.equal(true);
    });
  });

	describe('getModelByName', () => {
    it('Should be able to find model loading it', () => {
      let f_model = mongoose_utils.getModelByName(test_model.name);
      expect(f_model).to.deep.equal(test_model);
    });
    it('Should throw an error if model not found', () => {
      expect(mongoose_utils.getModelByName.bind(mongoose_utils,'NON_EXISTING_MODEL')).to.throw(`Model NON_EXISTING_MODEL not found.`);
    });
  });

  it('Should never call console.log', () => {
    sinon.assert.neverCalledWith(console_log_spy);
  });
});