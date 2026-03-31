import React, { useState, memo } from 'react';
import toast from 'react-hot-toast';
import { createIncident, uploadAttachment } from '../api';
import './CreateIncident.css';

const CreateIncident = memo(({ onClose, onSuccess, user }) => {
  const [formData, setFormData] = useState({
    short_description: '',
    description: '',
    urgency: '3',
    caller_id: user.user_sys_id,
    contact_type: 'self-service'
  });

  const [files, setFiles] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleFileChange = (e) => {
    setFiles([...e.target.files]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.short_description) {
      toast.error('Short description is required');
      return;
    }

    setIsSubmitting(true);

    try {
      // Step 1: Create Incident
      const incidentRes = await createIncident(formData);
      const incidentSysId = incidentRes.result.sys_id;

      // Step 2: Upload Attachments
      if (files.length > 0) {
        await Promise.all(
          files.map((file) => uploadAttachment(file, incidentSysId))
        );
      }

      toast.success('Incident created successfully');
      onSuccess();
      onClose();

    } catch (error) {
      console.error(error);
      toast.error('Failed to create incident');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-content">
        <div className="modal-header">
          <h2>Create New Incident</h2>
          <button className="close-btn" onClick={onClose} disabled={isSubmitting}>
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit} className="create-form">

          {/* Short Description */}
          <div className="form-group">
            <label>Short Description *</label>
            <input
              type="text"
              value={formData.short_description}
              onChange={(e) =>
                setFormData({ ...formData, short_description: e.target.value })
              }
              placeholder="Brief summary of the issue"
              disabled={isSubmitting}
              autoFocus
            />
          </div>

          {/* Description */}
          <div className="form-group">
            <label>Description</label>
            <textarea
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              placeholder="Detailed explanation..."
              rows="4"
              disabled={isSubmitting}
            />
          </div>

          {/* Urgency */}
          <div className="form-group">
            <label>Urgency</label>
            <select
              value={formData.urgency}
              onChange={(e) =>
                setFormData({ ...formData, urgency: e.target.value })
              }
              disabled={isSubmitting}
            >
              <option value="1">1 - High</option>
              <option value="2">2 - Medium</option>
              <option value="3">3 - Low</option>
            </select>
          </div>

          {/* Attachments */}
          <div className="form-group">
            <label>Attachments</label>
            <input
              type="file"
              multiple
              onChange={handleFileChange}
              disabled={isSubmitting}
            />
          </div>

          {/* Actions */}
          <div className="modal-actions">
            <button
              type="button"
              className="btn btn-default"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Creating...' : 'Create Incident'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
});

export default CreateIncident;