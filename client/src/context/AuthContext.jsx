import { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import api from '../lib/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = localStorage.getItem('token');
        if (token) {
          // Verify token with backend (uses api instance which has token)
          const res = await api.get('/operator/verify');
          setUser(res.data.operator);
        }
      } catch (error) {
        console.error('Auth verification failed', error);
        localStorage.removeItem('token');
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = async (username, password) => {
    try {
      const res = await axios.post('/api/operator/login', { username, password });
      const { token, message } = res.data;
      // Depending on API response structure. Assuming token is returned.
      // Need to adjust if API returns user data separately or inside token.
      
      localStorage.setItem('token', token);
      
      // We might want to set user immediately if the login response contains it
      // For now, let's optimistically set it or fetch it. 
      // Based on server code, /login returns { message, token }. 
      // It doesn't return user details. 
      // So we can assume username is the user for now.
      setUser({ username }); 
      
      return true;
    } catch (error) {
      console.error('Login error', error);
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
