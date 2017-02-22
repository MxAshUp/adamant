

class EventDispatcher {

  constructor() {

  }

  /**
  * Runs all callbacks for event asynchronously
  *
  * @param {string} event - Name of event
  * @return {Promise} - Promise resolves when all callbacks finish
  *
  * @memberOf EventDispatcher
  */
  dispatch_event(event) {

  }

  /**
  * Run revert for a particular event
  *
  * @param {number} event_handle_id - Id of event handler instance
  *
  * @memberOf EventDispatcher
  */
  revert_event(event_handler, args) {

  }

  /**
  * Adds event handler to memeory
  *
  * @param {EventHandler} handler
  *
  * @memberOf EventDispatcher
  */
  add_event_handler(handler) {

  }

  /**
  * Enqueues an event in database to be handled when ready
  *
  * @param {string} event_name - Name of event to enqueue
  * @param {any} data - Passed along to event handlers
  * @param {any} timestamp
  *
  * @memberOf EventDispatcher
  */
  enqueue_event(event_name, data, timestamp) {

  }

}