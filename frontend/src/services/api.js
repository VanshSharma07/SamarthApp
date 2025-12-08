import axios from 'axios';

const API_URL = 'http://localhost:5000/api';

// Create axios instance
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add request interceptor to include auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor to handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Clear invalid token
      localStorage.removeItem('token');
      // Don't redirect if we're already on the login page
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// Add response interceptor for better error handling
api.interceptors.response.use(
  (response) => {
    // Some APIs return data in response.data.data format, handle that here
    if (response.data && response.data.data !== undefined) {
      return response;
    }
    return response;
  },
  (error) => {
    // Log specific details about API errors
    if (error.response) {
      console.error('API Error Response:', {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data
      });
      
      // Handle specific error codes
      if (error.response.status === 404) {
        console.warn('Resource not found. Please check your API endpoint.');
      }
    } else if (error.request) {
      console.error('API Request Error (No Response):', error.request);
    } else {
      console.error('API Error:', error.message);
    }
    
    return Promise.reject(error);
  }
);

// Auth API
export const auth = {
  register: async (userData) => {
    try {
      const response = await api.post('/auth/register', {
        email: userData.email,
        password: userData.password,
        firstName: userData.firstName,
        lastName: userData.lastName
      });

      return response.data;
    } catch (error) {
      if (error.response?.data) {
        throw error.response.data;
      }
      throw error;
    }
  },
  login: async (data) => {
    try {
      const response = await api.post('/auth/login', {
        email: data.email,
        password: data.password
      });
      console.log('Login API response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Login error:', error.response?.data || error.message);
      throw error;
    }
  },
  getCurrentUser: async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await api.get('/auth/me');
      
      if (!response.data || !response.data.success || !response.data.user) {
        throw new Error('Invalid response format from server');
      }

      return response.data.user;
    } catch (error) {
      console.error('Get current user error:', {
        status: error.response?.status,
        message: error.message,
        data: error.response?.data
      });
      
      if (error.response?.status === 401) {
        localStorage.removeItem('token');
      }
      
      throw error;
    }
  }
};

// Assessment API
export const assessment = {
  save: async (data) => {
    try {
      const response = await api.post('/assessments', data, {
        headers: {
          'Content-Type': 'application/json'
        }
      });
      return response;
    } catch (error) {
      console.error('API Error:', error.response?.data);
      throw error;
    }
  },
  getHistory: async (type = null) => {
    try {
      const params = type ? { type } : {};
      const response = await api.get('/assessments/history', { params });
      return response.data.data;
    } catch (error) {
      console.error('API Error:', error.response?.data || error.message);
      throw error;
    }
  },
  getBaseline: async (type) => {
    try {
      // Get current user ID to pass with request
      const userId = localStorage.getItem('userId');
      
      // Log for debugging
      console.log('Getting baseline data with params:', { type, userId });
      
      if (!userId) {
        console.warn('No userId found in localStorage for baseline request');
        // Return empty data instead of throwing an error
        return { data: { success: true, data: null } };
      }
      
      const response = await api.get('/assessments/baseline', { 
        params: { 
          type,
          userId
        } 
      });
      
      console.log('Baseline response:', response.data);
      return response.data;
    } catch (error) {
      if (error.response?.status === 404) {
        return { data: null };
      }
      console.error('API Error:', error.response?.data || error.message);
      
      // Return empty data instead of throwing
      return { data: null };
    }
  },
  delete: async (id) => {
    const response = await api.delete(`/assessments/${id}`);
    return response.data;
  }
};

export const assessmentService = {
  async saveAssessment(assessmentData) {
    try {
      const response = await api.post('/assessments', assessmentData);
      return response.data;
    } catch (error) {
      console.error('API Error:', error.response?.data || error.message);
      throw error;
    }
  }
};

