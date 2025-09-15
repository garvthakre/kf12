import db from '../config/db.js';

/**
 * Opportunity Model
 * Handles database operations for the opportunities table
 */
const OpportunityModel = {
  /**
   * Create a new opportunity
   * @param {Object} opportunityData - Opportunity information
   * @returns {Promise<Object>} - Created opportunity
   */
  async create(opportunityData) {
    const {
      tenant_id,
      name,
      lead_id,
      contact_id,
      company_id,
      pipeline_id,
      stage_id,
      amount,
      currency,
      close_date
    } = opportunityData;

    const query = `
      INSERT INTO opportunities (
        id, tenant_id, name, lead_id, contact_id, company_id,
        pipeline_id, stage_id, amount, currency, close_date, status
      )
      VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'open')
      RETURNING *
    `;

    const values = [
      tenant_id, name, lead_id, contact_id, company_id,
      pipeline_id, stage_id, amount || 0, currency || 'INR', close_date
    ];

    const { rows } = await db.query(query, values);
    return rows[0];
  },

  /**
   * Get all opportunities with filters
   * @param {string} tenantId - Tenant UUID
   * @param {Object} filters - Filter options
   * @returns {Promise<Array>} - Array of opportunities
   */
  async findAll(tenantId, filters = {}) {
    let query = `
      SELECT 
        o.*,
        c.first_name || ' ' || c.last_name as contact_name,
        c.email as contact_email,
        comp.name as company_name,
        p.name as pipeline_name,
        ps.name as stage_name,
        l.title as lead_title
      FROM opportunities o
      LEFT JOIN contacts c ON o.contact_id = c.id
      LEFT JOIN companies comp ON o.company_id = comp.id
      LEFT JOIN pipelines p ON o.pipeline_id = p.id
      LEFT JOIN pipeline_stages ps ON o.stage_id = ps.id
      LEFT JOIN leads l ON o.lead_id = l.id
      WHERE o.tenant_id = $1
    `;

    const queryParams = [tenantId];
    let paramIndex = 2;

    // Status filter
    if (filters.status) {
      query += ` AND o.status = $${paramIndex}`;
      queryParams.push(filters.status);
      paramIndex++;
    }

    // Close date filters
    if (filters.close_before) {
      query += ` AND o.close_date <= $${paramIndex}`;
      queryParams.push(filters.close_before);
      paramIndex++;
    }

    if (filters.close_after) {
      query += ` AND o.close_date >= $${paramIndex}`;
      queryParams.push(filters.close_after);
      paramIndex++;
    }

    // Pipeline filter
    if (filters.pipeline_id) {
      query += ` AND o.pipeline_id = $${paramIndex}`;
      queryParams.push(filters.pipeline_id);
      paramIndex++;
    }

    // Stage filter
    if (filters.stage_id) {
      query += ` AND o.stage_id = $${paramIndex}`;
      queryParams.push(filters.stage_id);
      paramIndex++;
    }

    // Search filter
    if (filters.q) {
      query += ` AND (
        o.name ILIKE $${paramIndex} OR
        c.first_name ILIKE $${paramIndex} OR
        c.last_name ILIKE $${paramIndex} OR
        comp.name ILIKE $${paramIndex}
      )`;
      queryParams.push(`%${filters.q}%`);
      paramIndex++;
    }

    // Pagination
    if (filters.limit) {
      query += ` ORDER BY o.created_at DESC LIMIT $${paramIndex}`;
      queryParams.push(parseInt(filters.limit));
      paramIndex++;

      if (filters.offset) {
        query += ` OFFSET $${paramIndex}`;
        queryParams.push(parseInt(filters.offset));
        paramIndex++;
      }
    } else {
      query += ' ORDER BY o.created_at DESC';
    }

    const { rows } = await db.query(query, queryParams);
    return rows;
  },

  /**
   * Get opportunity by ID
   * @param {string} opportunityId - Opportunity UUID
   * @param {string} tenantId - Tenant UUID
   * @returns {Promise<Object>} - Opportunity details
   */
  async findById(opportunityId, tenantId) {
    const query = `
      SELECT 
        o.*,
        c.first_name || ' ' || c.last_name as contact_name,
        c.email as contact_email,
        c.phone as contact_phone,
        comp.name as company_name,
        comp.website as company_website,
        p.name as pipeline_name,
        ps.name as stage_name,
        ps.probability as stage_probability,
        l.title as lead_title,
        l.status as lead_status
      FROM opportunities o
      LEFT JOIN contacts c ON o.contact_id = c.id
      LEFT JOIN companies comp ON o.company_id = comp.id
      LEFT JOIN pipelines p ON o.pipeline_id = p.id
      LEFT JOIN pipeline_stages ps ON o.stage_id = ps.id
      LEFT JOIN leads l ON o.lead_id = l.id
      WHERE o.id = $1 AND o.tenant_id = $2
    `;

    const { rows } = await db.query(query, [opportunityId, tenantId]);
    return rows[0] || null;
  },

  /**
   * Update opportunity
   * @param {string} opportunityId - Opportunity UUID
   * @param {string} tenantId - Tenant UUID
   * @param {Object} updateData - Data to update
   * @returns {Promise<Object>} - Updated opportunity
   */
  async update(opportunityId, tenantId, updateData) {
    const {
      stage_id,
      status,
      amount,
      currency,
      close_date,
      name
    } = updateData;

    const query = `
      UPDATE opportunities
      SET 
        stage_id = COALESCE($1, stage_id),
        status = COALESCE($2, status),
        amount = COALESCE($3, amount),
        currency = COALESCE($4, currency),
        close_date = COALESCE($5, close_date),
        name = COALESCE($6, name),
        updated_at = now()
      WHERE id = $7 AND tenant_id = $8
      RETURNING *
    `;

    const values = [
      stage_id,
      status,
      amount,
      currency,
      close_date,
      name,
      opportunityId,
      tenantId
    ];

    const { rows } = await db.query(query, values);
    return rows[0];
  },

  /**
   * Get opportunity statistics
   * @param {string} tenantId - Tenant UUID
   * @returns {Promise<Object>} - Opportunity stats
   */
  async getStats(tenantId) {
    const query = `
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'open') as open,
        COUNT(*) FILTER (WHERE status = 'won') as won,
        COUNT(*) FILTER (WHERE status = 'lost') as lost,
        COALESCE(SUM(amount) FILTER (WHERE status = 'open'), 0) as open_value,
        COALESCE(SUM(amount) FILTER (WHERE status = 'won'), 0) as won_value,
        COALESCE(SUM(amount) FILTER (WHERE status = 'lost'), 0) as lost_value
      FROM opportunities
      WHERE tenant_id = $1
    `;

    const { rows } = await db.query(query, [tenantId]);
    return rows[0];
  }
};

export default OpportunityModel;