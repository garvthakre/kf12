/**
 * Send error response
 */
export const sendError = (res, status, message, errors = null) => {
  return res.status(status).json({
    success: false,
    message,
    errors
  });
};

/**
 * Send success response
 */
export const sendSuccess = (res, status, data, message = 'Success') => {
  return res.status(status).json({
    success: true,
    message,
    data
  });
};