// Update the specialized assessments API path to match your endpoints
export const specializedAssessments = {
  neckMobility: {
    save: (data) => axios.post('/api/specialized-assessments/neck-mobility', data),
    getHistory: (userId, limit = 10) => axios.get(`/api/specialized-assessments/neck-mobility/history?userId=${userId}&limit=${limit}`),
    getBaseline: (userId) => axios.get(`/api/specialized-assessments/neck-mobility/baseline/${userId}`),
    complete: (formData) => axios.post('/api/specialized-assessments/neck-mobility/complete', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })
  },
  eyeMovement: {
    save: async (data) => {
      try {
        const response = await api.post('/specialized-assessments/eye-movement', data);
        return response; // Return the full Axios response object
      } catch (error) {
        console.error('API Error in eyeMovement.save:', {
          status: error.response?.status,
          data: error.response?.data,
          message: error.message
        });
        throw error;
      }
    },
    getHistory: (userId, limit) => api.get('/specialized-assessments/eye-movement/history', { params: { userId, limit } }),
    getBaseline: (userId) => api.get(`/specialized-assessments/eye-movement/baseline/${userId}`)
  },
  facialSymmetry: {
    save: (data) => api.post('/specialized-assessments/facial-symmetry', data),
    getHistory: (userId) => api.get(`/specialized-assessments/facial-symmetry/history/${userId}`),
    getBaseline: (userId) => api.get(`/specialized-assessments/facial-symmetry/baseline/${userId}`)
      .catch(error => {
        if (error.response?.status === 404) {
          // Return empty data if no baseline exists
          return { data: { success: true, data: null } };
        }
        throw error;
      })
  },
  // Add new tremor assessment API
  tremor: {
    save: async (data) => {
      try {
        const response = await api.post('/specialized-assessments/tremor', data);
        return response; // Return the full Axios response object
      } catch (error) {
        console.error('API Error in tremor.save:', {
          status: error.response?.status,
          data: error.response?.data,
          message: error.message
        });
        throw error;
      }
    },
    getHistory: (userId, limit) => api.get('/specialized-assessments/tremor/history', { params: { userId, limit } }),
    getBaseline: (userId) => api.get(`/specialized-assessments/tremor/baseline/${userId}`)
  },
  responseTime: {
    save: async (data) => {
      try {
        const response = await api.post('/specialized-assessments/response-time', data);
        return response; // Return the full Axios response object
      } catch (error) {
        console.error('API Error in responseTime.save:', {
          status: error.response?.status,
          data: error.response?.data,
          message: error.message
        });
        throw error;
      }
    },
    getHistory: (userId, limit) => api.get('/specialized-assessments/response-time/history', { params: { userId, limit } }),
    getBaseline: (userId) => api.get(`/specialized-assessments/response-time/baseline/${userId}`)
  },
  gaitAnalysis: {
    save: async (data) => {
      try {
        const response = await api.post('/specialized-assessments/gait-analysis', data);
        return response; // Return the full Axios response object
      } catch (error) {
        console.error('API Error in gaitAnalysis.save:', {
          status: error.response?.status,
          data: error.response?.data,
          message: error.message
        });
        throw error;
      }
    },
    getHistory: (userId, limit) => api.get('/specialized-assessments/gait-analysis/history', { params: { userId, limit } }),
    getBaseline: (userId) => api.get(`/specialized-assessments/gait-analysis/baseline/${userId}`)
  },
  fingerTapping: {
    save: async (data) => {
      try {
        const response = await api.post('/specialized-assessments/finger-tapping', data);
        return response; // Return the full Axios response object
      } catch (error) {
        console.error('API Error in fingerTapping.save:', {
          status: error.response?.status,
          data: error.response?.data,
          message: error.message
        });
        throw error;
      }
    },
    getHistory: (userId, limit) => api.get('/specialized-assessments/finger-tapping/history', { params: { userId, limit } }),
    getBaseline: (userId) => api.get(`/specialized-assessments/finger-tapping/baseline/${userId}`)
  },
  speechPattern: {
    save: async (data) => {
      try {
        const response = await api.post('/specialized-assessments/speech-pattern', data);
        return response; // Return the full Axios response object
      } catch (error) {
        console.error('API Error in speechPattern.save:', {
          status: error.response?.status,
          data: error.response?.data,
          message: error.message
        });
        throw error;
      }
    },
    getHistory: (userId, limit) => api.get('/specialized-assessments/speech-pattern/history', { params: { userId, limit } }),
    getBaseline: (userId) => api.get(`/specialized-assessments/speech-pattern/baseline/${userId}`)
  }
  ,
  stroop: {
    save: async (data) => {
      try {
        const response = await api.post('/specialized-assessments/stroop', data);
        return response;
      } catch (error) {
        console.error('API Error in stroop.save:', {
          status: error.response?.status,
          data: error.response?.data,
          message: error.message
        });
        throw error;
      }
    },
    getHistory: (userId, limit) => api.get('/specialized-assessments/stroop/history', { params: { userId, limit } }),
    getBaseline: (userId) => api.get(`/specialized-assessments/stroop/baseline/${userId}`)
  }
};

export { api };
export default api;