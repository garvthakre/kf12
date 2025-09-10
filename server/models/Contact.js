import db from '../config/db.js';

/**
 * Contact Model
 * Handles database operations for the contacts table
 */
const ContactModel = {
  /**
   * Find existing contact by email or phone
   * @param {string} tenantId - Tenant UUID
   * @param {string} email - Contact email
   * @param {string} phone - Contact phone
   * @returns {Promise<Object>} - Contact object
   */
  async findByEmailOrPhone(tenantId, email, phone) {
    const query = `
      SELECT c.*, comp.name as company_name 
      FROM contacts c
      LEFT JOIN companies comp ON c.company_id = comp.id
      WHERE c.tenant_id = $1 AND (c.email = $2 OR c.phone = $3)
      LIMIT 1
    `;
    const { rows } = await db.query(query, [tenantId, email || null, phone || null]);
    return rows[0] || null;
  },

  /**
   * Create new contact
   * @param {string} tenantId - Tenant UUID
   * @param {Object} contactData - Contact information
   * @returns {Promise<Object>} - New contact object
   */
  async create(tenantId, contactData) {
    const { 
      first_name, 
      last_name, 
      email, 
      phone, 
      dob,
      company_id, 
      kf_visitor_id,
      source 
    } = contactData;
    
    const query = `
      INSERT INTO contacts (id, tenant_id, first_name, last_name, email, phone, dob, company_id, kf_visitor_id, source)
      VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `;
    
    const values = [
      tenantId,
      first_name || null,
      last_name || null,
      email || null,
      phone || null,
      dob || null,
      company_id || null,
      kf_visitor_id || null,
      source || 'manual'
    ];
    
    const { rows } = await db.query(query, values);
    return rows[0];
  },

  /**
   * Find contact by ID
   * @param {string} contactId - Contact UUID
   * @param {string} tenantId - Tenant UUID
   * @returns {Promise<Object>} - Contact object with company info
   */
  async findById(contactId, tenantId) {
    const query = `
      SELECT c.*, comp.name as company_name, comp.website as company_website
      FROM contacts c
      LEFT JOIN companies comp ON c.company_id = comp.id
      WHERE c.id = $1 AND c.tenant_id = $2
    `;
    const { rows } = await db.query(query, [contactId, tenantId]);
    return rows[0] || null;
  },

  /**
   * Get all contacts with pagination and filters
   * @param {string} tenantId - Tenant UUID
   * @param {number} limit - Number of results per page
   * @param {number} offset - Pagination offset
   * @param {Object} filters - Filter options
   * @returns {Promise<Array>} - Array of contacts
   */
  async findAll(tenantId, limit = 20, offset = 0, filters = {}) {
    let query = `
      SELECT 
        c.*,
        comp.name as company_name,
        comp.website as company_website,
        COUNT(l.id) as lead_count
      FROM contacts c
      LEFT JOIN companies comp ON c.company_id = comp.id
      LEFT JOIN leads l ON c.id = l.contact_id
      WHERE c.tenant_id = $1
    `;
    
    const queryParams = [tenantId];
    let paramIndex = 2;

    // Add source filter
    if (filters.source) {
      query += ` AND c.source = $${paramIndex}`;
      queryParams.push(filters.source);
      paramIndex++;
    }

    // Add company filter
    if (filters.company_id) {
      query += ` AND c.company_id = $${paramIndex}`;
      queryParams.push(filters.company_id);
      paramIndex++;
    }

    // Add search filter
    if (filters.search) {
      query += ` AND (
        c.first_name ILIKE $${paramIndex} OR
        c.last_name ILIKE $${paramIndex} OR
        c.email ILIKE $${paramIndex} OR
        c.phone ILIKE $${paramIndex} OR
        comp.name ILIKE $${paramIndex}
      )`;
      queryParams.push(`%${filters.search}%`);
      paramIndex++;
    }

    query += ' GROUP BY c.id, comp.id';

    // Add sorting
    if (filters.sort_by) {
      const sortField = filters.sort_by.replace(/[^a-zA-Z0-9_.]/g, '');
      const sortOrder = filters.sort_order?.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';
      query += ` ORDER BY ${sortField} ${sortOrder}`;
    } else {
      query += ' ORDER BY c.created_at DESC';
    }

    // Add pagination
    query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    queryParams.push(limit, offset);

    const { rows } = await db.query(query, queryParams);
    return rows;
  },

  /**
   * Update contact information
   * @param {string} contactId - Contact UUID
   * @param {string} tenantId - Tenant UUID
   * @param {Object} contactData - Contact data to update
   * @returns {Promise<Object>} - Updated contact object
   */
  async update(contactId, tenantId, contactData) {
    const {
      first_name,
      last_name,
      email,
      phone,
      dob,
      company_id
    } = contactData;

    const query = `
      UPDATE contacts
      SET 
        first_name = COALESCE($1, first_name),
        last_name = COALESCE($2, last_name),
        email = COALESCE($3, email),
        phone = COALESCE($4, phone),
        dob = COALESCE($5, dob),
        company_id = COALESCE($6, company_id),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $7 AND tenant_id = $8
      RETURNING *
    `;

    const values = [
      first_name,
      last_name,
      email,
      phone,
      dob,
      company_id,
      contactId,
      tenantId
    ];

    const { rows } = await db.query(query, values);
    return rows[0];
  },

  /**
   * Delete a contact
   * @param {string} contactId - Contact UUID
   * @param {string} tenantId - Tenant UUID
   * @returns {Promise<boolean>} - Success status
   */
  async delete(contactId, tenantId) {
    const query = 'DELETE FROM contacts WHERE id = $1 AND tenant_id = $2';
    const { rowCount } = await db.query(query, [contactId, tenantId]);
    return rowCount > 0;
  },

  /**
   * Count total contacts
   * @param {string} tenantId - Tenant UUID
   * @param {Object} filters - Filter options
   * @returns {Promise<number>} - Total contact count
   */
  async countTotal(tenantId, filters = {}) {
    let query = 'SELECT COUNT(*) FROM contacts c LEFT JOIN companies comp ON c.company_id = comp.id WHERE c.tenant_id = $1';
    const queryParams = [tenantId];
    let paramIndex = 2;

    // Add source filter
    if (filters.source) {
      query += ` AND c.source = $${paramIndex}`;
      queryParams.push(filters.source);
      paramIndex++;
    }

    // Add company filter
    if (filters.company_id) {
      query += ` AND c.company_id = $${paramIndex}`;
      queryParams.push(filters.company_id);
      paramIndex++;
    }

    // Add search filter
    if (filters.search) {
      query += ` AND (
        c.first_name ILIKE $${paramIndex} OR
        c.last_name ILIKE $${paramIndex} OR
        c.email ILIKE $${paramIndex} OR
        c.phone ILIKE $${paramIndex} OR
        comp.name ILIKE $${paramIndex}
      )`;
      queryParams.push(`%${filters.search}%`);
    }

    const { rows } = await db.query(query, queryParams);
    return parseInt(rows[0].count);
  },

  /**
   * Get contact statistics by source
   * @param {string} tenantId - Tenant UUID
   * @returns {Promise<Array>} - Contact stats by source
   */
  async getContactStats(tenantId) {
    const query = `
      SELECT 
        source,
        COUNT(*) as count,
        COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '30 days') as recent_count
      FROM contacts
      WHERE tenant_id = $1
      GROUP BY source
      ORDER BY count DESC
    `;
    
    const { rows } = await db.query(query, [tenantId]);
    return rows;
  }
};

export default ContactModel