import { sendError, sendSuccess } from '../utils/response.js';
import CompanyModel from '../models/Company.js';

export const companiesController = {
  /**
   * Get companies with filters
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getCompanies(req, res) {
    try {
      const filters = req.query;
      const page = parseInt(filters.page || 1);
      const limit = parseInt(filters.limit || 20);
      const offset = (page - 1) * limit;

      const companies = await CompanyModel.findAll(req.user.tenant_id, limit, offset, filters);
      const totalCount = await CompanyModel.countTotal(req.user.tenant_id, filters);

      sendSuccess(res, 200, {
        companies,
        pagination: {
          page,
          limit,
          total: totalCount,
          pages: Math.ceil(totalCount / limit)
        }
      });

    } catch (error) {
      console.error('Get companies error:', error);
      sendError(res, 400, 'Failed to fetch companies');
    }
  },

  /**
   * Create new company
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async createCompany(req, res) {
    try {
      const companyData = req.body;

      // Check if company with same name exists
      const existing = await CompanyModel.findByName(req.user.tenant_id, companyData.name);
      if (existing) {
        return sendError(res, 422, 'Company with this name already exists', [
          { field: 'name', message: 'Company name must be unique' }
        ]);
      }

      const company = await CompanyModel.create(req.user.tenant_id, companyData);

      sendSuccess(res, 201, company, 'Company created successfully');

    } catch (error) {
      console.error('Create company error:', error);
      sendError(res, 422, 'Failed to create company');
    }
  },

  /**
   * Get company details
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getCompanyById(req, res) {
    try {
      const { id } = req.params;
      const company = await CompanyModel.findById(id, req.user.tenant_id);

      if (!company) {
        return sendError(res, 404, 'Company not found');
      }

      sendSuccess(res, 200, company);

    } catch (error) {
      console.error('Get company error:', error);
      sendError(res, 500, 'Failed to fetch company');
    }
  },

  /**
   * Update company
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async updateCompany(req, res) {
    try {
      const { id } = req.params;
      const updates = req.body;

      // Check if company exists
      const companyExists = await CompanyModel.findById(id, req.user.tenant_id);
      if (!companyExists) {
        return sendError(res, 404, 'Company not found');
      }

      // Check if name is being updated and if it conflicts
      if (updates.name && updates.name !== companyExists.name) {
        const existing = await CompanyModel.findByName(req.user.tenant_id, updates.name);
        if (existing && existing.id !== id) {
          return sendError(res, 422, 'Company with this name already exists', [
            { field: 'name', message: 'Company name must be unique' }
          ]);
        }
      }

      const updatedCompany = await CompanyModel.update(id, req.user.tenant_id, updates);

      sendSuccess(res, 200, updatedCompany, 'Company updated successfully');

    } catch (error) {
      console.error('Update company error:', error);
      sendError(res, 422, 'Failed to update company');
    }
  },

  /**
   * Delete company
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async deleteCompany(req, res) {
    try {
      const { id } = req.params;

      const deleted = await CompanyModel.delete(id, req.user.tenant_id);

      if (!deleted) {
        return sendError(res, 404, 'Company not found');
      }

      sendSuccess(res, 200, { deleted: true }, 'Company deleted successfully');

    } catch (error) {
      console.error('Delete company error:', error);
      sendError(res, 500, 'Failed to delete company');
    }
  },

  /**
   * Get company statistics
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getCompanyStats(req, res) {
    try {
      const stats = await CompanyModel.getCompanyStats(req.user.tenant_id);
      sendSuccess(res, 200, { stats });

    } catch (error) {
      console.error('Get company stats error:', error);
      sendError(res, 500, 'Failed to fetch company statistics');
    }
  }
};