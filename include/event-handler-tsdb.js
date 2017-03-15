module.exports = () => {
	return [
		{
      default_args: {},
      event_name: 'metric.write',
      supports_revert: true,
      version: '0.1',
      plugin_name: '_core',
      dispatch: (data, event_id) => {
        // @todo - write data to tsdb
        // @todo - return data maybe necessary for revert()
      },
      revert: (data, event_id) => {
        // @todo - remove data from tsdb
      }
    }
  ];
};