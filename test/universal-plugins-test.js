const
  // Test tools
  chai = require('chai'),
  expect = chai.expect,
  assert = chai.assert,
  glob = require('glob'),
  mongoose = require('mongoose');

let files_to_test = [];

global.app_require = function(name) {
    return require('../include/' + name);
};

let plugin_tests = (file) => {
  describe(`Plugin ${file}`, () => {
    let plugin = require('../' + file);
    it('Should load plugin as object', () => {
      expect(plugin).to.be.a('Object');
    });
    it('Should have name property', () => {
      expect(plugin).to.have.property('name');
      expect(plugin.name).to.be.a('string');
    });
    plugin_model_tests(plugin);
    plugin_collector_tests(plugin);
    plugin_handler_tests(plugin);
  });
};

let plugin_model_tests = (plugin) => {
  if(typeof plugin.models === 'undefined') {
    // Models not defined in plugin
    return;
  }
  plugin.models.forEach((model_def) => {
    describe(`Model ${model_def.name}`, () => {
      it('Should be an object', () => {
        expect(model_def).to.be.a('Object');
      });
      it('Should have valid name, primary_key, and schema properties', () => {
        expect(model_def).to.have.property('name');
        expect(model_def).to.have.property('primary_key');
        expect(model_def).to.have.property('schema');
        expect(model_def.name).to.be.a('string');
        expect(model_def.primary_key).to.be.a('string');
        expect(model_def.schema).to.be.a('Object');
        expect(model_def.name.length).to.be.greaterThan(0);
        expect(model_def.primary_key.length).to.be.greaterThan(0);
        expect(Object.keys(model_def.schema).length).to.be.greaterThan(0);
      });

      it('Should create mongoose schema without error', () => {
        // Create schema
        var schema = mongoose.Schema(model_def.schema);
      });
    });
  });
};

let plugin_collector_tests = (plugin) => {
  if(typeof plugin.collectors === 'undefined') {
    // collectors not defined in plugin
    return;
  }
  plugin.collectors.forEach((collector_class) => {
    describe(`Collector ${collector_class.name}`, () => {
      it('Should be a function (class)', () => {
        expect(collector_class).to.be.a('function');
      });
    });
  });
};

let plugin_handler_tests = (plugin) => {
  if(typeof plugin.event_handlers === 'undefined') {
    // event_handlers not defined in plugin
    return;
  }
  plugin.event_handlers.forEach((handler_class) => {
    describe(`Handler ${handler_class.name}`, () => {
      it('Should be a function (class)', () => {
        expect(handler_class).to.be.a('function');
      });
    });
  });

};

describe('Universal tests on plugins', () => {
  files_to_test = glob.sync("plugins/*/index.js");
  files_to_test.forEach(plugin_tests);
});
