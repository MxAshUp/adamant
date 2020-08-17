const _ = require('lodash');
const EventHandleError = require('../libs/errors').EventHandleError;
const EventEmitter = require('events');
const Event = require('./event');
const EventComplete = require('./event-complete');
const utility = require('../libs/utility');

/**
 * Handles enqueing of events, loading of event handlers, and dispatching events to handlers
 *
 * @event EventDispatcher#dispatch - When success dispatch
 * @event EventDispatcher#error - When error on dispatch
 * @event EventDispatcher#[model_name].complete - Collector of model_name is finished
 *
 * @class EventDispatcher
 * @extends {EventEmitter}
 */
module.exports = class EventDispatcher extends EventEmitter {
  constructor() {
    super();
    this.event_handlers = [];
    this.event_queue = [];
    this.event_queue_dispatching = [];
    this.handler_count = 0;
    this.event_count = 0;
    this.error_on_unhandled_events = false;
  }

  /**
  * Adds event handler to memeory
  *
  * @param {EventHandler} handler
  * @returns {number} id of event handler as reference
  * @memberof EventDispatcher
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
   * Removes an event handler from memory
   *
   * @param {number} handler_id
   * @returns {mixed} removed handler object if success, false if no event handler with handler_id found
   * @memberof EventDispatcher
   */
  remove_event_handler(handler_id) {
    // Remove by id
    const removed_handlers = _.remove(this.event_handlers, handler => {
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
   * @memberof EventDispatcher
   */
  get_event_handler(handler_instance_id) {
    return _.find(this.event_handlers, { instance_id: handler_instance_id });
  }

  /**
  * Finds registered event handlers matching event_obj.name and calls dispatch for each.
  *
  * @param {Event} event - event to dispatch
  * @param {handler_id} (Optional) - specify a specific event handler to dispatch event
  * @return {Promise} - Promise resolves when all callbacks finish
  *
  * @memberof EventDispatcher
  */
  dispatch_event(event_obj, handler_id) {

    // Filter event handlers
    const filtered_event_handlers = this.event_handlers
      .filter((handler) => handler.event_name_compare(event_obj.event_name))
      .filter(({instance_id}) => _.isUndefined(handler_id) || handler_id === instance_id)
      .filter(({should_handle}) => !should_handle || should_handle(event_obj))

    // Create array of return promises
    const ret_promises = _.map(filtered_event_handlers, handler =>
      Promise.resolve()
        .then(() => {
          if (handler.defer_dispatch) {
            return utility.defer_on_event(
              handler.defer_dispatch.event_name,
              handler.defer_dispatch.check_function.bind(null, event_obj.data),
              this
            );
          }
        })
        .then(handler.dispatch.bind(handler, event_obj.data, event_obj))
        .then(dispatchResult => {

          // If the handler defines a transform_function, then use it to transform return data
          if(typeof handler.transform_function === 'function') {
            dispatchResult = handler.transform_function(dispatchResult, event_obj)
          }

          return dispatchResult;
        })
        .then(dispatchResult => {
          // enqueue EventComplete event w/ result data
          // Only enqueue it if the handler instructs us to, and if the event object isn't already an EventComplete event
          if(handler.enqueue_complete_event && !(event_obj instanceof EventComplete)) {
            this.enqueue_event(event_obj, dispatchResult, EventComplete);
          }

          // Emit dispatched event
          this.emit('dispatch', event_obj, handler);
        })
        .catch(e => {
          this.emit('error', new EventHandleError(e, event_obj, handler));
        })
    );

    if (!ret_promises.length && this.error_on_unhandled_events) {
      // No handlers for dispatched event
      this.emit(
        'error',
        new Error(`No handlers found for event ${event_obj.event_name}.`)
      );
    }

    // Create promise return
    return Promise.all(ret_promises);
  }

  /**
  * Enqueues an event to be handled
  *
  * @param {Event} event_obj - event to enqueue
  *
  * @memberof EventDispatcher
  */
  enqueue_event(event_name, event_data, constructor = Event, originator) {
    const event_obj = new constructor(event_name, event_data, originator);
    // Create event id
    event_obj.queue_id = this.event_count++;
    // Add new event to queue
    this.event_queue.push(event_obj);
    // Return event id
    return event_obj;
  }

  /**
   * Gets and earliest undispatched event and removes it from the list
   *
   * @return {object} - Event name and event data {event: {String}, data: {any}}
   *
   * @memberof EventDispatcher
   */
  shift_event() {
    return this.event_queue.shift();
  }

  /**
   * Shifts and dispatches all enqueued events
   *
   *
   * @memberof EventDispatcher
   */
  run() {
    let promises = [];

    while (this.event_queue_count > 0) {
      const event = this.shift_event();
      this.event_queue_dispatching.push(event);
      this.emit('dispatching', event);
      promises.push(this.dispatch_event(event).then(() => {
        const index = this.event_queue_dispatching.indexOf(event);
        if(index === -1) return;
        this.event_queue_dispatching.splice(index, 1);
      }));
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
   * @memberof EventDispatcher
   */
  get event_queue_count() {
    return this.event_queue.length;
  }
}