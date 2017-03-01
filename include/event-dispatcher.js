const mongoose = require('./mongoose-utilities'),
	EventEmitter = require('events');

class EventDispatcher extends EventEmitter {

  constructor() {
    super();
    this.event_handlers = [];
  }

  /**
  * Runs all callbacks for event asynchronously
  *
  * @param {string} event - Name of event
  * @return {Promise} - Promise resolves when all callbacks finish
  *
  * @memberOf EventDispatcher
  */
  dispatch_event(event, data) {
    // Loop through handlers listening to event
    // Trigger each callback
    // Maybe emit errors
    // Maybe emit event Enqueues
    // Return promise
  }

  /**
  * Run revert for a particular event
  *
  * @param {number} event_handler_id - Id of event handler instance
  *
  * @memberOf EventDispatcher
  */
  revert_event(event_handler_id, data) {
    // Lookup event handler by id
    // Run revert with args
  }

  /**
  * Adds event handler to memeory
  *
  * @param {EventHandler} handler
  *
  * @memberOf EventDispatcher
  */
  load_event_handler(handler) {
    // Add handler to array of EventHandlers

  }

  /**
   * Looks up the event handler by id
   *
   * @param {number} event_handler_id - id of event handler
   * @returns {EventHandler}
   *
   * @memberOf EventDispatcher
   */
  get_event_handler(event_handler_id) {

  }

  /**
  * Enqueues an event in database to be handled when ready
  *
  * @param {string} event - Name of event to enqueue
  * @param {any} data - Passed along to event handlers
  * @param {number} timestamp - UTC timestamp the event occurred at
  *
  * @memberOf EventDispatcher
  */
  enqueue_event(event, data, timestamp) {
    // Add event with data and timestamp to queue
  }

  /**
   * Gets and marks the earliest undispatched event
   *
   * @return {any} - Event data
   *
   * @memberOf EventDispatcher
   */
  shift_event() {

  }

  /**
   * Gets the number of undispatched events in queue
   *
   * @return {number}
   *
   * @readonly
   *
   * @memberOf EventDispatcher
   */
  get event_queue_count() {

  }

}

module.exports = EventDispatcher;