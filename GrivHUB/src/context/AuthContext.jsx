import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authApi } from '../api/authApi.js';

const AuthContext = createContext(undefined);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

  // Normalize role and approval status
  const normalizedUser = user
    ? {
        ...user,
        fullName: user.full_name || `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.username,
        role: user.role === 'CONSUMER' ? 'CONSUMER' : user.role,
        isCitizen: user.role === 'CONSUMER',
        isOfficer: user.role === 'OFFICER',
        isApprovedOfficer: user.role === 'OFFICER' && (user.approval_status === 'APPROVED' || !user.approval_status) && user.is_active,
        isPendingOfficer: user.role === 'OFFICER' && user.approval_status === 'PENDING_APPROVAL',
        isAdmin: user.role === 'ADMIN'
      }
    : null;

  // Verify and hydrate current user session on mount
  const refreshUser = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await authApi.getMe();
      if (data && data.id) {
        setUser(data);
        setAuthError(null);
      } else {
        setUser(null);
      }
    } catch (err) {
      // Not authenticated or session expired
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  // Login handler
  const login = async ({ identifier, password, captchaToken }) => {
    setAuthError(null);
    try {
      const response = await authApi.login({ identifier, password, captchaToken });
      if (response?.user) {
        setUser(response.user);
        return { success: true, user: response.user };
      }
      return { success: false, error: response?.error || 'Login failed' };
    } catch (err) {
      const isUnverified = err.status === 403 && err.data?.requires_verification;
      const isPendingApproval = err.data?.approval_status === 'PENDING_APPROVAL' || err.data?.requires_approval;
      const errorMsg = err.message || err.data?.error || 'Login failed';
      setAuthError(errorMsg);
      return {
        success: false,
        error: errorMsg,
        requiresVerification: Boolean(isUnverified),
        requiresApproval: Boolean(isPendingApproval),
        approvalStatus: err.data?.approval_status,
        employeeId: err.data?.employee_id,
        email: err.data?.email || identifier
      };
    }
  };

  // Consumer Registration handler
  const signup = async (formData) => {
    setAuthError(null);
    try {
      const response = await authApi.registerConsumer(formData);
      return {
        success: true,
        requiresVerification: response.requires_verification,
        email: response.email,
        user: response.user,
        message: response.message
      };
    } catch (err) {
      const errorMsg = err.message || 'Registration failed';
      setAuthError(errorMsg);
      return { success: false, error: errorMsg, data: err.data };
    }
  };

  // Staff / Officer Registration handler
  const registerStaff = async (formData) => {
    setAuthError(null);
    try {
      const response = await authApi.registerStaff(formData);
      return {
        success: true,
        requiresVerification: response.requires_verification,
        requiresApproval: response.requires_approval,
        approvalStatus: response.approval_status,
        employeeId: response.employee_id,
        email: response.email,
        user: response.user,
        message: response.message
      };
    } catch (err) {
      const errorMsg = err.message || 'Staff registration failed';
      setAuthError(errorMsg);
      return { success: false, error: errorMsg, data: err.data };
    }
  };

  // Staff Contact Verification handler
  const verifyStaff = async ({ identifier, otp }) => {
    setAuthError(null);
    try {
      const response = await authApi.verifyStaff({ identifier, otp });
      return {
        success: true,
        requiresApproval: response.requires_approval,
        approvalStatus: response.approval_status,
        employeeId: response.employee_id,
        message: response.message,
        user: response.user
      };
    } catch (err) {
      const errorMsg = err.message || 'Staff verification failed';
      setAuthError(errorMsg);
      return { success: false, error: errorMsg };
    }
  };

  // Resend Staff OTP handler
  const resendStaffVerification = async ({ identifier }) => {
    try {
      const response = await authApi.resendStaffVerification({ identifier });
      return { success: true, message: response.message };
    } catch (err) {
      return { success: false, error: err.message || 'Failed to resend code' };
    }
  };

  // OTP Verification handler (Consumer)
  const verifyAccount = async ({ identifier, otp }) => {
    setAuthError(null);
    try {
      const response = await authApi.verifyAccount({ identifier, otp });
      if (response?.user) {
        setUser(response.user);
      }
      return { success: true, message: response.message, user: response.user };
    } catch (err) {
      const errorMsg = err.message || 'Verification failed';
      setAuthError(errorMsg);
      return { success: false, error: errorMsg };
    }
  };

  // Resend OTP handler
  const resendVerification = async ({ identifier }) => {
    try {
      const response = await authApi.resendVerification({ identifier });
      return { success: true, message: response.message };
    } catch (err) {
      return { success: false, error: err.message || 'Failed to resend code' };
    }
  };

  // Forgot Password handler
  const forgotPassword = async ({ identifier }) => {
    try {
      const response = await authApi.forgotPassword({ identifier });
      return { success: true, message: response.message };
    } catch (err) {
      return { success: false, error: err.message || 'Failed to request password reset' };
    }
  };

  // Reset Password handler
  const resetPassword = async ({ identifier, otp, newPassword, confirmPassword }) => {
    try {
      const response = await authApi.resetPassword({ identifier, otp, newPassword, confirmPassword });
      return { success: true, message: response.message };
    } catch (err) {
      return { success: false, error: err.message || 'Failed to reset password' };
    }
  };

  // Logout handler
  const logout = async () => {
    try {
      await authApi.logout();
    } catch (e) {
      console.warn('Backend logout call returned error:', e);
    } finally {
      setUser(null);
      setAuthError(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user: normalizedUser,
        currentUser: normalizedUser, // Alias for legacy components
        role: normalizedUser?.role || null,
        isAuthenticated: Boolean(normalizedUser && normalizedUser.id),
        isLoading,
        authError,
        login,
        signup,
        registerStaff,
        verifyStaff,
        resendStaffVerification,
        verifyAccount,
        resendVerification,
        forgotPassword,
        resetPassword,
        logout,
        refreshUser,
        setAuthError
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
