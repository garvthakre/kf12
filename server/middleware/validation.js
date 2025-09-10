import { validationResult } from 'express-validator';
import { sendError } from '../utils/response.js';

/**
 * Validation middleware
 */
export const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return sendError(res, 422, 'Validation error', errors.array());
  }
  next();
};