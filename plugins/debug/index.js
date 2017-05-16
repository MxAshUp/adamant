/**
 * @todo load plugin stuff here
 */
module.exports = {
  name: 'Debug Tools',
  event_handlers: [
    require('./event-handlers/console'),
    require('./event-handlers/adapter'),
  ],
  load_routes: require('./routes'),
  map_events: app => {
    // need instance of app & app.io
    // app.service[0].on('start', () => {
    //   io.emit();
    // });
    // loop services and map events
    // loop collectors and map events
  },
};
