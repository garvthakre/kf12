import db from '../config/db.js';

/**
 * Interaction Model
 * Handles database operations for the interactions table
 */
const InteractionModel = {
  /**
   * Get interactions with filters and pagination
   * @param {string} tenantId - Tenant UUID
   * @param {Object} filters - Filter and pagination options
   * @returns {Promise<Object>} - Interactions data with pagination info
   */
  async getInteractionsWithFilters(tenantId, filters) {
    const { 
      lead_id,
      contact_id, 
      channel,
      direction,
      date_from,
      date_to,
      page = 1, 
      limit = 20 
    } = filters;
    
    const offset = (page - 1) * limit;

    let whereConditions = ['i.tenant_id = $1'];
    let queryParams = [tenantId];
    let paramIndex = 2;

    // Build dynamic WHERE clause
    if (lead_id) {
      whereConditions.push(`i.lead_id = $${paramIndex++}`);
      queryParams.push(lead_id);
    }
    if (contact_id) {
      whereConditions.push(`i.contact_id = $${paramIndex++}`);
      queryParams.push(contact_id);
    }
    if (channel) {
      whereConditions.push(`i.channel = $${paramIndex++}`);
      queryParams.push(channel);
    }
    if (direction) {
      whereConditions.push(`i.direction = $${paramIndex++}`);
      queryParams.push(direction);
    }
    if (date_from) {
      whereConditions.push(`DATE(i.occurred_at) >= $${paramIndex++}`);
      queryParams.push(date_from);
    }
    if (date_to) {
      whereConditions.push(`DATE(i.occurred_at) <= $${paramIndex++}`);
      queryParams.push(date_to);
    }

    const whereClause = whereConditions.join(' AND ');

    const query = `
      SELECT 
        i.*,
        l.title as lead_title,
        c.first_name || ' ' || c.last_name as contact_name,
        c.email as contact_email,
        tu.name as creator_name,
        tu.email as creator_email,
        COUNT(*) OVER() as total_count
      FROM interactions i
      LEFT JOIN leads l ON i.lead_id = l.id
      LEFT JOIN contacts c ON i.contact_id = c.id
      LEFT JOIN team_users tu ON i.created_by = tu.id
      WHERE ${whereClause}
      ORDER BY i.occurred_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    queryParams.push(limit, offset);
    
    const { rows } = await db.query(query, queryParams);
    const totalCount = rows.length > 0 ? parseInt(rows[0].total_count) : 0;
    
    return {
      interactions: rows.map(row => {
        const { total_count, ...interaction } = row;
        return interaction;
      }),
      totalCount
    };
  },

  /**
   * Create new interaction
   * @param {string} tenantId - Tenant UUID
   * @param {Object} interactionData - Interaction information
   * @returns {Promise<Object>} - New interaction object
   */
  async create(tenantId, interactionData) {
    const {
      lead_id,
      contact_id,
      channel,
      direction = 'out',
      subject,
      body,
      meta,
      occurred_at,
      created_by
    } = interactionData;

    const query = `
      INSERT INTO interactions (
        id, tenant_id, lead_id, contact_id, channel, direction, 
        subject, body, meta, occurred_at, created_by
      )
      VALUES (
        gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10
      )
      RETURNING *
    `;

    const values = [
      tenantId,
      lead_id,
      contact_id,
      channel,
      direction,
      subject,
      body,
      meta,
      occurred_at,
      created_by
    ];

    const { rows } = await db.query(query, values);
    return rows[0];
  },

  /**
   * Get interaction by ID with details
   * @param {string} interactionId - Interaction UUID
   * @param {string} tenantId - Tenant UUID
   * @returns {Promise<Object>} - Interaction object with related data
   */
  async findByIdWithDetails(interactionId, tenantId) {
    const query = `
      SELECT 
        i.*,
        l.title as lead_title,
        c.first_name || ' ' || c.last_name as contact_name,
        c.email as contact_email,
        tu.name as creator_name,
        tu.email as creator_email
      FROM interactions i
      LEFT JOIN leads l ON i.lead_id = l.id
      LEFT JOIN contacts c ON i.contact_id = c.id
      LEFT JOIN team_users tu ON i.created_by = tu.id
      WHERE i.id = $1 AND i.tenant_id = $2
    `;

    const { rows } = await db.query(query, [interactionId, tenantId]);
    return rows[0] || null;
  },

  /**
   * Get interactions for a specific lead/contact (timeline view)
   * @param {string} tenantId - Tenant UUID
   * @param {string} leadId - Lead UUID (optional)
   * @param {string} contactId - Contact UUID (optional)
   * @returns {Promise<Array>} - Array of interactions
   */
  async getTimeline(tenantId, leadId = null, contactId = null) {
    let whereConditions = ['i.tenant_id = $1'];
    let queryParams = [tenantId];
    let paramIndex = 2;

    if (leadId) {
      whereConditions.push(`i.lead_id = $${paramIndex++}`);
      queryParams.push(leadId);
    }
    if (contactId) {
      whereConditions.push(`i.contact_id = $${paramIndex++}`);
      queryParams.push(contactId);
    }

    const whereClause = whereConditions.join(' AND ');

    const query = `
      SELECT 
        i.*,
        tu.name as creator_name,
        tu.email as creator_email
      FROM interactions i
      LEFT JOIN team_users tu ON i.created_by = tu.id
      WHERE ${whereClause}
      ORDER BY i.occurred_at DESC
      LIMIT 50
    `;

    const { rows } = await db.query(query, queryParams);
    return rows;
  },

  /**
   * Get interaction statistics
   * @param {string} tenantId - Tenant UUID
   * @param {Object} filters - Filter options
   * @returns {Promise<Array>} - Interaction stats
   */
  async getInteractionStats(tenantId, filters = {}) {
    let whereConditions = ['tenant_id = $1'];
    let queryParams = [tenantId];
    let paramIndex = 2;

    // Add date filters if provided
    if (filters.date_from) {
      whereConditions.push(`DATE(occurred_at) >= $${paramIndex++}`);
      queryParams.push(filters.date_from);
    }
    if (filters.date_to) {
      whereConditions.push(`DATE(occurred_at) <= $${paramIndex++}`);
      queryParams.push(filters.date_to);
    }

    const whereClause = whereConditions.join(' AND ');

    const query = `
      SELECT 
        channel,
        direction,
        COUNT(*) as count,
        COUNT(*) FILTER (WHERE occurred_at >= CURRENT_DATE - INTERVAL '7 days') as recent_count
      FROM interactions
      WHERE ${whereClause}
      GROUP BY channel, direction
      ORDER BY count DESC
    `;
    
    const { rows } = await db.query(query, queryParams);
    return rows;
  }
};

export default InteractionModel;