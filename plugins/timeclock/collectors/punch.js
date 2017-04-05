const moment = require('moment'),
  Collector = app_require('collector'),
	timeclock = require('../timeclock.js');

class CollectorPunches extends Collector
{
  constructor(args) {
    super();

    // Collector properties
    this.plugin_name = 'TimeClock';
    this._setup_model('timeclock.punch');

    // Default collector args
    this.default_args = {
      days_back_to_sync: 7,
      url:'',
      user:'',
      password:''
    };

    // Merges args with default args
    Object.assign(this.args, this.default_args, args);

  }

  initialize(args) {
		return timeclock.do_login( args.url, args.user, args.password );
  }

  prepare(args) {
    //Set report ranges
    const start_report = moment().subtract(args.days_back_to_sync,'days');
    const end_report = moment();
    //Get report data Promise
    return timeclock.get_report_html( args.url, start_report, end_report );
  }

  *collect(data, args) {
    for(let data_row of timeclock.parse_report(data)) {
      yield data_row;
    }
  }

  garbage(data, args) {
    /**
     * @todo Check if local time entry is not in data, then delete it
     */
    return [];
  }
}

module.exports = CollectorPunches;