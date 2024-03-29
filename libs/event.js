module.exports = class Event {
  /**
   * Creates an instance of Event.
   * @param {String} event_name
   * @param {any} data
   *
   * @memberof Event
   */
  constructor(event_name, data, originator) {
    this.event_name = event_name;
    this.data = data;
    this.handled = false;
    this.queue_id;
    this.originator = originator;
  }
}