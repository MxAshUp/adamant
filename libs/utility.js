const maybe_defer_handler = (handler, resolve, reject) => {
  handler
    .should_defer()
    .then(defer => {
      if (defer) {
        setTimeout(maybe_defer_handler, handler.defer_delay);
        return;
      }
      resolve();
    })
    .catch(e => {
      reject(new Error(e));
    });
};

module.exports = {
  maybe_defer_handler,
};
