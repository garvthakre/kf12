import { sendError, sendSuccess } from '../utils/response.js';
import ContactModel from '../models/Contact.js';
import CompanyModel from '../models/Company.js';

export const contactsController = {
  /**
   * Get contacts with filters
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getContacts(req, res) {
    try {
      const filters = req.query;
      const page = parseInt(filters.page || 1);
      const limit = parseInt(filters.limit || 20);
      const offset = (page - 1) * limit;

      const contacts = await ContactModel.findAll(req.user.tenant_id, limit, offset, filters);
      const totalCount = await ContactModel.countTotal(req.user.tenant_id, filters);

      sendSuccess(res, 200, {
        contacts,
        pagination: {
          page,
          limit,
          total: totalCount,
          pages: Math.ceil(totalCount / limit)
        }
      });

    } catch (error) {
      console.error('Get contacts error:', error);
      sendError(res, 400, 'Failed to fetch contacts');
    }
  },

  /**
   * Create new contact
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async createContact(req, res) {
    try {
      const contactData = req.body;

      // Validate company exists if provided
      if (contactData.company_id) {
        const companyExists = await CompanyModel.findById(contactData.company_id, req.user.tenant_id);
        if (!companyExists) {
          return sendError(res, 422, 'Invalid company ID', [
            { field: 'company_id', message: 'Company does not exist' }
          ]);
        }
      }

      // Check if contact with same email/phone exists
      if (contactData.email || contactData.phone) {
        const existing = await ContactModel.findByEmailOrPhone(
          req.user.tenant_id, 
          contactData.email, 
          contactData.phone
        );
        
        if (existing) {
          const conflictField = existing.email === contactData.email ? 'email' : 'phone';
          return sendError(res, 422, 'Contact with this email or phone already exists', [
            { field: conflictField, message: `Contact with this ${conflictField} already exists` }
          ]);
        }
      }

      const contact = await ContactModel.create(req.user.tenant_id, {
        ...contactData,
        source: contactData.source || 'manual'
      });

      // Get complete contact data with company info
      const completeContact = await ContactModel.findById(contact.id, req.user.tenant_id);

      sendSuccess(res, 201, completeContact, 'Contact created successfully');

    } catch (error) {
      console.error('Create contact error:', error);
      sendError(res, 422, 'Failed to create contact');
    }
  },

  /**
   * Get contact details
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getContactById(req, res) {
    try {
      const { id } = req.params;
      const contact = await ContactModel.findById(id, req.user.tenant_id);

      if (!contact) {
        return sendError(res, 404, 'Contact not found');
      }

      // Get contact with additional stats (lead count, etc.)
      const contactWithStats = {
        ...contact,
        stats: {
          lead_count: contact.lead_count || 0
        }
      };

      sendSuccess(res, 200, contactWithStats);

    } catch (error) {
      console.error('Get contact error:', error);
      sendError(res, 500, 'Failed to fetch contact');
    }
  },

  /**
   * Update contact
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async updateContact(req, res) {
    try {
      const { id } = req.params;
      const updates = req.body;

      // Check if contact exists
      const contactExists = await ContactModel.findById(id, req.user.tenant_id);
      if (!contactExists) {
        return sendError(res, 404, 'Contact not found');
      }

      // Validate company exists if provided
      if (updates.company_id && updates.company_id !== contactExists.company_id) {
        const companyExists = await CompanyModel.findById(updates.company_id, req.user.tenant_id);
        if (!companyExists) {
          return sendError(res, 422, 'Invalid company ID', [
            { field: 'company_id', message: 'Company does not exist' }
          ]);
        }
      }

      // Check for email/phone conflicts if being updated
      if (updates.email || updates.phone) {
        const existing = await ContactModel.findByEmailOrPhone(
          req.user.tenant_id, 
          updates.email || contactExists.email, 
          updates.phone || contactExists.phone
        );
        
        if (existing && existing.id !== id) {
          const conflictField = existing.email === updates.email ? 'email' : 'phone';
          return sendError(res, 422, 'Contact with this email or phone already exists', [
            { field: conflictField, message: `Contact with this ${conflictField} already exists` }
          ]);
        }
      }

      const updatedContact = await ContactModel.update(id, req.user.tenant_id, updates);

      sendSuccess(res, 200, updatedContact, 'Contact updated successfully');

    } catch (error) {
      console.error('Update contact error:', error);
      sendError(res, 422, 'Failed to update contact');
    }
  },

  /**
   * Delete contact
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async deleteContact(req, res) {
    try {
      const { id } = req.params;

      const deleted = await ContactModel.delete(id, req.user.tenant_id);

      if (!deleted) {
        return sendError(res, 404, 'Contact not found');
      }

      sendSuccess(res, 200, { deleted: true }, 'Contact deleted successfully');

    } catch (error) {
      console.error('Delete contact error:', error);
      sendError(res, 500, 'Failed to delete contact');
    }
  },

  /**
   * Get contact statistics
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getContactStats(req, res) {
    try {
      const stats = await ContactModel.getContactStats(req.user.tenant_id);
      sendSuccess(res, 200, { stats });

    } catch (error) {
      console.error('Get contact stats error:', error);
      sendError(res, 500, 'Failed to fetch contact statistics');
    }
  },

  /**
   * Search contacts
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async searchContacts(req, res) {
    try {
      const { q } = req.query;
      
      if (!q || q.trim().length < 2) {
        return sendError(res, 400, 'Search query must be at least 2 characters long');
      }

      const filters = {
        ...req.query,
        search: q.trim()
      };

      const page = parseInt(filters.page || 1);
      const limit = parseInt(filters.limit || 10);
      const offset = (page - 1) * limit;

      const contacts = await ContactModel.findAll(req.user.tenant_id, limit, offset, filters);
      const totalCount = await ContactModel.countTotal(req.user.tenant_id, filters);

      sendSuccess(res, 200, {
        contacts,
        search_query: q,
        pagination: {
          page,
          limit,
          total: totalCount,
          pages: Math.ceil(totalCount / limit)
        }
      });

    } catch (error) {
      console.error('Search contacts error:', error);
      sendError(res, 400, 'Failed to search contacts');
    }
  }
};