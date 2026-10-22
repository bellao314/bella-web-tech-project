export function notFoundHandler(req, _res, next) {
  const error = new Error(`Route not found: ${req.method} ${req.originalUrl}`);
  error.statusCode = 404;
  next(error);
}

export function errorHandler(error, _req, res, _next) {
  res.status(error.statusCode || 500).json({
    error: error.message || "Internal server error.",
    ...(error.details && { details: error.details }),
  });
}
