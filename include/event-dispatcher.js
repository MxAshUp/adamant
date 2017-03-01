const mongoose = require('./mongoose-utilities'),
	EventEmitter = require('events');

class EventDispatcher extends EventEmitter {

  constructor() {
    super();
    this.event_handlers = [];
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
   * @param {number} handler_instance_id - id of event handler
   * @returns {EventHandler}
   *
   * @memberOf EventDispatcher
   */
  get_event_handler(handler_instance_id) {

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
  * @param {number} handler_instance_id - Id of event handler instance
  *
  * @memberOf EventDispatcher
  */
  revert_event(handler_instance_id, data) {
    // Lookup event handler by id
    // Run revert with args
  }

  /**
  * Enqueues an event to be handled
  *
  * @param {string} event - Name of event to enqueue
  * @param {any} data - Passed along to event handlers
  *
  * @memberOf EventDispatcher
  */
  enqueue_event(event, data) {
    // Add event with data and timestamp to queue
  }

  /**
   * Gets and earliest undispatched event and removes it from the list
   *
   * @return {object} - Event name and event data {event: {String}, data: {any}}
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