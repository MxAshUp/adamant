const Component = require('./component');

class EventHandler extends Component {
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
      should_handle: null, // Function
      defer_dispatch: null, // {event_name: String, check_function: Function}
      enqueue_complete_event: false,
      transform_function: null,
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
  dispatch(data) {
    return typeof this.transform_function === 'function' ? this.transform_function(data) : data;
  }

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
