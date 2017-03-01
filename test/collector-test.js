const expect = require('chai').expect;
const Collector = require('../include/collector');


describe('Collector Class', function() {

  //Setup mock data
  const mock_config = {
    model_name:'test',
    model_id_key:'id',
    model_schema: {
      id: String,
      description: String
    },
    default_args: {
      apiToken:''
    },
    initialize: function(args) {
      return Promise.resolve(args);
    },
    prepare: function(args) {
      const self = this;
      // Set report ranges
      const start_report = moment().subtract(args.days_back_to_sync,'days').format();
      const end_report = moment().format();
      // Get time entries
      return new Promise((resolve,reject) => {
        self.toggl.getTimeEntries(start_report, end_report, (err,data) => {
          // Error getting data
          if(err) {
            if(err.code == '403') {
              err.data = err.data ? '' : ('Auth failed, check API token.');
            }
            reject(new Error(`API Error (code: ${err.code}): ${err.data}`));
          } else {
            resolve(data);
          }
        });
      });
    },
    collect: function* (data, args) {
      for(let i = 0; i < data.length; i++) {
        yield Promise.resolve(data[i]);
      }
    },
    garbage: function(data, args) {

      const start_report = moment().subtract(args.days_back_to_sync,'days');
      const end_report = moment();

      //This function compares the entries in Toggl and the entries in local db,
      //then returns the entries that are only in the local db. These need to be removed.
      return this.model.find({at:{'$gte': start_report, '$lt': end_report}})
      .then((old_entries) => {
        //Get the id's of the new entries
        const new_entries = _.map(data, (obj) => String(obj.id));

        //Get the id's of the entries currently stored
        old_entries = _.map(old_entries, (obj) => String(obj.id));

        //Find which entries exist in the old, but not the new, these need to be removed
        let entries_to_remove = _.difference(old_entries, new_entries);

        //Make entries to remove into lookup objects
        entries_to_remove = _.map(entries_to_remove, (idv) => ({id: idv}));

        return entries_to_remove;
      });
    }
  };

  const mock_args = {
    apiToken: 'asdf'
  };

  const collector = new Collector(mock_config, mock_args);
  console.log(collector);

  // var plugins_dirs = utilities.getPluginsDirectories();

  it('[initialize] Return promise', function () {
    expect(collector.initialize(mock_args).then(value) { console.log(value); }).to.equal({}); // but this doesn't really impact anything...
  });

  // it('Should return correct directories', function () {
  //   expect(plugins_dirs).to.have.members(mock_plugins_dirs);
  // });

  // it('Should return only 3 plugin directories', function () {
  //   expect(plugins_dirs.length).to.equal(3);
  // });
}); 