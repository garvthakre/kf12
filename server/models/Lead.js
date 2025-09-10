import db from '../config/db.js';

/**
 * Lead Model
 * Handles database operations for the leads table
 */
const LeadModel = {
  /**
   * Get leads with filters and pagination
   * @param {string} tenantId - Tenant UUID
   * @param {Object} filters - Filter and pagination options
   * @returns {Promise<Object>} - Leads data with pagination info
   */
  async getLeadsWithFilters(tenantId, filters) {
    const { 
      status, 
      stage, 
      owner, 
      exhibition_id, 
      q, 
      page = 1, 
      limit = 20, 
      sort = 'created_at', 
      order = 'desc' 
    } = filters;
    
    const offset = (page - 1) * limit;

    let whereConditions = ['l.tenant_id = $1'];
    let queryParams = [tenantId];
    let paramIndex = 2;

    // Build dynamic WHERE clause
    if (status) {
      whereConditions.push(`l.status = $${paramIndex++}`);
      queryParams.push(status);
    }
    if (stage) {
      whereConditions.push(`l.stage = $${paramIndex++}`);
      queryParams.push(stage);
    }
    if (owner) {
      whereConditions.push(`l.owner_user_id = $${paramIndex++}`);
      queryParams.push(owner);
    }
    if (exhibition_id) {
      whereConditions.push(`l.exhibition_id = $${paramIndex++}`);
      queryParams.push(exhibition_id);
    }
    if (q) {
      whereConditions.push(`(
        l.title ILIKE $${paramIndex} OR 
        c.first_name ILIKE $${paramIndex} OR 
        c.last_name ILIKE $${paramIndex} OR 
        c.email ILIKE $${paramIndex}
      )`);
      queryParams.push(`%${q}%`);
      paramIndex++;
    }

    const whereClause = whereConditions.join(' AND ');
    const sortOrder = order.toUpperCase();

    const query = `
      SELECT 
        l.*,
        c.first_name,
        c.last_name,
        c.email,
        c.phone,
        comp.name as company_name,
        tu.name as owner_name,
        COUNT(*) OVER() as total_count
      FROM leads l
      LEFT JOIN contacts c ON l.contact_id = c.id
      LEFT JOIN companies comp ON c.company_id = comp.id
      LEFT JOIN team_users tu ON l.owner_user_id = tu.id
      WHERE ${whereClause}
      ORDER BY l.${sort} ${sortOrder}
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    queryParams.push(limit, offset);
    
    const { rows } = await db.query(query, queryParams);
    const totalCount = rows.length > 0 ? parseInt(rows[0].total_count) : 0;
    
    return {
      leads: rows.map(row => {
        const { total_count, ...lead } = row;
        return lead;
      }),
      totalCount
    };
  },

  /**
   * Create new lead
   * @param {string} tenantId - Tenant UUID
   * @param {Object} leadData - Lead information
   * @returns {Promise<Object>} - New lead object
   */
  async create(tenantId, leadData) {
    const {
      contact_id,
      owner_user_id,
      title,
      status = 'new',
      stage = 'lead',
      score = 0,
      source = 'manual',
      exhibition_id,
      join_id,
      utm_source,
      utm_medium,
      utm_campaign,
      notes
    } = leadData;

    const query = `
      INSERT INTO leads (
        id, tenant_id, contact_id, owner_user_id, title, status, stage, score, 
        source, exhibition_id, join_id, utm_source, utm_medium, utm_campaign, notes
      )
      VALUES (
        gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14
      )
      RETURNING *
    `;

    const values = [
      tenantId,
      contact_id,
      owner_user_id,
      title,
      status,
      stage,
      score,
      source,
      exhibition_id,
      join_id,
      utm_source,
      utm_medium,
      utm_campaign,
      notes
    ];

    const { rows } = await db.query(query, values);
    return rows[0];
  },

  /**
   * Get lead by ID with full details
   * @param {string} leadId - Lead UUID
   * @param {string} tenantId - Tenant UUID
   * @returns {Promise<Object>} - Lead object with related data
   */
  async findByIdWithDetails(leadId, tenantId) {
    const query = `
      SELECT 
        l.*,
        c.first_name,
        c.last_name,
        c.email,
        c.phone,
        c.dob,
        comp.name as company_name,
        comp.website as company_website,
        tu.name as owner_name,
        tu.email as owner_email,
        COALESCE(
          json_agg(
            json_build_object('id', t.id, 'name', t.name)
          ) FILTER (WHERE t.id IS NOT NULL), 
          '[]'::json
        ) as tags
      FROM leads l
      LEFT JOIN contacts c ON l.contact_id = c.id
      LEFT JOIN companies comp ON c.company_id = comp.id
      LEFT JOIN team_users tu ON l.owner_user_id = tu.id
      LEFT JOIN lead_tags lt ON l.id = lt.lead_id
      LEFT JOIN tags t ON lt.tag_id = t.id
      WHERE l.id = $1 AND l.tenant_id = $2
      GROUP BY l.id, c.id, comp.id, tu.id
    `;

    const { rows } = await db.query(query, [leadId, tenantId]);
    return rows[0] || null;
  },

  /**
   * Update lead
   * @param {string} leadId - Lead UUID
   * @param {string} tenantId - Tenant UUID
   * @param {Object} updates - Lead data to update
   * @returns {Promise<Object>} - Updated lead object
   */
  async update(leadId, tenantId, updates) {
    const fields = Object.keys(updates);
    const setClause = fields.map((field, index) => `${field} = $${index + 3}`).join(', ');
    const values = Object.values(updates);

    const query = `
      UPDATE leads 
      SET ${setClause}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND tenant_id = $2
      RETURNING *
    `;

    const { rows } = await db.query(query, [leadId, tenantId, ...values]);
    return rows[0] || null;
  },

  /**
   * Check if lead exists
   * @param {string} leadId - Lead UUID
   * @param {string} tenantId - Tenant UUID
   * @returns {Promise<boolean>} - Existence status
   */
  async exists(leadId, tenantId) {
    const query = 'SELECT id FROM leads WHERE id = $1 AND tenant_id = $2';
    const { rows } = await db.query(query, [leadId, tenantId]);
    return rows.length > 0;
  },

  /**
   * Get lead with complete contact information
   * @param {string} leadId - Lead UUID
   * @returns {Promise<Object>} - Complete lead data
   */
  async getCompleteLeadData(leadId) {
    const query = `
      SELECT 
        l.*,
        c.first_name,
        c.last_name,
        c.email,
        c.phone,
        comp.name as company_name
      FROM leads l
      LEFT JOIN contacts c ON l.contact_id = c.id
      LEFT JOIN companies comp ON c.company_id = comp.id
      WHERE l.id = $1
    `;
    
    const { rows } = await db.query(query, [leadId]);
    return rows[0] || null;
  },

  /**
   * Delete a lead
   * @param {string} leadId - Lead UUID
   * @param {string} tenantId - Tenant UUID
   * @returns {Promise<boolean>} - Success status
   */
  async delete(leadId, tenantId) {
    const query = 'DELETE FROM leads WHERE id = $1 AND tenant_id = $2';
    const { rowCount } = await db.query(query, [leadId, tenantId]);
    return rowCount > 0;
  },

  /**
   * Count total leads
   * @param {string} tenantId - Tenant UUID
   * @param {Object} filters - Filter options
   * @returns {Promise<number>} - Total lead count
   */
  async countTotal(tenantId, filters = {}) {
    let query = 'SELECT COUNT(*) FROM leads l WHERE l.tenant_id = $1';
    const queryParams = [tenantId];
    let paramIndex = 2;

    if (filters.status) {
      query += ` AND l.status = $${paramIndex}`;
      queryParams.push(filters.status);
      paramIndex++;
    }
    if (filters.stage) {
      query += ` AND l.stage = $${paramIndex}`;
      queryParams.push(filters.stage);
      paramIndex++;
    }
    if (filters.owner) {
      query += ` AND l.owner_user_id = $${paramIndex}`;
      queryParams.push(filters.owner);
      paramIndex++;
    }

    const { rows } = await db.query(query, queryParams);
    return parseInt(rows[0].count);
  },

  /**
   * Get lead statistics by status and stage
   * @param {string} tenantId - Tenant UUID
   * @returns {Promise<Array>} - Lead stats
   */
  async getLeadStats(tenantId) {
    const query = `
      SELECT 
        status,
        stage,
        COUNT(*) as count,
        AVG(score) as avg_score,
        COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '30 days') as recent_count
      FROM leads
      WHERE tenant_id = $1
      GROUP BY status, stage
      ORDER BY count DESC
    `;
    
    const { rows } = await db.query(query, [tenantId]);
    return rows;
  },

  /**
   * Get leads by owner for leaderboard
   * @param {string} tenantId - Tenant UUID
   * @param {number} limit - Number of results
   * @returns {Promise<Array>} - Leaderboard data
   */
  async getLeaderboard(tenantId, limit = 10) {
    const query = `
      SELECT 
        tu.name as owner_name,
        tu.email as owner_email,
        COUNT(l.id) as total_leads,
        COUNT(*) FILTER (WHERE l.status = 'converted') as converted_leads,
        AVG(l.score) as avg_score,
        ROUND(
          (COUNT(*) FILTER (WHERE l.status = 'converted')::decimal / COUNT(l.id)) * 100, 
          2
        ) as conversion_rate
      FROM team_users tu
      LEFT JOIN leads l ON tu.id = l.owner_user_id AND l.tenant_id = tu.tenant_id
      WHERE tu.tenant_id = $1 AND tu.is_active = true
      GROUP BY tu.id, tu.name, tu.email
      HAVING COUNT(l.id) > 0
      ORDER BY converted_leads DESC, total_leads DESC
      LIMIT $2
    `;
    
    const { rows } = await db.query(query, [tenantId, limit]);
    return rows;
  }
};

export default LeadModel;