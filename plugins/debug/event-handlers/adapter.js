const EventHandler = app_require('event-handler'),
  Event = app_require('event');

/**
 * Event handler for adapter one event to another. Listens for listen_event_name, calls mutator_fn, and enqueues new event call_event_name
 *
 * @class HandlerAdapter
 * @extends {EventHandler}
 */
class HandlerAdapter extends EventHandler {
  /**
   * Creates an instance of HandlerAdapter.
   * @param {object} args
   *
   * @memberOf HandlerAdapter
   */
  constructor(args) {
    super();
    this.default_args = {
      listen_event_name: '',
      call_event_name: '',
      mutator_fn: data => data
    };

    // Merges args with default args
    Object.assign(this.args, this.default_args, args);

    if(!this.args.listen_event_name) throw Error('listen_event_name required.');
    if(!this.args.call_event_name) throw Error('call_event_name required.');
    if(typeof this.args.mutator_fn !== 'function') throw Error('mutator_fn must be a function.');

    this.event_name = this.args.listen_event_name;
    this.supports_revert = false;
    this.version = '1.0';
    this.plugin_name = 'Debug Tools';
  }

  dispatch(data, event_id) {
    let new_data = this.args.mutator_fn(data);
    const new_event = new Event(this.args.call_event_name, new_data);
    this.emit('enqueue_event', new_event);
  }

}

module.exports = HandlerAdapter;