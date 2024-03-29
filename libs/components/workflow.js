const EventHandler = require('./event-handler');
const Event = require('../event');

// Static var used in generate_workflow_name
let workflow_count = 0;

/**
 * Workflow is an EventHandler that chains EventHandlers together, passing data between each "step."
 *
 * @class Workflow
 * @extends {EventHandler}
 */
module.exports = class Workflow extends EventHandler {

  /**
   * Creates an instance of Workflow.
   * @param {string} workflow_name - (Optional) A name to give the workflow. This should be a unique namespace. If not specified, a unique name will be created.
   * @param - For other parameters, see EventHandler Class. Normal EventHandler arguments are allowed.
   * @memberof Workflow
   */
  constructor(args = {}) {

    let {
      workflow_name
    } = args;

    super(args);

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

    const step_event_name = this.format_event_name(current_step);

    // Change the handler event name to fit in the workflow
    handler.event_name = [step_event_name];

    // Add transitioning handler
    const original_transform_function = previous_step_handler.transform_function;
    previous_step_handler.transform_function = this._transition_dispatch.bind(this, step_event_name, original_transform_function);

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
  format_event_name(step_number) {
    return `${this.workflow_name}.step_${step_number}`;
  }

  /**
   * Wraps an EventHandler's transform function in a function that will enqueue an event, and preserve the original behavior of the transform_function
   *
   * @param {String} event_name - Name of event
   * @param {Function} original_transform_function - Original function of the EventHandler
   * @param {any} data - Data passed
   * @returns {Promise} - resolves when transform_function is finished
   * @memberof Workflow
   */
  _transition_dispatch(event_name, original_transform_function, data, event_obj) {
    original_transform_function = original_transform_function ? original_transform_function : d => d;
    return Promise.resolve()
      .then(() => original_transform_function(data, event_obj))
      .then((new_data) => {
        // Only enqueue next event if data was passed.
        // If no data was passed, it's break
        if(!!new_data) {
          this.emit('enqueue_event', event_name, new_data, Event, event_obj.originator);
        }
        return new_data;
      });
  }
}