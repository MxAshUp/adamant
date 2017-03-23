module.exports = {
  name: 'timeclock.punch',
  primary_key: 'pid',
  schema: {
    pid: String,
    employeeId: String,
    employeeName: String,
    punchInTime: Date,
    punchInFlags: String,
    punchInDepartment: String,
    punchOutFlags: String,
    punchOutTime: Date,
    punchOutLunch: Number,
    punchOutADJ: Number,
    punchSTD: Number,
    punchOT1: Number,
    punchOT2: Number,
    punchHOL: Number,
    punchHRS: Number,
    punchLaborDS: Number,
    punchLabor: Number,
  }
}