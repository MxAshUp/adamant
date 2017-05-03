/**
 * @todo load plugin stuff here
 */
module.exports = {
  name: 'Debug Tools',
  event_handlers: [
    require('./event-handlers/console'),
    require('./event-handlers/adapter'),
  ],
};
