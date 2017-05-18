const _ = require('lodash');

module.exports = app => {
    app.io.on('connection', socket => {
      // loop services and map events
      _.each(app.collect_services, service => {
        _.each(['started','retry','stopped','error'], event_name => {
          service.on(event_name, data => {
            socket.emit(`service.${event_name}`, data);
          });
        });
      });
    });
  };