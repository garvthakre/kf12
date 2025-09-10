import { sendError, sendSuccess } from '../utils/response.js';
import LeadModel from '../models/Lead.js';
import ContactModel from '../models/Contact.js';
import TagModel from '../models/Tag.js';
import UserModel from '../models/User.js';
import db from '../config/db.js';

export const leadsController = {
  /**
   * Get leads with filters
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getLeads(req, res) {
    try {
      const filters = req.query;
      const { leads, totalCount } = await LeadModel.getLeadsWithFilters(req.user.tenant_id, filters);
      
      const page = parseInt(filters.page || 1);
      const limit = parseInt(filters.limit || 20);

      sendSuccess(res, 200, {
        leads,
        pagination: {
          page,
          limit,
          total: totalCount,
          pages: Math.ceil(totalCount / limit)
        }
      });

    } catch (error) {
      console.error('Get leads error:', error);
      sendError(res, 500, 'Failed to fetch leads');
    }
  },

  /**
   * Create new lead
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async createLead(req, res) {
    const client = await db.pool.connect();
    
    try {
      await client.query('BEGIN');
      await client.query('SET LOCAL app.tenant_id = $1', [req.user.tenant_id]);

      const { contact, ...leadData } = req.body;
      let contactId = null;

      // Handle contact creation/finding
      if (contact) {
        if (contact.email || contact.phone) {
          // Check if contact exists
          const existingContact = await ContactModel.findByEmailOrPhone(
            req.user.tenant_id, 
            contact.email, 
            contact.phone
          );

          if (existingContact) {
            contactId = existingContact.id;
          } else {
            // Create new contact
            const newContact = await ContactModel.create(req.user.tenant_id, {
              ...contact,
              source: leadData.source || 'manual'
            });
            contactId = newContact.id;
          }
        }
      }

      // Create lead
      const lead = await LeadModel.create(req.user.tenant_id, {
        ...leadData,
        contact_id: contactId,
        owner_user_id: req.user.id // Default owner to current user
      });

      await client.query('COMMIT');

      // Fetch complete lead data
      const completeLead = await LeadModel.getCompleteLeadData(lead.id);

      sendSuccess(res, 201, completeLead, 'Lead created successfully');

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Create lead error:', error);
      sendError(res, 500, 'Failed to create lead');
    } finally {
      client.release();
    }
  },

  /**
   * Get lead details
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getLeadById(req, res) {
    try {
      const { id } = req.params;
      const lead = await LeadModel.findByIdWithDetails(id, req.user.tenant_id);

      if (!lead) {
        return sendError(res, 404, 'Lead not found');
      }

      sendSuccess(res, 200, lead);

    } catch (error) {
      console.error('Get lead error:', error);
      sendError(res, 500, 'Failed to fetch lead');
    }
  },

  /**
   * Update lead
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async updateLead(req, res) {
    try {
      const { id } = req.params;
      const updates = req.body;

      // Check if lead exists
      const leadExists = await LeadModel.exists(id, req.user.tenant_id);
      if (!leadExists) {
        return sendError(res, 404, 'Lead not found');
      }

      // Validate owner exists if provided
      if (updates.owner_user_id) {
        const ownerValid = await UserModel.validateUser(updates.owner_user_id, req.user.tenant_id);
        if (!ownerValid) {
          return sendError(res, 422, 'Invalid owner user ID');
        }
      }

      const updatedLead = await LeadModel.update(id, req.user.tenant_id, updates);

      sendSuccess(res, 200, updatedLead, 'Lead updated successfully');

    } catch (error) {
      console.error('Update lead error:', error);
      sendError(res, 500, 'Failed to update lead');
    }
  },

  /**
   * Add tags to lead
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async addTagsToLead(req, res) {
    const client = await db.pool.connect();

    try {
      await client.query('BEGIN');
      await client.query('SET LOCAL app.tenant_id = $1', [req.user.tenant_id]);

      const { id } = req.params;
      const { tags } = req.body;

      // Check if lead exists
      const leadExists = await LeadModel.exists(id, req.user.tenant_id);
      if (!leadExists) {
        return sendError(res, 404, 'Lead not found');
      }

      const addedTags = [];

      for (const tagName of tags) {
        // Create tag if doesn't exist
        const tag = await TagModel.createOrGet(req.user.tenant_id, tagName);
        
        // Link tag to lead
        await TagModel.linkToLead(id, tag.id);
        addedTags.push(tag);
      }

      await client.query('COMMIT');

      sendSuccess(res, 200, { tags: addedTags }, 'Tags added successfully');

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Add tags error:', error);
      sendError(res, 500, 'Failed to add tags');
    } finally {
      client.release();
    }
  },

  /**
   * Remove tag from lead
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async removeTagFromLead(req, res) {
    try {
      const { id, tagName } = req.params;

      const removed = await TagModel.removeFromLead(id, tagName, req.user.tenant_id);

      if (!removed) {
        return sendError(res, 404, 'Tag not found on this lead');
      }

      sendSuccess(res, 200, { removed: tagName }, 'Tag removed successfully');

    } catch (error) {
      console.error('Remove tag error:', error);
      sendError(res, 500, 'Failed to remove tag');
    }
  },

  /**
   * Delete lead
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async deleteLead(req, res) {
    try {
      const { id } = req.params;

      const deleted = await LeadModel.delete(id, req.user.tenant_id);

      if (!deleted) {
        return sendError(res, 404, 'Lead not found');
      }

      sendSuccess(res, 200, { deleted: true }, 'Lead deleted successfully');

    } catch (error) {
      console.error('Delete lead error:', error);
      sendError(res, 500, 'Failed to delete lead');
    }
  },

  /**
   * Get lead statistics
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getLeadStats(req, res) {
    try {
      const stats = await LeadModel.getLeadStats(req.user.tenant_id);
      sendSuccess(res, 200, { stats });

    } catch (error) {
      console.error('Get lead stats error:', error);
      sendError(res, 500, 'Failed to fetch lead statistics');
    }
  },

  /**
   * Get leaderboard
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getLeaderboard(req, res) {
    try {
      const limit = parseInt(req.query.limit) || 10;
      const leaderboard = await LeadModel.getLeaderboard(req.user.tenant_id, limit);
      sendSuccess(res, 200, { leaderboard });

    } catch (error) {
      console.error('Get leaderboard error:', error);
      sendError(res, 500, 'Failed to fetch leaderboard');
    }
  }
};