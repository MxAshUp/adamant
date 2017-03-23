module.exports =
{
  name: 'toggl.time_entry',
  primary_key: 'id',
  schema:
  {
    id: String,
    guid: String,
    wid: String,
    pid: String,
    tid: String,
    billable: Boolean,
    start: Date,
    stop: Date,
    duration: Number,
    duronly: Boolean,
    at: Date,
    uid: String,
    description: String,
    tags: [String]
  }
};