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

const defer_until_event = (handler, event_dispatcher) => {
  return new Promise((resolve, reject) => {
    if (
      !handler ||
      !handler.defer ||
      !handler.defer.event_name ||
      !event_dispatcher
    ) {
      resolve();
    }
    event_dispatcher.on(handler.defer.event_name, resolve);
  });
};

module.exports = {
  maybe_defer,
  defer_until_event,
};
