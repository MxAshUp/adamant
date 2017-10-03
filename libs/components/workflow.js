let EventHandler = require('./event-handler');
let Event = require('../event');
let workflow_count = 0;

/**
 *
 *
 * @class Workflow
 * @extends {EventHandler}
 */
class Workflow extends EventHandler {

  /**
   * Creates an instance of Workflow.
   * @param - See EventHandler Class for arguments
   * @memberof Workflow
   */
  constructor({workflow_name} = {}) {
    super(arguments);

    this.workflow_name = workflow_name ? workflow_name : Workflow.generate_workflow_name();
    this.event_handler_sequence = [this];
  }

  static generate_workflow_name() {
    workflow_count ++;
    return `workflow_${workflow_count}`;
  }

  step(handler) {

    // Get the current step
    const current_step = this.get_current_step();

    // Get previous step
    const previous_step = current_step - 1;
    const previous_step_handler = this.event_handler_sequence[previous_step];

    // Change the handler event name to fit in the workflow
    handler.event_name = this.format_event_name(current_step, handler.event_name);

    // Add transitioning handler
    const original_transform_function = previous_step_handler.transform_function;
    previous_step_handler.transform_function = this._transition_dispatch.bind(this, handler.event_name, original_transform_function);

    // Add handler to sequence
    this.event_handler_sequence.push(handler);

    return this;
  }

  get_current_step() {
    return this.event_handler_sequence.length;
  }

  format_event_name(step_number, event_name) {
    const name_parts = [this.workflow_name, `step_${step_number}`, event_name];
    const filtered_name_parts = name_parts.filter(part => part); // Remove parts of name that are empty
    return filtered_name_parts.join('.'); // Join parts with dot
  }

  _transition_dispatch(event_name, original_transform_function, data) {
    original_transform_function = original_transform_function ? original_transform_function : d => d;
    const new_data = original_transform_function(data);
    const transition_event = new Event(event_name, new_data);
    this.emit('enqueue_event', transition_event);
    return new_data;
  }
}

module.exports = Workflow;