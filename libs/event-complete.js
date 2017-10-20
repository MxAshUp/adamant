const Event = require('./event');

module.exports = class EventComplete extends Event {
  /**
   * Creates an instance of Event.
   * @param {Event} event_object - the event object that is being completed
   * @param {any} data
   *
   * @memberof Event
   */
  constructor(event_object, data) {
    super();

    this.event_name = `${event_object.event_name}.complete`;
    this.data = data;
    this.handled = false;
    this.queue_id;
    this.revert_data;
  }
}