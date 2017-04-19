//requires
var TogglClient = require('toggl-api'),
	moment = require('moment'),
  Collector = app_require('collector'),
	_ = require('lodash');


class CollectorTimeEntries extends Collector
{
  constructor(args) {
    super();

    // Collector properties
    this.plugin_name = 'Toggl';
    this._setup_model('toggl.time_entry');

    // Default collector args
    this.default_args = {
      days_back_to_sync: 1,
      api_token:''
    };

    // Merges args with default args
    Object.assign(this.args, this.default_args, args);

  }

  initialize(args) {
    try {
      this.toggl = new TogglClient({apiToken: args.api_token});
      return Promise.resolve();
    } catch(e) {
      return Promise.reject(e);
    }
  }

  prepare(args) {
    //Set report ranges
    const start_report = moment().subtract(args.days_back_to_sync,'days').format();
    const end_report = moment().format();
    //Get time entries
    return new Promise((resolve,reject) => {
      this.toggl.getTimeEntries(start_report, end_report, (err,data) => {
        if(err) {
          // Error getting data
          if(err.code == '403') {
            err.data = err.data ? '' : ('Auth failed, check API token.');
          }
          reject(new Error(`API Error (code: ${err.code}): ${err.data}`));
        } else {
          // Got some time entries!
          resolve(data);
        }
      });
    });
  }

  garbage(data, args) {
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
}

module.exports = CollectorTimeEntries;