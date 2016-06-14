Better best-friends/lets get drinks: SELECT B.pid,B.employeeName,B.punchInTime, (SELECT COUNT(*) FROM `timeclock` as B WHERE A.`punchInTime`=B.`punchInTime` AND A.`pid`!=B.`pid`) as others FROM `timeclock` as A LEFT JOIN `timeclock` as B ON A.`punchInTime`=B.`punchInTime` AND A.`pid`!=B.`pid` WHERE B.`pid` IS NOT NULL GROUP BY B.pid


load data collectors into memory
get configs from db
loop through configs and create instances


users with login

login screen

settings screen
	data collectors
		Add/remove/enalbe/disable data collector
		setting pane for each data collector (visible to user)
			enable/disable data collector
			data collector log
			add instance for each user
			add system-based instance (for collectors that aren't user-specific)
			view instance config

	Data Views
		Setting pane for each view library (visible to user)
			enable/disable views
			configure global args/options
			(views 'require' data collectors)
	//Future
	Event Script Libraries (visible to user)
		settings pane for each event script library
			enable/disable
			configure globa args/options

views screen
	view 1...2... etc
	view settings (time ranges)

Events->Check trigger->do action

Actions
	Access data


Update toggl time entry to mavenlink
	time entry updated
	use relationship table
	ask mavenlink to update time entry





Future


Example recipes:
	Update mavenlink project to Toggl
	Update mavenlink project to Asana
	Update mavenlink task to Toggl
	Update mavenlink task to Asana
	Insert mavenlink invoice to Quickbooks
	Award achievements


sync process:
	get model doc
	does associated sync doc exist?
		yes->get doc
	if we have association
		attempt to update remote data
			catch api/doesn't exist error
				move to create step
	else
		attempt to create remote data
			then: update sync model doc

	catch any other error:
		log it, count it, maybe try again
