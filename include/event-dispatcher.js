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
     * Run all redact_callback for event, asynchronously
     *
     * @param {string} event - Name of event
     *
     * @memberOf EventDispatcher
     */
    dispatch_redact_event(event_id) {

    }

    add_event_handler(handler) {

    }

    remove_event_handler() {

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