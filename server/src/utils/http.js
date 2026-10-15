// HttpError lets any route stop with a status code and a clear message.
class HttpError extends Error {
  constructor(status, message, code) {
    super(message);
    this.status = status;
    this.code = code; // optional machine-readable code, e.g. 'SHARING_NOTICE'
  }
}

// Wraps async route handlers so errors go to the error handler.
const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

module.exports = { HttpError, asyncHandler };
