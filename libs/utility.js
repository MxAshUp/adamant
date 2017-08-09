const maybe_defer = (condition_fn, delay) => {
  return new Promise((resolve, reject) => {
    const check_condition = () => {
      condition_fn()
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

module.exports = {
  maybe_defer,
};
