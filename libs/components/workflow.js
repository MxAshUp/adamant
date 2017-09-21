let EventHandler = require('./event-handler');
let Event = require('../event');

class Workflow extends EventHandler {
  constructor({
    event_name,
    should_handle = '',
    defer_dispatch = '',
    load_component_function = null,
  } = {}) {

    super({
      event_name: event_name,
      should_handle: should_handle,
      defer_dispatch: defer_dispatch,
      transform_function: null,
      enqueue_complete_event: true,
    });

    this.load_component = load_component_function;

    this.event_handler_sequence = [this];

  }

  register_step(handler) {
    // Get the current step
    const current_step = this.get_step_length();

    // Change the handler event name to fit in the workflow
    handler.event_name = this.format_event_name(current_step, handler.event_name);

    // Add transitioning handler
    this._augment_handler_for_transition(previous_handler, current_step - 1);

    // Add handler to sequence
    this.event_handler_sequence.push(handler);
  }

  _augment_handler_for_transition(handler, step_number) {
    const original_transform_function = handler.transform_function;
    handler.transform_function = this._transition_dispatch.bind(this, handler.event_name, original_transform_function);
  }

  _create_transition_handler(handler, step_number) {
    const previous_step = step_number - 1;
    const previous_step_handler = this.event_handler_sequence[previous_step];
    const previous_step_handler_name = previous_step_handler.event_name;

    const transition_handler_parameters = {
      event_name: `${previous_step_handler_name}.complete`,
      transform_function: this._transition_dispatch.bind(this, handler.event_name)
    };

    return this.load_component('EventHandler', transition_handler_parameters);
  }

  _transition_dispatch(event_name, data, original_transform_function) {
    const transition_event = new Event(event_name, data);
    this.emit('enqueue_event', transition_event);
    return original_transform_function(data);
  }

  get_step_length() {
    return this.event_handler_sequence.length;
  }

  format_event_name(step_number, event_name) {
    return `${this.workflow_name}.step_${step_number}.${event_name}`;
  }
}

module.exports = Workflow;