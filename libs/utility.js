const defer_on_event = (event_name, defer_fn, event_emitter) => {
  return new Promise((resolve, reject) => {
    event_emitter.on(
      event_name,
      defer_fn
        .then(
          res =>
            res
              ? resolve()
              : reject(new Error('Event handler defer fn resolved false'))
        )
        .catch(e => reject(new Error(e)))
    );
  });
};

module.exports = {
  defer_on_event,
};
