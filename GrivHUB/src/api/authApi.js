import apiClient from './apiClient.js';

export const authApi = {
  // Login with Email, Mobile, or Username
  login: async ({ identifier, password, captchaToken }) => {
    const response = await apiClient.post('/auth/login/', {
      identifier,
      password,
      captcha_token: captchaToken || ''
    });
    return response.data;
  },

  // Consumer Registration
  registerConsumer: async (formData) => {
    const response = await apiClient.post('/auth/register/', formData);
    return response.data;
  },

  // Account Verification via OTP
  verifyAccount: async ({ identifier, otp }) => {
    const response = await apiClient.post('/auth/verify/', {
      identifier,
      otp
    });
    return response.data;
  },

  // Resend Verification Code
  resendVerification: async ({ identifier }) => {
    const response = await apiClient.post('/auth/resend-verification/', {
      identifier
    });
    return response.data;
  },

  // Forgot Password (initiates reset OTP)
  forgotPassword: async ({ identifier }) => {
    const response = await apiClient.post('/auth/forgot-password/', {
      identifier
    });
    return response.data;
  },

  // Reset Password with OTP
  resetPassword: async ({ identifier, otp, newPassword, confirmPassword }) => {
    const response = await apiClient.post('/auth/reset-password/', {
      identifier,
      otp,
      new_password: newPassword,
      confirm_password: confirmPassword
    });
    return response.data;
  },

  // Get current session user
  getMe: async () => {
    const response = await apiClient.get('/auth/me/');
    return response.data;
  },

  // Terminate session
  logout: async () => {
    const response = await apiClient.post('/auth/logout/');
    return response.data;
  },

  // -------------------------------------------------------------
  // Staff / Officer Onboarding APIs
  // -------------------------------------------------------------
  registerStaff: async (formData) => {
    const response = await apiClient.post('/auth/staff/register/', formData);
    return response.data;
  },

  verifyStaff: async ({ identifier, otp }) => {
    const response = await apiClient.post('/auth/staff/verify/', {
      identifier,
      otp
    });
    return response.data;
  },

  resendStaffVerification: async ({ identifier }) => {
    const response = await apiClient.post('/auth/staff/resend-verification/', {
      identifier
    });
    return response.data;
  },

  // -------------------------------------------------------------
  // Admin Staff Management APIs
  // -------------------------------------------------------------
  getStaffList: async (params = {}) => {
    const response = await apiClient.get('/admin/staff/', { params });
    return response.data;
  },

  getStaffDetail: async (staffId) => {
    const response = await apiClient.get(`/admin/staff/${staffId}/`);
    return response.data;
  },

  approveStaff: async (staffId) => {
    const response = await apiClient.post(`/admin/staff/${staffId}/approve/`);
    return response.data;
  },

  rejectStaff: async (staffId, reason = '') => {
    const response = await apiClient.post(`/admin/staff/${staffId}/reject/`, { reason });
    return response.data;
  },

  suspendStaff: async (staffId, reason = '') => {
    const response = await apiClient.post(`/admin/staff/${staffId}/suspend/`, { reason });
    return response.data;
  },

  reactivateStaff: async (staffId) => {
    const response = await apiClient.post(`/admin/staff/${staffId}/reactivate/`);
    return response.data;
  },

  // -------------------------------------------------------------
  // Admin Invitation APIs
  // -------------------------------------------------------------
  createAdminInvitation: async (data) => {
    const response = await apiClient.post('/admin/invitations/', data);
    return response.data;
  },

  getAdminInvitations: async () => {
    const response = await apiClient.get('/admin/invitations/list/');
    return response.data;
  },

  acceptAdminInvitation: async (token, data) => {
    const response = await apiClient.post(`/admin/invitations/${token}/accept/`, data);
    return response.data;
  }
};

export default authApi;
