/**
 * Creates a promise that executes defer_fn and resolves if returns truthy. defer_fn is executed only when event_emitter has event_name emitted
 *
 * @param {String} event_name
 * @param {Function} defer_fn
 * @param {EventEmitter} event_emitter
 * @returns
 */
module.exports.defer_on_event = (event_name, defer_fn, event_emitter) => {
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
module.exports.Counter = Counter;

/**
 * Gets the inheritance chain for a Component starting with Component
 *
 * @param {Component} obj
 * @returns
 */
module.exports.get_component_inheritance = (obj) => {
  var chain = [obj];

  var prototype = obj;
  while (prototype = Object.getPrototypeOf(prototype)) {
    chain.push(prototype);
  }

  // Remove inheritance after Component
  while(chain[chain.length - 1].constructor.name !== 'Component') chain.pop();

  // Remove first constructor (it's a duplicate)
  chain.shift();

  return chain.map(d => d.constructor);
};

module.exports.throwIfMissing = (parameter_name) => {
  const new_error = new Error(`Missing required parameter: ${parameter_name}`);

  const stack_lines = new_error.stack.split("\n");
  stack_lines.splice(1, 1);
  new_error.stack = stack_lines.join("\n");

  throw new_error;
}