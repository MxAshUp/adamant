let EventHandler = require('./event-handler');
let Event = require('../event');
let workflow_count = 0; // Used in generate_workflow_name

/**
 * Workflow is an EventHandler that chains EventHandlers together, passing data between each "step."
 *
 * @class Workflow
 * @extends {EventHandler}
 */
class Workflow extends EventHandler {

  /**
   * Creates an instance of Workflow.
   * @param {string} workflow_name - (Optional) A name to give the workflow. This should be a unique namespace. If not specified, a unique name will be created.
   * @param - For other parameters, see EventHandler Class. Normal EventHandler arguments are allowed.
   * @memberof Workflow
   */
  constructor({workflow_name} = {}) {
    super(arguments);

    this.workflow_name = workflow_name ? workflow_name : Workflow.generate_workflow_name();
    this.event_handler_sequence = [this];
  }

  /**
   * Creates a unique workflow name.
   * @todo - Pull this out into application layer (other things need unique names too)
   *
   * @static
   * @returns {String} - name of workflow
   * @memberof Workflow
   */
  static generate_workflow_name() {
    workflow_count ++;
    return `workflow_${workflow_count}`;
  }

  /**
   * Registers a step in the workflow. Any EventHandler object can be registered. Note: The event_name of the handler registered will be changed.
   *
   * @param {EventHandler} handler - The EventHandler object to be used in the step
   * @returns {Worflow} - this, so the function can be chained.
   * @memberof Workflow
   */
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

  /**
   * Gets the number of steps in the workflow
   *
   * @returns {Number} - The number of steps in the workflow sequence
   * @memberof Workflow
   */
  get_current_step() {
    return this.event_handler_sequence.length;
  }

  /**
   * Formats an name for event based on step number, workflow name, and original event name
   *
   * @param {Number} step_number - The step number for the event being generated
   * @param {String} event_name - (Optional) The original event name
   * @returns
   * @memberof Workflow
   */
  format_event_name(step_number, event_name) {
    const name_parts = [this.workflow_name, `step_${step_number}`, event_name];
    const filtered_name_parts = name_parts.filter(part => part); // Remove parts of name that are empty
    return filtered_name_parts.join('.'); // Join parts with dot
  }

  /**
   * Wraps an EventHandler's transform function in a function that will enqueue an event, and preserve the original behavior of the transform_function
   *
   * @param {String} event_name - Name of event
   * @param {Function} original_transform_function - Original function of the EventHandler
   * @param {any} data - Data passed
   * @returns
   * @memberof Workflow
   */
  _transition_dispatch(event_name, original_transform_function, data) {
    original_transform_function = original_transform_function ? original_transform_function : d => d;
    return Promise.resolve()
      .then(() => original_transform_function(data))
      .then((new_data) => {
        const transition_event = new Event(event_name, new_data);
        this.emit('enqueue_event', transition_event);
        return new_data;
      });
  }
}

module.exports = Workflow;