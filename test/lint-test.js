const glob = require('glob');
const fs = require('fs');
const detect = require('acorn-globals');
const getLineInfo = require('acorn').getLineInfo;
const path = require('path');

// Config
const paths_to_search = ['libs'];
const skip_files = []; // example: libs/index.js
const pending_files = ['libs/app.js']
const blacklist_globals = ['console'];

// Generate globs and find files
const glob_paths = paths_to_search.map(file_path => path.resolve(__dirname, `../${file_path}/**/*.js`));
let glob_pattern = glob_paths.join(',');
if(paths_to_search.length > 1) {
  glob_pattern = `{${glob_pattern}}`;
}

const files = glob.sync(glob_pattern);
const files_to_test = files.filter(file => {
  return (skip_files.indexOf(path.relative(`${__dirname}/..`, file)) === -1)
});

describe('Linting source file', () => {
  files_to_test.forEach(source_file => {
    // Get relative file name being parsed
    const print_file = path.relative(`${__dirname}/..`, source_file);
    describe(`${print_file}`, () => {
      if((pending_files.indexOf(print_file) !== -1)) {
        it('Pending tests.');
        return;
      }

      let scope;
      const file_content = fs.readFileSync(source_file, 'utf8');
      it(`Should be valid JavaScript`, () => {
        scope = detect(file_content, {locations: true});
      });

      // Loop through each
      blacklist_globals.forEach(global_name => {
        it(`Should not use global ${global_name}`, () => {

          // Check if global was found in scope
          const globals_scope = scope.find(node => node.name === global_name);
          if(globals_scope) {
            // Create list of {line}:{column} identifiers
            const locations = globals_scope.nodes.map(ref => {
              const line_info = getLineInfo(file_content, ref.start);
              return `${print_file}:${line_info.line}:${line_info.column}`;
            });
            // Throw error with location description of each
            throw new Error(`'${global_name}' used at: ` + "\n" + locations.join("\n"));
          }
        });
      });
    })
  });
});