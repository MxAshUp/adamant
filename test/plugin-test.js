// Test tools
const sinon = require('sinon');
const chai = require('chai');
const expect = chai.expect;
const assert = chai.assert;
const mongooseMock = require('mongoose');
// Modules to test
const Plugin = require('../libs/plugin');

describe('Abstract Plugin', () => {
  it('Should construct without throwing error', () => {
    expect(
      () =>
        new Plugin({
          name: '_test_plugin',
        })
    ).to.not.throw();
  });
  it('Should construct and throw error if name not specified', () => {
    expect(() => new Plugin()).to.throw(
      `Missing required parameter: name`
    );
  });
  it('Should construct and assign models', () => {
    const models = [Math.random(), Math.random(), Math.random()];
    let pl = new Plugin({
      name: '_test_plugin',
      models: models,
    });

    expect(pl.models).to.deep.equal(models);
  });
  it('Should construct and assign components', () => {
    const components = [Math.random(), Math.random(), Math.random()];
    let pl = new Plugin({
      name: '_test_plugin',
      components: components,
    });

    expect(pl.components).to.deep.equal(components);
  });

  describe('Creating plugin components', () => {
    class collector_a {
      constructor(args) {
        this.construct_spy = sinon.spy();
        this.construct_spy(args);
      }
    }

    class collector_b {
      constructor(args) {
        this.construct_spy = sinon.spy();
        this.construct_spy(args);
      }
    }

    class handler_a {
      constructor(args) {
        this.construct_spy = sinon.spy();
        this.construct_spy(args);
      }
    }

    class handler_b {
      constructor(args) {
        this.construct_spy = sinon.spy();
        this.construct_spy(args);
      }
    }

    const collectors = [collector_a, collector_b];
    const event_handlers = [handler_a, handler_b];
    let pl = new Plugin({
      name: '_test_plugin',
      components: [...collectors, ...event_handlers],
      version: '0.1.0',
    });

    it('Should throw error cannot find component', () => {
      expect(() =>
        pl.create_component({name: 'INVALID_COLLECTOR'})
      ).to.throw(`Component not found: INVALID_COLLECTOR`);
    });

    it('Should throw an error if no component name specified', () => {
      expect(() =>
        pl.create_component()
      ).to.throw(Error, 'Missing required parameter: name');
    });

    it('Should create collector component', () => {
      const parameters = Math.random();
      component = pl.create_component({name: 'collector_a', parameters});
      expect(component).to.be.instanceof(collector_a);
      sinon.assert.calledWith(component.construct_spy, parameters);
    });

    it("Should throw error if require_version doesn't satisfy plugin version", () => {
      const parameters = Math.random();
      expect(() =>
        pl.create_component({name: 'collector_b', parameters, version: '0.2.0'})
      ).to.throw(
        `Version requirements not met. Plugin version: ${pl.version} Semver requirement: 0.2.0.`
      );
    });

    it("Should throw error if require_version doesn't satisfy plugin version", () => {
      const parameters = Math.random();
      expect(() =>
        pl.create_component({name: 'collector_b', parameters, version: '1.0.x'})
      ).to.throw(
        `Version requirements not met. Plugin version: ${pl.version} Semver requirement: 1.0.x.`
      );
    });

    it('Should throw error if require_version isn\t valid semver', () => {
      const parameters = Math.random();
      expect(() =>
        pl.create_component({name: 'collector_b', parameters, version: '1'})
      ).to.throw(
        `Version requirements not met. Plugin version: ${pl.version} Semver requirement: 1.`
      );
    });

    it('Should not throw error if require_version satisfies plugin version', () => {
      const parameters = Math.random();
      pl.create_component({name: 'collector_b', parameters, version: '0.1.x'});
    });

    it('Should not throw error if require_version satisfies not specified', () => {
      const parameters = Math.random();
      pl.create_component({name: 'collector_b', parameters, version: '>=0.0.1'});
    });

    it('Should create event handler component', () => {
      const parameters = Math.random();
      component = pl.create_component({name: 'handler_b', parameters});
      expect(component).to.be.instanceof(handler_b);
      sinon.assert.calledWith(component.construct_spy, parameters);
    });
  });

  describe('load_models', () => {

    it('Should load each plugin.model into mongoose', () => {

      const mock_models = [
        {
          name: 'mock_model_1',
          schema: {
            _id: String,
            prop1: Number
          }
        },
        {
          name: 'mock_model_2',
          schema_callback: sinon.spy(),
          schema: {
            _id: String,
            prop2: Number
          }
        },
        {
          name: 'mock_model_3',
          schema: {
            _id: String,
            prop3: Number
          }
        }
      ];

      afterEach(() => {
        mock_models.forEach((model) => {
          delete mongooseMock.models[model.name];
          delete mongooseMock.modelSchemas[model.name];
        });
      });

      let pl = new Plugin({ name: '_test_plugin', models: mock_models });

      pl.load_models(mongooseMock);

      mock_models.forEach((model_config) => {
        expect(mongooseMock.model(model_config.name).schema.obj).to.deep.equal(model_config.schema.obj);
      })

    });
    it('Should load plugin.model and run schema_callback', () => {

      const mock_models = [
        {
          name: 'mock_model_1',
          schema: {
            _id: String,
            prop1: Number
          }
        },
        {
          name: 'mock_model_2',
          schema_callback: sinon.spy(),
          schema: {
            _id: String,
            prop2: Number
          }
        },
        {
          name: 'mock_model_3',
          schema: {
            _id: String,
            prop3: Number
          }
        }
      ];

      afterEach(() => {
        mock_models.forEach((model) => {
          delete mongooseMock.models[model.name];
          delete mongooseMock.modelSchemas[model.name];
        });
      });

      let pl = new Plugin({ name: '_test_plugin', models: mock_models });

      pl.load_models(mongooseMock);

      sinon.assert.calledWith(mock_models[1].schema_callback, mock_models[1].schema);

    });
  });

  describe('Default behavior of override functions', () => {
    let pl = new Plugin({ name: '_test_plugin' });
    it('on_load should return nothing', () => {
      expect(pl.on_load()).to.be.undefined;
    });
    it('on_unload should return nothing', () => {
      expect(pl.on_unload()).to.be.undefined;
    });
    it('load_routes should return nothing', () => {
      expect(pl.load_routes()).to.be.undefined;
    });
    it('map_events should return nothing', () => {
      expect(pl.map_events()).to.be.undefined;
    });
  });

  describe('extend_schema', () => {
    it('Should extend schema as expected.', () => {

      const mock_schema_tests = [
        {
          original_schema: {
            name: String,
            age: Number,
          },
          extended_schema: {
            deceased: Boolean,
          },
          expected_schema: {
            name: String,
            age: Number,
            deceased: Boolean,
          }
        },
        {
          original_schema: {
            _id: String,
          },
          extended_schema: {
            deceased: Boolean,
          },
          expected_schema: {
            _id: String,
            deceased: Boolean,
          }
        }
      ];

      mock_schema_tests.forEach((mock_schema_test) => {

        let pl = new Plugin({
          name: '_test_plugin',
          models: [
            {
              name: 'not_used_model',
              schema: {}
            },
            {
              name: 'not_used_model_2',
              schema: {}
            },
            {
              name: 'test.model',
              schema: mock_schema_test.original_schema
            },
            {
              name: 'not_used_model_3',
              schema: {}
            },
          ],
        });

        pl.extend_schema('test.model', mock_schema_test.extended_schema);
        expect(pl.models[2].schema).to.deep.equal(mock_schema_test.expected_schema);

      });
    });
    it('Should try to extend schema but throw error.', () => {

      const mock_schema_tests = [
        {
          original_schema: {
            _id: String,
            age: Number,
          },
          extended_schema: {
            age: String,
          },
          expected_error: `Cannot extend test.model because path(s) cannot be overwritten: age`
        },
        {
          original_schema: {
            _id: String,
          },
          extended_schema: {
            _id: Number,
          },
          expected_error: `Cannot extend test.model because path(s) cannot be overwritten: _id`
        },
        {
          original_schema: {
            name: String,
          },
          extended_schema: {
            _id: Number,
          },
          expected_error: `Cannot extend test.model because path(s) cannot be overwritten: _id`
        }
      ];

      mock_schema_tests.forEach((mock_schema_test) => {

        let pl = new Plugin({
          name: '_test_plugin',
          models: [
            {
              name: 'not_used_model',
              schema: {}
            },
            {
              name: 'not_used_model_2',
              schema: {}
            },
            {
              name: 'test.model',
              schema: mock_schema_test.original_schema
            },
            {
              name: 'not_used_model_3',
              schema: {}
            },
          ],
        });

        expect(() => {
          pl.extend_schema('test.model', mock_schema_test.extended_schema);
        }).to.throw(Error, mock_schema_test.expected_error);

      });
    });
    it('Should preserve original schema in _original_schema.', () => {
      const mock_original_schema = {
        _id: String,
        name: String
      };

      let pl = new Plugin({
        name: '_test_plugin',
        models: [
          {
            name: 'test.model',
            schema: mock_original_schema
          },
        ],
      });

      pl.extend_schema('test.model', {
        age: Number
      });

      expect(pl.models[0]._original_schema).to.deep.equal(mock_original_schema);

    });
    it('Should extend schema twice.', () => {

      const mock_original_schema = {
        _id: String,
        name: String
      };

      const mock_expected_schema = {
        _id: String,
        name: String,
        job: String,
        position: String
      };

      let pl = new Plugin({
        name: '_test_plugin',
        models: [
          {
            name: 'test.model',
            schema: mock_original_schema
          },
        ],
      });

      pl.extend_schema('test.model', {
        job: String
      });

      pl.extend_schema('test.model', {
        position: String
      });

      expect(pl.models[0].schema).to.deep.equal(mock_expected_schema);

    });
  });
});
