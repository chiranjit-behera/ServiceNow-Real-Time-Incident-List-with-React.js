import React, { useState, memo, useMemo, useEffect } from 'react';
import toast from 'react-hot-toast';
import { createIncident, uploadAttachment } from '../api';
import './CreateIncident.css';

const formatFileSize = (size) => {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
};

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

  const previewFiles = useMemo(() => (
    files.map((file, index) => ({
      id: `${file.name}-${file.size}-${index}`,
      file,
      previewUrl: file.type.startsWith('image/') ? URL.createObjectURL(file) : null
    }))
  ), [files]);

  useEffect(() => () => {
    previewFiles.forEach((item) => {
      if (item.previewUrl) {
        URL.revokeObjectURL(item.previewUrl);
      }
    });
  }, [previewFiles]);

  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files || []);
    if (selectedFiles.length === 0) return;

    setFiles((prev) => [...prev, ...selectedFiles]);
    e.target.value = '';
  };

  const handleRemoveFile = (indexToRemove) => {
    setFiles((prev) => prev.filter((_, index) => index !== indexToRemove));
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
      window.dispatchEvent(new CustomEvent('sn-incidents-changed', {
        detail: { type: 'created', sysId: incidentSysId }
      }));
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
            <label htmlFor="incident-attachments">Attachments</label>
            <input
              id="incident-attachments"
              type="file"
              multiple
              onChange={handleFileChange}
              disabled={isSubmitting}
            />

            {previewFiles.length > 0 && (
              <div className="attachment-preview-list">
                {previewFiles.map((item, index) => (
                  <div key={item.id} className="attachment-preview-card">
                    <div className="attachment-preview-thumb">
                      {item.previewUrl ? (
                        <img src={item.previewUrl} alt={item.file.name} className="attachment-image" />
                      ) : (
                        <span className="attachment-file-icon">📎</span>
                      )}
                    </div>

                    <div className="attachment-preview-meta">
                      <span className="attachment-name" title={item.file.name}>{item.file.name}</span>
                      <span className="attachment-size">{formatFileSize(item.file.size)}</span>
                    </div>

                    <button
                      type="button"
                      className="attachment-remove-btn"
                      onClick={() => handleRemoveFile(index)}
                      disabled={isSubmitting}
                      aria-label={`Remove ${item.file.name}`}
                      title="Remove file"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
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