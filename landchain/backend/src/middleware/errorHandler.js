// backend/src/middleware/errorHandler.js
const errorHandler = (err, req, res, next) => {
  console.error(`[ERROR] ${req.method} ${req.path}:`, err.message);
  res.status(err.status || 500).json({
    error: err.message || "Internal server error",
    path:  req.path
  });
};

module.exports = { errorHandler };
