const Component = require('./component');
const throwIfMissing = require('../utility').throwIfMissing;

module.exports = class EventHandler extends Component {
  /**
   * Creates an instance of EventHandler.
   *
   * @param {Object} args - Arguments object
   * @param {String} args.event_name - Event name the EventHandler will listen for.
   * @param {Function} [args.should_handle=] - Function to call to check if dispatch should be handled.
   * @param {Object} [args.defer_dispatch=] - {event_name = '', check_function = ()}
   * @param {boolean} [args.enqueue_complete_event=false] - Allows EventComplete to be enqueued after EventHandler dispatches this event.
   * @param {Function} [args.transform_function=null] - The function to be called after dispatch to translate data before passing it on.
   * @memberof EventHandler
   */
  constructor(args = {}) {

    let {
      event_name = throwIfMissing`event_name`,
      should_handle = null,
      defer_dispatch = null, // {event_name = '', check_function = ()}
      enqueue_complete_event = false,
      transform_function = null,
    } = args;

    super(args);

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
      transform_function: transform_function ? transform_function.bind(this) : null,
    };

    // Merge config and assign properties to this
    Object.assign(this, defaults);
  }

  /**
  * Method that performs action when event is dispatched
  *
  * @param {any} data
  *
  * @memberof EventHandler
  */
  dispatch(data) {
    return data;
  }

  /**
  * Method that reverts actions performed in dispatch
  *
  * @param {any} data - Data returned from dispatch event
  *
  * @memberof EventHandler
  */
  revert(data) {
    //If revert not supported, throw error if called
    if (!this.supports_revert) {
      throw Error('Handler does not support revert.');
    }
  }
}