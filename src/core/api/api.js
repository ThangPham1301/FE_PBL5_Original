import axiosInstance from './axiosClient';
import { API_BASE_URL, API_BASE_URL_FALLBACKS } from '../../shared/config';

export function unwrapResponse(response) {
  if (!response) {
    return null;
  }
  const data = response.data;
  if (data && typeof data === 'object' && Object.prototype.hasOwnProperty.call(data, 'data')) {
    return data.data;
  }
  return data;
}

export const authAPI = {
  login: (username, password) => axiosInstance.post('/auth/login/', { username, password }),
  refresh: (refresh) => axiosInstance.post('/auth/refresh/', { refresh }),
  logout: (refresh, access) =>
    axiosInstance.post(
      '/auth/logout/',
      { refresh },
      access ? { headers: { Authorization: `Bearer ${access}` } } : undefined
    ),
};

export const employeeAPI = {
  getAll: (params) => axiosInstance.get('/employees/', { params }),
  getById: (id) => axiosInstance.get(`/employees/${id}/`),
  create: (data) => axiosInstance.post('/employees/', data),
  update: (id, data) => axiosInstance.patch(`/employees/${id}/`, data),
  delete: (id) => axiosInstance.delete(`/employees/${id}/`),
  registerFace: (id, data) => axiosInstance.post(`/employees/${id}/register-face/`, data),
};

export const departmentsAPI = {
  getAll: (params) => axiosInstance.get('/departments/', { params }),
  create: (data) => axiosInstance.post('/departments/', data),
  update: (id, data) => axiosInstance.put(`/departments/${id}/`, data),
  delete: async (id) => {
    const url = `/departments/${id}/`;
    try {
      return await axiosInstance.delete(url);
    } catch (error) {
      const noHttpResponse = !error?.response;
      const fallbackBaseUrls = API_BASE_URL_FALLBACKS.filter((baseUrl) => baseUrl !== API_BASE_URL);

      if (!noHttpResponse || fallbackBaseUrls.length === 0) {
        throw error;
      }

      let lastError = error;
      for (const baseURL of fallbackBaseUrls) {
        try {
          return await axiosInstance.request({ method: 'delete', url, baseURL });
        } catch (retryError) {
          lastError = retryError;
          if (retryError?.response) {
            throw retryError;
          }
        }
      }

      throw lastError;
    }
  },
};

export const attendanceAPI = {
  getAll: (params) => axiosInstance.get('/attendance/', { params }),
  getToday: () => axiosInstance.get('/attendance/today/'),
  getSmartOfficeAccess: () => axiosInstance.get('/attendance/smart-office-access/'),
  checkIn: (data) => axiosInstance.post('/attendance/check-in/', data),
  checkOut: (data) => axiosInstance.post('/attendance/check-out/', data),
};

export const leaveAPI = {
  getTypes: () => axiosInstance.get('/leave-types/'),
  getAll: (params) => axiosInstance.get('/leaves/', { params }),
  create: (data) => axiosInstance.post('/leaves/', data),
  approve: (id) => axiosInstance.put(`/leaves/${id}/approve/`),
  reject: (id) => axiosInstance.put(`/leaves/${id}/reject/`, {}),
};

export const shiftsAPI = {
  getAll: (params) => axiosInstance.get('/shifts/', { params }),
  getMine: () => axiosInstance.get('/shifts/my/'),
  create: (data) => axiosInstance.post('/shifts/', data),
  update: (id, data) => axiosInstance.put(`/shifts/${id}/`, data),
  delete: (id) => axiosInstance.delete(`/shifts/${id}/`),
  assign: (data) => axiosInstance.post('/shifts/assign/', data),
};

export const reportsAPI = {
  getMonthly: (params) => axiosInstance.get('/reports/monthly/', { params }),
  export: (params) => axiosInstance.get('/reports/export/', { params, responseType: 'blob' }),
};

export const faceAPI = {
  validate: (image, pose) =>
    axiosInstance.post('/face/validate/', {
      image,
      pose,
    }),
  register: (userId, images, poses) =>
    axiosInstance.post('/face/register/', {
      user_id: String(userId),
      images,
      poses,
    }),
  enroll: (employeeId, file) => {
    const formData = new FormData();
    formData.append('employee_id', String(employeeId));
    formData.append('file', file);
    return axiosInstance.post('/face/enroll/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  recognize: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return axiosInstance.post('/face/recognize/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};

export const overtimeAPI = {
  getAll: (params) => axiosInstance.get('/overtime-requests/', { params }),
  getById: (id) => axiosInstance.get(`/overtime-requests/${id}/`),
  create: (data) => axiosInstance.post('/overtime-requests/', data),
  approve: (id) => axiosInstance.put(`/overtime-requests/${id}/approve/`),
  reject: (id, data) => axiosInstance.put(`/overtime-requests/${id}/reject/`, data || {}),
};
