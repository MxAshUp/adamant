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

    // console.log('app obj keys: ', Object.keys(app));
    // console.log('app.collect_services: ', app.collect_services);

    setTimeout(() => {
      // console.log('app.collect_services: ', app.collect_services);

      for (let collector of app.collect_services) {
        for (let event_name in collector._events) {
          collector.on(event_name, () => {
            app.io.emit(event_name);
            console.log(`socket.io ${event_name} event emitted`);
          });
          console.log(`${collector.name} ${event_name} event mapped`);
        }
      }
    }, 3500);
  },
};
