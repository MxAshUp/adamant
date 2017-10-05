module.exports = class Event {
  /**
   * Creates an instance of Event.
   * @param {String} event_name
   * @param {any} data
   *
   * @memberOf Event
   */
  constructor(event_name, data) {
    this.event_name = event_name;
    this.data = data;
    this.handled = false;
    this.queue_id;
    this.revert_data;
  }
}