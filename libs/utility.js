const maybe_defer = (condition_fn, delay) => {
  return new Promise((resolve, reject) => {
    const check_condition = () => {
      Promise.resolve()
        .then(condition_fn)
        .then(defer => {
          if (defer) {
            setTimeout(check_condition, delay);
            return;
          }
          resolve();
        })
        .catch(e => {
          reject(new Error(e));
        });
    };
    check_condition();
  }).catch(e => {
    throw new Error(e);
  });
};

const defer_on_event = (event_name, defer_fn, event_emitter) => {
  return new Promise((resolve, reject) => {
    if (!event_name || !defer_fn || !event_emitter) {
      return resolve();
    }
    event_emitter.on(
      event_name,
      defer_fn.then(resolve).catch(e => reject(new Error(e)))
    );
  });
};

module.exports = {
  maybe_defer,
  defer_on_event,
};
