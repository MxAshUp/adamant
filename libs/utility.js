const defer_on_event = (event_name, defer_fn, event_emitter) => {
  const handle_fn = (resolve, reject) => {
    Promise.resolve()
      .then(defer_fn)
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

  return new Promise((resolve, reject) => {
    event_emitter.addListener(event_name, () => handle_fn(resolve, reject));
  });
};

module.exports = {
  defer_on_event,
};
