import React, { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { fetchUserProfile, updateUserProfile } from '../api';
import './ProfilePage.css';

const TIME_ZONE_OPTIONS = [
  'America/Los_Angeles',
  'America/Denver',
  'America/Chicago',
  'America/New_York',
  'Europe/London',
  'Europe/Berlin',
  'Asia/Kolkata',
  'Asia/Tokyo',
  'Australia/Sydney'
];

const getStoredPreferences = () => {
  try {
    return JSON.parse(localStorage.getItem('sn_profile_prefs') || '{}');
  } catch {
    return {};
  }
};

const getValue = (value) => {
  if (value === null || value === undefined) return '';
  if (typeof value === 'object') {
    return value.display_value || value.name || value.label || value.value || '';
  }
  return String(value);
};

const buildInitialForm = (user) => {
  const prefs = getStoredPreferences();

  return {
    fullName: user?.user_display_name || user?.name || '',
    company: '',
    title: user?.title || '',
    department: user?.department || '',
    location: user?.location || '',
    bio: prefs.bio || '',
    email: user?.email || '',
    businessPhone: user?.phone || '',
    mobilePhone: user?.mobile_phone || '',
    timeZone: prefs.timeZone || 'America/Los_Angeles',
    accessibilityEnabled: prefs.accessibilityEnabled ?? false,
    enableAnalytics: prefs.enableAnalytics ?? true,
    photo: user?.photo || ''
  };
};

const ProfilePage = ({ user, onBack, onProfileUpdated }) => {
  const [formData, setFormData] = useState(() => buildInitialForm(user));
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState('');
  const [supportsBioSync, setSupportsBioSync] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const loadProfile = async () => {
      setIsLoading(true);
      try {
        const result = await fetchUserProfile(user?.user_sys_id);
        if (!isMounted) return;

        setSupportsBioSync(Object.prototype.hasOwnProperty.call(result || {}, 'bio'));

        setFormData((prev) => ({
          ...prev,
          fullName: getValue(result?.name) || prev.fullName,
          company: getValue(result?.company) || prev.company,
          title: getValue(result?.title) || prev.title,
          department: getValue(result?.department) || prev.department,
          location: getValue(result?.location) || prev.location,
          bio: getValue(result?.bio) || prev.bio,
          email: getValue(result?.email) || prev.email,
          businessPhone: getValue(result?.phone) || prev.businessPhone,
          mobilePhone: getValue(result?.mobile_phone) || prev.mobilePhone,
          timeZone: getValue(result?.time_zone) || prev.timeZone,
          photo: getValue(result?.photo) || prev.photo
        }));
      } catch (error) {
        toast.error('Could not load profile details.');
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    if (user?.user_sys_id) {
      loadProfile();
    } else {
      setIsLoading(false);
    }

    return () => {
      isMounted = false;
    };
  }, [user]);

  useEffect(() => () => {
    if (avatarPreview.startsWith('blob:')) {
      URL.revokeObjectURL(avatarPreview);
    }
  }, [avatarPreview]);

  const avatarSrc = useMemo(() => {
    if (avatarPreview) return avatarPreview;
    if (formData.photo) return formData.photo;

    return `https://ui-avatars.com/api/?name=${encodeURIComponent(formData.fullName || user?.user_name || 'User')}&background=random&size=128`;
  }, [avatarPreview, formData.fullName, formData.photo, user?.user_name]);

  const handleChange = (field) => (event) => {
    const { type, checked, value } = event.target;
    setFormData((prev) => ({
      ...prev,
      [field]: type === 'checkbox' ? checked : value
    }));
  };

  const handlePhotoChange = (event) => {
    const nextFile = event.target.files?.[0];
    if (!nextFile) return;

    if (avatarPreview.startsWith('blob:')) {
      URL.revokeObjectURL(avatarPreview);
    }

    setAvatarPreview(URL.createObjectURL(nextFile));
  };

  const handleSave = async (event) => {
    event.preventDefault();
    setIsSaving(true);

    try {
      const preferences = {
        accessibilityEnabled: formData.accessibilityEnabled,
        enableAnalytics: formData.enableAnalytics,
        timeZone: formData.timeZone,
        bio: formData.bio
      };
      localStorage.setItem('sn_profile_prefs', JSON.stringify(preferences));

      const updatedProfile = await updateUserProfile(user.user_sys_id, {
        name: formData.fullName,
        company: formData.company,
        title: formData.title,
        department: formData.department,
        location: formData.location,
        email: formData.email,
        phone: formData.businessPhone,
        mobile_phone: formData.mobilePhone,
        time_zone: formData.timeZone,
        ...(supportsBioSync ? { bio: formData.bio } : {})
      });

      onProfileUpdated?.({
        ...user,
        name: getValue(updatedProfile?.name) || formData.fullName,
        user_display_name: getValue(updatedProfile?.name) || formData.fullName,
        email: getValue(updatedProfile?.email) || formData.email,
        phone: getValue(updatedProfile?.phone) || formData.businessPhone,
        mobile_phone: getValue(updatedProfile?.mobile_phone) || formData.mobilePhone,
        title: getValue(updatedProfile?.title) || formData.title,
        department: getValue(updatedProfile?.department) || formData.department,
        location: getValue(updatedProfile?.location) || formData.location,
        company: getValue(updatedProfile?.company) || formData.company
      });

      toast.success('Profile updated in ServiceNow.');
    } catch (error) {
      console.error(error);
      toast.error('Failed to update the sys_user record.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="profile-page">
        <div className="profile-card profile-loading-card">Loading profile details...</div>
      </div>
    );
  }

  return (
    <div className="profile-page">
      <div className="profile-page-topbar">
        <div>
          <h2>My Profile</h2>
          <p>Update your ServiceNow `sys_user` details and preferences.</p>
        </div>
        <button type="button" className="btn btn-default" onClick={onBack}>
          ← Back to Dashboard
        </button>
      </div>

      <form className="profile-form-layout" onSubmit={handleSave}>
        <section className="profile-card profile-hero-card">
          <div className="profile-avatar-section">
            <div className="profile-avatar-large">
              <img src={avatarSrc} alt={formData.fullName || 'Profile'} />
            </div>

            <label className="profile-upload-button">
              Upload Picture
              <input type="file" accept="image/*" onChange={handlePhotoChange} hidden />
            </label>
            <span className="profile-upload-hint">Image preview updates instantly</span>
          </div>

          <div className="profile-summary-section">
            <div className="profile-inline-field profile-name-field">
              <label>Full name</label>
              <input type="text" value={formData.fullName} onChange={handleChange('fullName')} />
            </div>

            <div className="profile-summary-grid">
              <div className="profile-inline-field">
                <label>Company</label>
                <input type="text" value={formData.company} onChange={handleChange('company')} placeholder="Company" />
              </div>
              <div className="profile-inline-field">
                <label>Title</label>
                <input type="text" value={formData.title} onChange={handleChange('title')} placeholder="System Administrator" />
              </div>
              <div className="profile-inline-field">
                <label>Department</label>
                <input type="text" value={formData.department} onChange={handleChange('department')} placeholder="Finance" />
              </div>
              <div className="profile-inline-field">
                <label>Location</label>
                <input type="text" value={formData.location} onChange={handleChange('location')} placeholder="India" />
              </div>
              <div className="profile-inline-field profile-field-wide">
                <label>Bio</label>
                <textarea value={formData.bio} onChange={handleChange('bio')} rows="3" placeholder="Tell us about yourself" />
              </div>
            </div>
          </div>
        </section>

        <section className="profile-card">
          <div className="profile-card-header">
            <h3>ℹ️ About</h3>
          </div>
          <div className="profile-details-grid">
            <div className="profile-form-field">
              <label>Email</label>
              <input type="email" value={formData.email} onChange={handleChange('email')} placeholder="admin@example.com" />
            </div>
            <div className="profile-form-field">
              <label>Business phone</label>
              <input type="text" value={formData.businessPhone} onChange={handleChange('businessPhone')} placeholder="Business phone" />
            </div>
            <div className="profile-form-field">
              <label>Mobile phone</label>
              <input type="text" value={formData.mobilePhone} onChange={handleChange('mobilePhone')} placeholder="Mobile phone" />
            </div>
          </div>
        </section>

        <section className="profile-card">
          <div className="profile-card-header">
            <h3>⚙️ User preferences</h3>
          </div>
          <div className="profile-preferences-grid">
            <label className="profile-toggle-row">
              <span>
                <strong>Accessibility enabled</strong>
                <small>Improve visibility and readable controls</small>
              </span>
              <span className="profile-toggle-switch">
                <input type="checkbox" checked={formData.accessibilityEnabled} onChange={handleChange('accessibilityEnabled')} />
                <span className="profile-toggle-slider" />
              </span>
            </label>

            <label className="profile-toggle-row">
              <span>
                <strong>Enable Analytics</strong>
                <small>Allow usage insights for this dashboard</small>
              </span>
              <span className="profile-toggle-switch">
                <input type="checkbox" checked={formData.enableAnalytics} onChange={handleChange('enableAnalytics')} />
                <span className="profile-toggle-slider" />
              </span>
            </label>

            <div className="profile-form-field profile-field-wide">
              <label>Time zone</label>
              <select value={formData.timeZone} onChange={handleChange('timeZone')}>
                {TIME_ZONE_OPTIONS.map((timeZone) => (
                  <option key={timeZone} value={timeZone}>{timeZone}</option>
                ))}
              </select>
            </div>

            <div className="profile-links-row">
              <a href="https://www.servicenow.com/privacy-statement.html" target="_blank" rel="noreferrer">Privacy Policy ↗</a>
              <a href="https://www.servicenow.com/products/identity.html" target="_blank" rel="noreferrer">View Identity Center ↗</a>
            </div>
          </div>
        </section>

        <div className="profile-actions-bar">
          <button type="button" className="btn btn-default" onClick={onBack} disabled={isSaving}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save Profile'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ProfilePage;
