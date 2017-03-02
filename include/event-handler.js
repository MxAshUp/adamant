const mongoose = require('./mongoose-utilities'),
_ = require('lodash');

class EventHandler {

  /**
  * Creates an instance of EventHandler.
  *
  *
  * @memberOf EventHandler
  */
  constructor(config, args) {

    //Default object properties
    const defaults = {
      default_args: {},
      event_name: '',
      supports_revert: true,
      version: '',
      plugin_name: '',
      instance_id: ''
    };

    // Merge config and assign properties to this
    Object.assign(this, defaults, config);

    //If revert not supported, throw error if called
    if(!this.supports_revert) {
      this.revert = () => {throw Error('Handler does not support revert.');};
    }

    // Merges args with default args
    this.args = this.default_args;
    Object.assign(this.args, args);

  }

  /**
  * Method that performs action when event is dispatched
  *
  * @param {any} data
  *
  * @memberOf EventHandler
  */
  dispatch(data) {

  }

  /**
  * Method that reverts actions performed in dispatch
  *
  * @param {any} data - Data returned from dispatch event
  *
  * @memberOf EventHandler
  */
  revert(data) {

  }

}

module.exports = EventHandler;