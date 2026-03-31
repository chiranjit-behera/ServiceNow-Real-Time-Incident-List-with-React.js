import axios from "axios";

const API_BASE = "/api/1140272/real_time_incident_list/incident";

const getAxiosConfig = () => {
    const token = sessionStorage.getItem('sn_auth_token');
    if (!token) throw new Error('Unauthenticated');
    return {
        headers: {
            'Authorization': `Basic ${token}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        }
    };
};

export const loginUser = async (username, password) => {
    try {
        const token = btoa(`${username}:${password}`);
        const res = await axios.get('/api/now/ui/user/current_user', {
            headers: {
                'Authorization': `Basic ${token}`,
                'Accept': 'application/json'
            }
        });
        
        sessionStorage.setItem('sn_auth_token', token);
        sessionStorage.setItem('sn_user', JSON.stringify(res.data.result));
        
        return res.data.result;
    } catch (error) {
        throw new Error('Invalid credentials');
    }
};

export const logoutUser = () => {
    sessionStorage.removeItem('sn_auth_token');
    sessionStorage.removeItem('sn_user');
};

export const fetchIncidents = async ({ filter, search, limit, offset }) => {
    try {
        const config = getAxiosConfig();
        const res = await axios.get(API_BASE, {
            ...config,
            params: {
                filter: filter || "active=true",
                search: search || "",
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
    } catch (error) {
        console.error("Error fetching from ServiceNow:", error);
        throw error;
    }
};

export const updateIncidentState = async ({ sys_id, action, filter, search, limit, offset }) => {  
    try {
        const config = getAxiosConfig();
        const res = await axios.post(`${API_BASE}/action`, {
            sys_id: sys_id,
            action: action
        }, config);

        const freshData = await fetchIncidents({ filter, search, limit, offset });
        return {
            data: {
                incidents: freshData.data.incidents,
                total: freshData.data.total,
                message: res.data?.result?.message || `Incident ${action === 'approve' ? 'approved' : 'rejected'} successfully.`
            }
        };
    } catch (error) {
        console.error("Error updating incident state:", error);
        throw error;
    }
};

export const createIncident = async (data) => {
    try {
        const config = getAxiosConfig();
        const res = await axios.post('/api/now/table/incident', data, config);
        return res.data;
    } catch (error) {
        console.error("Error creating incident:", error);
        throw error;
    }
};


export const uploadAttachment = async (file, recordSysId) => {
    try {
        const config = getAxiosConfig();

        const formData = new FormData();
        formData.append('file', file);

        const res = await axios.post(
            `/api/now/attachment/file?table_name=incident&table_sys_id=${recordSysId}&file_name=${file.name}`,
            formData,
            {
                ...config,
                headers: {
                    ...config.headers,
                    'Content-Type': 'multipart/form-data'
                }
            }
        );

        return res.data;

    } catch (error) {
        console.error("Error uploading attachment:", error);
        throw error;
    }
};

export const getUserIncidents = async (userSysId) => {
  try {
    const config = getAxiosConfig();

    const res = await axios.get(
      `/api/now/table/incident?sysparm_query=caller_id=${userSysId}^ORDERBYDESCsys_created_on&sysparm_fields=number,short_description,sys_created_on&sysparm_limit=10`,
      config
    );

    return res.data.result;

  } catch (error) {
    console.error("Error fetching incidents:", error);
    throw error;
  }
};