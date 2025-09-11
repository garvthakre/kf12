import db from '../config/db.js';

/**
 * User Model
 * Handles database operations for the team_users table
 */
const UserModel = {
  /**
   * Find user by ID with tenant information
   * @param {string} userId - User UUID
   * @returns {Promise<Object>} - User object with tenant info
   */
  async findByIdWithTenant(userId) {
    const query = `
      SELECT tu.*, t.name as tenant_name 
      FROM team_users tu 
      JOIN tenants t ON tu.tenant_id = t.id 
      WHERE tu.id = $1 AND tu.is_active = true
    `;
    const { rows } = await db.query(query, [userId]);
    return rows[0] || null;
  },

  /**
   * Find user by email and tenant
   * @param {string} email - User email
   * @param {string} tenantId - Tenant UUID
   * @returns {Promise<Object>} - User object
   */
  async findByEmailAndTenant(email, tenantId) {
    const query = `
      SELECT tu.*, t.name as tenant_name 
      FROM team_users tu 
      JOIN tenants t ON tu.tenant_id = t.id 
      WHERE tu.email = $1 AND tu.tenant_id = $2 AND tu.is_active = true
    `;
    const { rows } = await db.query(query, [email, tenantId]);
    return rows[0] || null;
  },

  /**
   * Create or update user with password hash
   * @param {Object} userData - User information
   * @returns {Promise<Object>} - User object
   */
  async create(userData) {
    const {
      tenant_id,
      email,
      name,
      role,
      password_hash
    } = userData;

    const query = `
      INSERT INTO team_users (id, tenant_id, email, name, role, password_hash, is_active)
      VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6)
      ON CONFLICT (email, tenant_id) 
      DO UPDATE SET 
        name = EXCLUDED.name,
        role = EXCLUDED.role,
        password_hash = EXCLUDED.password_hash,
        is_active = EXCLUDED.is_active
      RETURNING *
    `;

    const values = [
      tenant_id,
      email,
      name,
      role || 'agent',
      password_hash,
      true
    ];

    const { rows } = await db.query(query, values);
    return rows[0];
  },

  /**
   * Validate if user exists and is active in tenant
   * @param {string} userId - User UUID
   * @param {string} tenantId - Tenant UUID
   * @returns {Promise<boolean>} - Validation result
   */
  async validateUser(userId, tenantId) {
    const query = `
      SELECT id FROM team_users 
      WHERE id = $1 AND tenant_id = $2 AND is_active = true
    `;
    const { rows } = await db.query(query, [userId, tenantId]);
    return rows.length > 0;
  },

  /**
   * Get all active users in tenant
   * @param {string} tenantId - Tenant UUID
   * @param {Object} filters - Filter options
   * @returns {Promise<Array>} - Array of users
   */
  async findAll(tenantId, filters = {}) {
    let query = `
      SELECT tu.*, t.name as tenant_name
      FROM team_users tu
      JOIN tenants t ON tu.tenant_id = t.id
      WHERE tu.tenant_id = $1 AND tu.is_active = true
    `;
    
    const queryParams = [tenantId];
    let paramIndex = 2;

    // Add role filter
    if (filters.role) {
      query += ` AND tu.role = $${paramIndex}`;
      queryParams.push(filters.role);
      paramIndex++;
    }

    // Add search filter
    if (filters.search) {
      query += ` AND (
        tu.name ILIKE $${paramIndex} OR
        tu.email ILIKE $${paramIndex}
      )`;
      queryParams.push(`%${filters.search}%`);
      paramIndex++;
    }

    // Add sorting
    if (filters.sort_by) {
      const sortField = filters.sort_by.replace(/[^a-zA-Z0-9_.]/g, '');
      const sortOrder = filters.sort_order?.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';
      query += ` ORDER BY ${sortField} ${sortOrder}`;
    } else {
      query += ' ORDER BY tu.created_at DESC';
    }

    const { rows } = await db.query(query, queryParams);
    return rows;
  },

 
  /**
   * Update user information
   * @param {string} userId - User UUID
   * @param {string} tenantId - Tenant UUID
   * @param {Object} userData - User data to update
   * @returns {Promise<Object>} - Updated user object
   */
  async update(userId, tenantId, userData) {
    const {
      email,
      name,
      role,
      is_active,
      password_hash
    } = userData;

    const query = `
      UPDATE team_users
      SET 
        email = COALESCE($1, email),
        name = COALESCE($2, name),
        role = COALESCE($3, role),
        is_active = COALESCE($4, is_active),
        password_hash = COALESCE($5, password_hash)
      WHERE id = $6 AND tenant_id = $7
      RETURNING *
    `;

    const values = [
      email,
      name,
      role,
      is_active,
      password_hash,
      userId,
      tenantId
    ];

    const { rows } = await db.query(query, values);
    return rows[0];
  },

  /**
   * Get user statistics
   * @param {string} tenantId - Tenant UUID
   * @returns {Promise<Array>} - User stats by role
   */
  async getUserStats(tenantId) {
    const query = `
      SELECT 
        role,
        COUNT(*) as count,
        COUNT(*) FILTER (WHERE is_active = true) as active_count
      FROM team_users
      WHERE tenant_id = $1
      GROUP BY role
      ORDER BY count DESC
    `;
    
    const { rows } = await db.query(query, [tenantId]);
    return rows;
  }
};

export default UserModel