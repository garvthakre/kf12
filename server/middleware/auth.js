import jwt from 'jsonwebtoken';
import { sendError } from '../utils/response.js';
import User from '../models/User.js';
import db from '../config/db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

/**
 * Set tenant context for RLS
 */
const setTenantContext = async (tenantId) => {
  try {
    await db.query('SET LOCAL app.tenant_id = $1', [tenantId]);
  } catch (error) {
    console.error('Error setting tenant context:', error);
  }
};

/**
 * JWT Authentication middleware
 */
export const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return sendError(res, 401, 'Access token required');
    }

    // Verify JWT token
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (jwtError) {
      if (jwtError.name === 'TokenExpiredError') {
        return sendError(res, 401, 'Token expired');
      }
      return sendError(res, 401, 'Invalid token');
    }

    // Verify user exists and is active
    const user = await User.findByIdWithTenant(decoded.userId);
    
    if (!user) {
      return sendError(res, 401, 'Invalid or inactive user');
    }

    // Ensure token tenant matches user tenant
    if (user.tenant_id !== decoded.tenantId) {
      return sendError(res, 401, 'Token tenant mismatch');
    }

    // Set user info in request
    req.user = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      tenant_id: user.tenant_id,
      tenant_name: user.tenant_name
    };

    // Set tenant context for RLS
    await setTenantContext(req.user.tenant_id);
    
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    return sendError(res, 401, 'Authentication failed');
  }
};

export { JWT_SECRET };