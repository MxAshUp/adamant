const glob = require('glob');
const fs = require('fs');
const detect = require('local-acorn-globals');
const _ = require('lodash');
const path = require('path');

describe('Linting source file', () => {
  const files_to_test = glob.sync(`${__dirname}/../libs/**/*.js`);
  // For now, we skip app because it uses console.log
  const skip_files = ['libs/app.js'];

  files_to_test.forEach(source_file => {
    // Get relative file name being parsed
    const print_file = path.relative(`${__dirname}/..`, source_file);

    if(skip_files.indexOf(print_file) !== -1) {
      return;
    }

    describe(`${print_file}`, () => {
      let scope;
      const file_content = fs.readFileSync(source_file, 'utf8');
      it(`Should be valid JavaScript`, () => {
        scope = detect(file_content, {locations: true});
      });
      // List of globals not to use
      const blacklist_globals = ['console'];

      // Loop through each
      blacklist_globals.forEach(global_name => {
        it(`Should not use global ${global_name}`, () => {

          // Check if global was found in scope
          const console_scope = _.find(scope, {name: global_name});
          if(console_scope) {
            // Create list of {line}:{column} identifiers
            const locations = console_scope.nodes.map(ref => {
              return `${print_file}:${ref.loc.start.line}:${ref.loc.start.column}`;
            });
            // Throw error with location description of each
            throw new Error(`'${global_name}' used at: ` + "\n" + locations.join("\n"));
          }
        });
      });
    })
  });
});