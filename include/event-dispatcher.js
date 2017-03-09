const mongoose = require('./mongoose-utilities'),
  _ = require('lodash'),
	EventEmitter = require('events');

class EventDispatcher extends EventEmitter {

  constructor() {
    super();
    this.event_handlers = [];
    this.event_queue = [];
    this.handler_count = 0;
    this.event_count = 0;
  }

  /**
  * Adds event handler to memeory
  *
  * @param {EventHandler} handler
  * @returns {number} id of event handler as reference
  * @memberOf EventDispatcher
  */
  load_event_handler(handler) {
    // Assign an instance id
    handler.instance_id = this.handler_count++;

    // Add handler to array of EventHandlers
    this.event_handlers.push(handler);

    //Return id
    return handler.instance_id;
  }

  /**
   * Removes an event handler from memeory
   *
   * @param {number} handler_id
   * @returns {mixed} removed handler object if success, false if no event handler with handler_id found
   * @memberOf EventDispatcher
   */
  remove_event_handler(handler_id) {
    // Remove by id
    const removed_handlers = _.remove(this.event_handlers, (handler) => {
      return handler.instance_id == handler_id;
    });

    // Check if the new length is different
    return removed_handlers.length ? removed_handlers[0] : false;
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
    return _.find(this.event_handlers, { instance_id: handler_instance_id });
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
    // @todo: Emit event to confirm event was handled (ie, for updating db)
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
    // Create event id
    let event_id = this.event_count++;

    // Add new event to queue
    this.event_queue.push({
      id: event_id,
      event: event,
      data: data
    });

    // Return event id
    return event_id;
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