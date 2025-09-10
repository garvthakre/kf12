import jwt from 'jsonwebtoken';
import { sendError } from '../utils/response.js';
import User from '../models/User.js';
import db from '../config/db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

/**
 * Set tenant context for RLS
 */
const setTenantContext = async (tenantId) => {
  await db.query('SET LOCAL app.tenant_id = $1', [tenantId]);
};

/**
 * JWT Authentication middleware
 */
export const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return sendError(res, 401, 'Access token required');
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Verify user exists and is active
    const user = await User.findByIdWithTenant(decoded.userId);
    
    if (!user) {
      return sendError(res, 401, 'Invalid or inactive user');
    }

    req.user = user;
    await setTenantContext(req.user.tenant_id);
    next();
  } catch (error) {
    return sendError(res, 401, 'Invalid token');
  }
};

export { JWT_SECRET };
 