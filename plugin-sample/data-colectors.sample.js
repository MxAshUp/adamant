//requires
//var request = require('request');


//******MAIN DATA COLLECTOR DEFINITION*********//

module.exports = function(_config, _mysql) {
	return [
		{
			model_name: 'model-name',
			model_id_key: 'id',
			//Some example schemas!
			model_schema: {
				id: String,
				name:    String,
				binary:  Buffer,
				living:  Boolean,
				updated: { type: Date, default: Date.now },
				age:     { type: Number, min: 18, max: 65 },
				mixed:   Schema.Types.Mixed,
				_someId: Schema.Types.ObjectId,
				array:      [],
				ofString:   [String],
				ofNumber:   [Number],
				ofDates:    [Date],
				ofBuffer:   [Buffer],
				ofBoolean:  [Boolean],
				ofMixed:    [Schema.Types.Mixed],
				ofObjectId: [Schema.Types.ObjectId],
				nested: {
					stuff: { type: String, lowercase: true, trim: true }
				}
			},
			default_args: {
				days_back_to_sync: 7
			},
			initialize: function(args) {
				//Do some initialize stuff
			},
			prepare: function(args) {
				return Promise.resolve(some_data_to_use_in_collect_and_remove);
			},
			collect: function(data, args) {

			},
			remove: function(data, args) {

			}
			onCreate: function(val) {
				console.log('Created',val);
			},
			onUpdate: function(val) {
				console.log('Updated',val);
			},
			onRemove: function(val) {
				console.log('Removed',val);
			},
		}
	];
};


//******HELPER FUNCTIONS FOR GETTING DATA*********//

//...