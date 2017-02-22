`use strict`;

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

module.exports = {
    CollectorInitializeError: CollectorInitializeError
}

