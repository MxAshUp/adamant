const EventEmitter = require('events');

class EventHandler extends EventEmitter {
  /**
  * Creates an instance of EventHandler.
  *
  *
  * @memberOf EventHandler
  */
  constructor() {
    super();

    //Default object properties
    const defaults = {
      default_args: {},
      args: {},
      event_name: '',
      supports_revert: false,
      instance_id: '',
      should_handle: null,
      enqueue_complete_event: false,
    };

    // Merge config and assign properties to this
    Object.assign(this, defaults);
  }

  /**
  * Method that performs action when event is dispatched
  *
  * @param {any} data
  *
  * @memberOf EventHandler
  */
  dispatch(data) {}

  /**
  * Method that reverts actions performed in dispatch
  *
  * @param {any} data - Data returned from dispatch event
  *
  * @memberOf EventHandler
  */
  revert(data) {
    //If revert not supported, throw error if called
    if (!this.supports_revert) {
      throw Error('Handler does not support revert.');
    }
  }

}

module.exports = EventHandler;
