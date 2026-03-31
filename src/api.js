import axios from "axios";

const API_BASE = "/api/1140272/real_time_incident_list/incident";
const TOKEN_KEY = 'sn_auth_token';
const USER_KEY = 'sn_user';
const BACKUP_TOKEN_KEY = 'sn_auth_token_backup';
const BACKUP_USER_KEY = 'sn_user_backup';

let restorePromise = null;

const parseStoredUser = (value) => {
  try {
    return value ? JSON.parse(value) : null;
  } catch {
    return null;
  }
};

const emitSessionEvent = (name, detail = {}) => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(name, { detail }));
  }
};

const persistAuthSession = (token, user) => {
  sessionStorage.setItem(TOKEN_KEY, token);
  sessionStorage.setItem(USER_KEY, JSON.stringify(user));
  localStorage.setItem(BACKUP_TOKEN_KEY, token);
  localStorage.setItem(BACKUP_USER_KEY, JSON.stringify(user));
};

const getStoredToken = () => sessionStorage.getItem(TOKEN_KEY) || localStorage.getItem(BACKUP_TOKEN_KEY);

const buildAuthHeaders = (token, extraHeaders = {}) => ({
  'Authorization': `Basic ${token}`,
  'Accept': 'application/json',
  ...extraHeaders
});

const validateStoredToken = async (token) => {
  const res = await axios.get('/api/now/ui/user/current_user', {
    headers: buildAuthHeaders(token)
  });

  const user = res.data?.result || parseStoredUser(localStorage.getItem(BACKUP_USER_KEY));
  if (!user) {
    throw new Error('Unable to restore session');
  }

  persistAuthSession(token, user);
  return { token, user };
};

const isSessionError = (error) => error?.message === 'Unauthenticated' || [401, 403].includes(error?.response?.status);

const withSessionRecovery = async (requestFn) => {
  try {
    return await requestFn();
  } catch (error) {
    if (!isSessionError(error)) {
      throw error;
    }

    await restoreUserSession();
    return requestFn();
  }
};

export const restoreUserSession = async () => {
  if (restorePromise) return restorePromise;

  const token = getStoredToken();
  if (!token) {
    emitSessionEvent('sn-session-expired');
    throw new Error('Unauthenticated');
  }

  restorePromise = validateStoredToken(token)
    .then((result) => {
      emitSessionEvent('sn-session-restored', { user: result.user });
      return result;
    })
    .catch((error) => {
      logoutUser();
      emitSessionEvent('sn-session-expired');
      throw error;
    })
    .finally(() => {
      restorePromise = null;
    });

  return restorePromise;
};

const getAxiosConfig = async (extraHeaders = {}) => {
  let token = sessionStorage.getItem(TOKEN_KEY);

  if (!token) {
    const restored = await restoreUserSession();
    token = restored.token;
  }

  return {
    headers: buildAuthHeaders(token, {
      'Content-Type': 'application/json',
      ...extraHeaders
    })
  };
};

export const loginUser = async (username, password) => {
  try {
    const token = btoa(`${username}:${password}`);
    const res = await axios.get('/api/now/ui/user/current_user', {
      headers: buildAuthHeaders(token)
    });

    persistAuthSession(token, res.data.result);
    emitSessionEvent('sn-session-restored', { user: res.data.result });
    return res.data.result;
  } catch (error) {
    throw new Error('Invalid credentials');
  }
};

export const logoutUser = () => {
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(USER_KEY);
  localStorage.removeItem(BACKUP_TOKEN_KEY);
  localStorage.removeItem(BACKUP_USER_KEY);
  emitSessionEvent('sn-session-ended');
};

export const fetchIncidents = async ({ filter, search, limit, offset }) => {
  try {
    return await withSessionRecovery(async () => {
      const config = await getAxiosConfig();
      const res = await axios.get(API_BASE, {
        ...config,
        params: {
          filter: filter || 'active=true',
          search: search || '',
          limit: limit || 5,
          offset: offset || 0
        }
      });

      return {
        data: {
          incidents: res.data?.result?.incidents || [],
          total: res.data?.result?.total || 0,
          message: res.data?.result?.message
        }
      };
    });
  } catch (error) {
    console.error('Error fetching from ServiceNow:', error);
    throw error;
  }
};

export const updateIncidentState = async ({ sys_id, action, filter, search, limit, offset }) => {
  try {
    return await withSessionRecovery(async () => {
      const config = await getAxiosConfig();
      const res = await axios.post(`${API_BASE}/action`, {
        sys_id,
        action
      }, config);

      const freshData = await fetchIncidents({ filter, search, limit, offset });
      return {
        data: {
          incidents: freshData.data.incidents,
          total: freshData.data.total,
          message: res.data?.result?.message || `Incident ${action === 'approve' ? 'approved' : 'rejected'} successfully.`
        }
      };
    });
  } catch (error) {
    console.error('Error updating incident state:', error);
    throw error;
  }
};

export const fetchIncidentDetails = async (sysId) => {
  try {
    return await withSessionRecovery(async () => {
      const config = await getAxiosConfig();
      const res = await axios.get(`/api/now/table/incident/${sysId}`, {
        ...config,
        params: {
          sysparm_display_value: true,
          sysparm_fields: 'sys_id,number,short_description,description,state,priority,urgency,impact,active,caller_id,assigned_to,assignment_group,category,subcategory,sys_created_on,sys_updated_on,opened_at,close_notes,approval,u_approval_state'
        }
      });

      return res.data?.result || {};
    });
  } catch (error) {
    console.error('Error fetching incident details:', error);
    throw error;
  }
};

export const createIncident = async (data) => {
  try {
    return await withSessionRecovery(async () => {
      const config = await getAxiosConfig();
      const res = await axios.post('/api/now/table/incident', data, config);
      return res.data;
    });
  } catch (error) {
    console.error('Error creating incident:', error);
    throw error;
  }
};

export const uploadAttachment = async (file, recordSysId) => {
  try {
    return await withSessionRecovery(async () => {
      const config = await getAxiosConfig({ 'Content-Type': 'multipart/form-data' });
      const formData = new FormData();
      formData.append('file', file);

      const res = await axios.post(
        `/api/now/attachment/file?table_name=incident&table_sys_id=${recordSysId}&file_name=${file.name}`,
        formData,
        config
      );

      return res.data;
    });
  } catch (error) {
    console.error('Error uploading attachment:', error);
    throw error;
  }
};

export const getUserIncidents = async (userSysId) => {
  try {
    return await withSessionRecovery(async () => {
      const config = await getAxiosConfig();
      const res = await axios.get(
        `/api/now/table/incident?sysparm_query=caller_id=${userSysId}^ORDERBYDESCsys_created_on&sysparm_fields=number,short_description,sys_created_on&sysparm_limit=10`,
        config
      );

      return res.data.result;
    });
  } catch (error) {
    console.error('Error fetching incidents:', error);
    throw error;
  }
};