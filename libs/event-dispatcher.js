const _ = require('lodash'),
  EventHandleError = require('../libs/errors').EventHandleError,
	EventEmitter = require('events');

/**
 * Handles enqueing of events, loading of event handlers, and dispatching events to handlers
 *
 * @class EventDispatcher
 * @extends {EventEmitter}
 */
class EventDispatcher extends EventEmitter {

  constructor() {
    super();
    this.event_handlers = [];
    this.event_queue = [];
    this.handler_count = 0;
    this.event_count = 0;
    this.error_on_unhandled_events = false;
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

    // Handle enqueue event
    handler.on('enqueue_event', this.enqueue_event.bind(this));

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
  * @param {Event} event - event to dispatch
  * @param {handler_id} (Optional) - specify a specific event handler to dispatch event
  * @return {Promise} - Promise resolves when all callbacks finish
  *
  * @memberOf EventDispatcher
  */
  dispatch_event(event_obj, handler_id) {
    // Loop through handlers listening to event
    // Trigger each callback
    // @todo: Maybe emit errors
    // @todo: Maybe emit event Enqueues
    // @todo: Emit event to confirm event was handled (ie, for updating db)

    // Create handler search args
    let search = {event_name: event_obj.event_name};
    if(!_.isUndefined(handler_id)) {
      search.instance_id = handler_id;
    }

    // Create array of return promises
    let ret_promises = _.map(
      _.filter(this.event_handlers, search),
      handler => Promise.resolve().then(handler.dispatch.bind(handler, event_obj.data, event_obj.queue_id)).then(() => {
        this.emit('dispatched', event_obj, handler);
      }).catch((e) => {
        this.emit('error', new EventHandleError(e, event_obj, handler));
      })
    );

    if(!ret_promises.length && this.error_on_unhandled_events) {
      // No handlers for dispatched event
      this.emit('error', new Error(`No handlers found for event ${event_obj.event_name}.`));
    }

    // Create promise return
    return Promise.all(ret_promises);
  }

  /**
  * Run revert for a particular event
  *
  * @param {Event} event - event to revert
  * @param {handler_id} (Optional) - specify a specific event handler to dispatch event
  * @return {Promise} - Promise resolves when all callbacks finish
  * @memberOf EventDispatcher
  */
  revert_event(event_obj, handler_id) {
    // Lookup event handler by id
    // Run revert with args

    // Create handler search args
    let search = {event_name: event_obj.event_name};
    if(!_.isUndefined(handler_id)) {
      search.instance_id = handler_id;
    }

    // Create promise return
    return Promise.all(
      _.map(
        _.filter(this.event_handlers, search),
        handler => Promise.resolve().then(handler.revert.bind(handler, event_obj.data)).then(() => {
          this.emit('reverted', event_obj, handler);
        }).catch((e) => {
          this.emit('error', new EventHandleError(e, event_obj, handler));
        })
      )
    );
  }

  /**
  * Enqueues an event to be handled
  *
  * @param {EVent} event_obj - event to enqueue
  *
  * @memberOf EventDispatcher
  */
  enqueue_event(event_obj) {
    // Create event id
    event_obj.queue_id = this.event_count++;

    // Add new event to queue
    this.event_queue.push(event_obj);

    // Return event id
    return event_obj.queue_id;
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
   * Shifts and dispatches all enqueued events
   *
   *
   * @memberOf EventDispatcher
   */
  run() {
    let promises = [];

    while(this.event_queue_count > 0) {
      promises.push(this.dispatch_event(this.shift_event()));
    }

    return Promise.all(promises);
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