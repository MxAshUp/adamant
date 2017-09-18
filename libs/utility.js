/**
 * Creates a promise that executes defer_fn and resolves if returns truthy. defer_fn is executed only when event_emitter has event_name emitted
 *
 * @param {String} event_name
 * @param {Function} defer_fn
 * @param {EventEmitter} event_emitter
 * @returns
 */
const defer_on_event = (event_name, defer_fn, event_emitter) => {
  return new Promise((resolve, reject) => {
    const handle_fn = (event_data) => {
      Promise.resolve()
        .then(defer_fn.bind(null, event_data))
        .then(res => {
          if (res) {
            event_emitter.removeListener(event_name, handle_fn);
            resolve();
          }
        })
        .catch(e => {
          event_emitter.removeListener(event_name, handle_fn);
          reject(e);
        });
    };
    event_emitter.addListener(event_name, handle_fn);
  });
};

class Counter {
  constructor() {
    this.counters = {};
  }
  increment(index) {
    if(!(index in this.counters)) {
      this.counters[index] = 0;
    }
    this.counters[index]++;
  }
};

/**
 * Gets the inheritance chain for a Component starting with Component
 *
 * @param {Component} obj
 * @returns
 */
const get_component_inheritance = (obj) => {
  var chain = [obj];

  var prototype = obj;
  while (prototype = Object.getPrototypeOf(prototype)) {
    chain.push(prototype);
  }

  // Remove first constructor (it's a duplicate)
  chain.shift();

  // Remove inheritance after Component
  while(chain.pop().constructor.name !== 'Component');

  return chain.map(d => d.constructor);
};

module.exports = {
  defer_on_event,
  Counter,
  get_component_inheritance
};
