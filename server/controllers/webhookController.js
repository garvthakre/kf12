import { sendError, sendSuccess } from '../utils/response.js';
import ContactModel from '../models/Contact.js';
import LeadModel from '../models/Lead.js';
import db from '../config/db.js';
import format from "pg-format";

export const webhookController = {
  /**
   * Handle lead captured from FairEx
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async handleLeadCaptured(req, res) {
    const client = await db.pool.connect();
    
    try {
      await client.query('BEGIN');
      
      const { 
        tenant_id, 
        visitor, 
        exhibition_id, 
        join_id, 
        scan_time, 
        context 
      } = req.body;

      // Validate tenant exists
      const tenantQuery = 'SELECT id FROM tenants WHERE id = $1';
      const { rows: tenantRows } = await client.query(tenantQuery, [tenant_id]);
      
      if (tenantRows.length === 0) {
        return sendError(res, 422, 'Invalid tenant ID');
      }

      // Set tenant context for RLS
      const setTenantSQL = format("SET LOCAL app.tenant_id = %L", tenant_id);
      await client.query(setTenantSQL);

      let contactId = null;

      // Check if contact exists based on visitor data
      if (visitor && (visitor.email || visitor.phone)) {
        const existingContact = await ContactModel.findByEmailOrPhone(
          tenant_id, 
          visitor.email, 
          visitor.phone
        );

        if (existingContact) {
          contactId = existingContact.id;
          
          // Update contact with visitor data if needed
          const updateData = {};
          if (visitor.first_name && !existingContact.first_name) {
            updateData.first_name = visitor.first_name;
          }
          if (visitor.last_name && !existingContact.last_name) {
            updateData.last_name = visitor.last_name;
          }
          if (visitor.kf_visitor_id) {
            updateData.kf_visitor_id = visitor.kf_visitor_id;
          }

          if (Object.keys(updateData).length > 0) {
            await ContactModel.update(contactId, tenant_id, updateData);
          }
        } else {
          // Create new contact
          const newContact = await ContactModel.create(tenant_id, {
            first_name: visitor.first_name,
            last_name: visitor.last_name,
            email: visitor.email,
            phone: visitor.phone,
            dob: visitor.dob,
            kf_visitor_id: visitor.kf_visitor_id,
            source: 'fairex'
          });
          contactId = newContact.id;
        }
      }

      // Create lead
      const leadData = {
        contact_id: contactId,
        title: `FairEx Lead - ${visitor?.first_name || 'Visitor'} ${visitor?.last_name || ''}`.trim(),
        status: 'new',
        stage: 'lead',
        score: 0,
        source: 'fairex',
        exhibition_id: exhibition_id,
        join_id: join_id,
        notes: context?.notes || `Lead captured from FairEx exhibition at ${scan_time}`
      };

      const lead = await LeadModel.create(tenant_id, leadData);

      // Log activity
      const activityQuery = `
        INSERT INTO activity_log (id, tenant_id, entity, entity_id, action, after_data, occurred_at)
        VALUES (gen_random_uuid(), $1, 'lead', $2, 'created_via_webhook', $3, $4)
      `;
      
      await client.query(activityQuery, [
        tenant_id,
        lead.id,
        JSON.stringify({ source: 'fairex_webhook', exhibition_id, join_id, context }),
        scan_time || new Date()
      ]);

      await client.query('COMMIT');

      sendSuccess(res, 200, {
        lead_id: lead.id,
        contact_id: contactId,
        message: 'Lead captured successfully'
      }, 'Webhook processed successfully');

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Webhook error:', error);
      
      // Check for signature validation error
      if (error.message?.includes('signature')) {
        return sendError(res, 401, 'Invalid signature');
      }
      
      sendError(res, 500, 'Webhook processing failed');
    } finally {
      client.release();
    }
  }

  
};