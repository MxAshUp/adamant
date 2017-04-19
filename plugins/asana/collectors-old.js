const async = require('async');
const moment = require('moment');
const AsanaApi = require('./asana');

// *** MAIN DATA COLLECTOR DEFINITION *********************************************************** //

module.exports = function() {

  return [

    // *** PROJECTS ***************************************************************************** //
    {
      model_name:'asana_project',
      model_id_key:'id',

      model_schema: {
        name: String,
        id: Number,
        owner: {
          id: Number,
          name: String
        },
        current_status: {
          color: String,
          text: String,
          author: {
            id: Number,
            name: String
          }
        },
        // //due_date: Date,
        created_at: String,
        modified_at: String,
        archived: Boolean,
        public: Boolean,
        members: [
          {
            id: Number,
            name: String,
            _id: false
          }
        ],
        followers: [
          {
            id: Number,
            name: String,
            _id: false
          }
        ],
        color: String,
        notes: String,
        workspace: {
          id: Number,
          name: String
        },
        team: {
          id: Number,
          name: String
        },
        layout: String
      }, // end schema


      default_args: {
        days_back_to_sync: 1,
        workspace: '12359686868840'
        //apiToken:''
      },

       
      
      initialize: function(args) {
        //const self = this;
        // try {
        //   self.toggl = new TogglClient({apiToken: args.apiToken});
        //   return Promise.resolve();
        // } catch(e) {
        //   return Promise.reject(e);
        // }
        //this.asana_api = new AsanaApi(); // pass in apitoken or oauth
        return Promise.resolve();
      },


      prepare: function(args) {
        const self = this;
        const asana_api = new AsanaApi(); // pass in apitoken or oauth

        return new Promise((resolve,reject) => {
          const url = [
            'workspaces', args.workspace, 'projects'
          ];
          const params = {
            opt_fields: 'modified_at'
          };

          asana_api.get(url, params, (err, data) => {
            if(err) {
              reject(new Error('API Error: '+err.data));
            } else {
              // Filter out these projects:
              // Get projects modified since last date
              const start_report = moment().subtract(args.days_back_to_sync,'days').format();
              const projects_ret = [];

              // Todo: Error handling more better
              async.each(data, function(ad, next) {
                if(moment(start_report).isBefore(moment(ad.modified_at))) {
                  // Get full project record:
                  const url = [
                    'projects',
                    ad.id
                  ];
                  const params = {};
                  asana_api.get(url, params, (aerr, adata) => {

                    // Do some type juggling:
                    //adata.due_date = new Date(adata.due_date);
                    //adata.created_at = new Date(adata.created_at);
                    //adata.modified_at = new Date(adata.modified_at);

                    delete adata.due_date;

                    if(adata.color === null) { adata.color = ''; }
                    if(adata.current_status === null) { adata.current_status = ''; }


                    projects_ret.push(adata);
                    next();
                  });
                } else {
                  next();
                }
              }, function(err) {
                if(err) { reject(err); }
                // projects_ret
                resolve(projects_ret);
              });

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
        // const start_report = moment().subtract(args.days_back_to_sync,'days');
        // const end_report = moment();

        // //This function compares the entries in Toggl and the entries in local db,
        // //then returns the entries that are only in the local db. These need to be removed.
        // return this.model.find({at:{'$gte': start_report, '$lt': end_report}})
        // .then((old_entries) => {
        //   //Get the id's of the new entries
        //   const new_entries = _.map(data, (obj) => String(obj.id));

        //   //Get the id's of the entries currently stored
        //   old_entries = _.map(old_entries, (obj) => String(obj.id));

        //   //Find which entries exist in the old, but not the new, these need to be removed
        //   let entries_to_remove = _.difference(old_entries, new_entries);

        //   //Make entries to remove into lookup objects
        //   entries_to_remove = _.map(entries_to_remove, (idv) => ({id: idv}));

        //   return entries_to_remove;
        // });
      } // / garbage
    } // / projects
  ];

};
