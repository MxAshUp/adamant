// requires
const async = require('async');
const moment = require('moment');
const Collector = app_require('collector');
const AsanaApi = require('../asana');

class CollectorAsanaProjects extends Collector
{
  constructor(args) {
    super(); // Should this be super(args)?

    // Collector properties
    this.plugin_name = 'Asana';
    this._setup_model('asana.project');

    // Default Collector args
    this.default_args = {
      days_back_to_sync: 1,
      apiToken: '',
      workspace: '12359686868840'
    };

    // Merge args w/ default args
    Object.assign(this.args, this.default_args, args);
  } // /constructor


  initialize(args) {
    return Promise.resolve();
  }


  prepare(args) {
    const self = this;
    const asana_api = new AsanaApi(); // pass in apitoken or oauth

    // Get projects
    const url = [
      'workspaces', args.workspace, 'projects'
    ];
    const params = {
      opt_fields: 'modified_at'
    };

    return asana_api.get(url, params).then((adata) => {
      // Filter out these projects since last date:
      const start_report = moment().subtract(args.days_back_to_sync,'days').format();
      const projects_ret = [];
      for(var i=0; i<adata.length; i++) {
        if(moment(start_report).isBefore(moment(adata[i].modified_at))) {
          projects_ret.push(adata[i]);
        }
      }
      return projects_ret;
    });
  } // /prepare


  *collect(data, args) {
    const asana_api = new AsanaApi(); // pass in apitoken or oauth
    for(let i=0; i<data.length; i++) {
      const url = [
        'projects',
        data[i].id
      ];
      const params = {};

      yield asana_api.get(url, params);
    }
  } // /collect


  garbage(data, args) {
    // const start_report = moment().subtract(args.days_back_to_sync,'days');
    // const end_report = moment();
    //
    // //This function compares the entries in Toggl and the entries in local db,
    // //then returns the entries that are only in the local db. These need to be removed.
    // return this.model.find({at:{'$gte': start_report, '$lt': end_report}})
    // .then((old_entries) => {
    //   //Get the id's of the new entries
    //   const new_entries = _.map(data, (obj) => String(obj.id));
    //
    //   //Get the id's of the entries currently stored
    //   old_entries = _.map(old_entries, (obj) => String(obj.id));
    //
    //   //Find which entries exist in the old, but not the new, these need to be removed
    //   let entries_to_remove = _.difference(old_entries, new_entries);
    //
    //   //Make entries to remove into lookup objects
    //   entries_to_remove = _.map(entries_to_remove, (idv) => ({id: idv}));
    //
    //   return entries_to_remove;
    // });
  } // garbage
}


module.exports = CollectorAsanaProjects;