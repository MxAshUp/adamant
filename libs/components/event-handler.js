const Component = require('./component');
const throwIfMissing = require('../utility').throwIfMissing;

module.exports = class EventHandler extends Component {
  /**
   * Creates an instance of EventHandler.
   * @param {Object} [{
   *     event_name = '',
   *     should_handle = null,
   *     defer_dispatch = null, // {event_name = '', check_function = ()}
   *     enqueue_complete_event = false,
   *     transform_function = null,
   *   }]
   * @memberof EventHandler
   */
  constructor({
    event_name = throwIfMissing`event_name`,
    should_handle = null,
    defer_dispatch = null, // {event_name = '', check_function = ()}
    enqueue_complete_event = false,
    transform_function = null,
  } = {}) {

    super(...arguments);

    //Default object properties
    const defaults = {
      default_args: {},
      args: {},
      event_name: event_name,
      supports_revert: false,
      instance_id: '',
      should_handle: should_handle,
      defer_dispatch: defer_dispatch,
      enqueue_complete_event: enqueue_complete_event,
      transform_function: transform_function,
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
    return data;
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