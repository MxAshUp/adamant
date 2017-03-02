const mongoose = require('./mongoose-utilities'),
  _ = require('lodash'),
	EventEmitter = require('events');

class EventDispatcher extends EventEmitter {

  constructor() {
    super();
    this.event_handlers = [];
    this.event_queue = [];
  }

  /**
  * Adds event handler to memeory
  *
  * @param {EventHandler} handler
  *
  * @memberOf EventDispatcher
  */
  load_event_handler(handler) {
    //Check if handler id already in array
    if(typeof _.find(this.event_handlers, { instance_id: handler.instance_id }) !== 'undefined') {
      throw new Error('Cannot load EventHandler: Duplicate instance id.');
    }
    // Add handler to array of EventHandlers
    this.event_handlers.push(handler);
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
    // @todo: Maybe emit errors
    // @todo: Maybe emit event Enqueues
    // Return promise
    return Promise.all(
      _.map(
        _.filter(this.event_handlers, {event_name: event}),
        handler => Promise.resolve(handler.dispatch.apply(null, [data]))
      )
    );
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
    return Promise.all(
      _.map(
        _.filter(this.event_handlers, {instance_id: handler_instance_id}),
        handler => Promise.resolve(handler.revert.apply(null, [data]))
      )
    );
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
    this.event_queue.push({
      event: event,
      data: data
    });
  }

  /**
   * Gets and earliest undispatched event and removes it from the list
   *
   * @return {object} - Event name and event data {event: {String}, data: {any}}
   *
   * @memberOf EventDispatcher
   */
  shift_event() {
    return this.event_queue.shift();
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
    return this.event_queue.length;
  }

}

module.exports = EventDispatcher;