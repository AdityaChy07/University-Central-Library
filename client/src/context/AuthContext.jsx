import React, { createContext, useContext, useState, useEffect } from 'react';
import { loginApi } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedUser = localStorage.getItem('library_user');
    const savedToken = localStorage.getItem('library_token');
    if (savedUser && savedToken) {
      setUser(JSON.parse(savedUser));
      setToken(savedToken);
    }
    setLoading(false);
  }, []);

  const login = async (identifier, password) => {
    try {
      const res = await loginApi({ identifier, password });
      const { user: userData, token: jwtToken } = res.data;
      setUser(userData);
      setToken(jwtToken);
      localStorage.setItem('library_user', JSON.stringify(userData));
      localStorage.setItem('library_token', jwtToken);
      return { success: true, user: userData };
    } catch (err) {
      let message = err.response?.data?.message;
      if (!message) {
        if (err.code === 'ECONNABORTED' || err.message?.toLowerCase().includes('timeout')) {
          message = 'Cloud server is waking up (first load takes ~45s). Please click Sign In again.';
        } else if (!err.response) {
          message = 'Unable to reach library API server. Please wait a few seconds and retry.';
        } else {
          message = `Login failed (HTTP ${err.response.status}). Please verify your credentials.`;
        }
      }
      return {
        success: false,
        message,
      };
    }
  };

  const updateUserSession = (updatedUser) => {
    setUser(updatedUser);
    localStorage.setItem('library_user', JSON.stringify(updatedUser));
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('library_user');
    localStorage.removeItem('library_token');
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, updateUserSession, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
