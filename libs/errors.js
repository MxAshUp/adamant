class CustomError extends Error {
  constructor() {
    super();
    Error.captureStackTrace(this, this.constructor);
    this.name = this.constructor.name;
  }
}

class CollectorInitializeError extends CustomError {
  constructor(culprit) {
    super();
    this.culprit = culprit;
  }
}

class CollectorDatabaseError extends CustomError {
  constructor(culprit) {
    super();
    this.culprit = culprit;
  }
}

class EventHandleError extends CustomError {
  constructor(culprit, event_obj, handler) {
    super();
    this.culprit = culprit;
    this.event = event_obj;
    this.handler = handler;
  }
}

module.exports = {
  CollectorInitializeError: CollectorInitializeError,
  CollectorDatabaseError: CollectorDatabaseError,
  EventHandleError: EventHandleError,
};
