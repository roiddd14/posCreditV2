import { createContext, useContext, useState, useEffect } from "react";
import axios from "axios";
import { apiUrl } from "../config/api";

const AuthContext = createContext();

const normalizeUser = (user) => {
  if (!user) return user;
  return {
    ...user,
    role: user.role === "superadmin" ? "admin" : user.role,
  };
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const storedUser = JSON.parse(localStorage.getItem("user"));
    const normalizedUser = normalizeUser(storedUser);
    if (storedUser && normalizedUser?.role !== storedUser.role) {
      localStorage.setItem("user", JSON.stringify(normalizedUser));
    }
    return normalizedUser;
  });
  const [token, setToken] = useState(localStorage.getItem("token"));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
    } else {
      delete axios.defaults.headers.common["Authorization"];
    }
    setLoading(false);
  }, [token]);

  const login = async (username, password) => {
    try {
      const response = await axios.post(apiUrl("/auth/login"), {
        username,
        password,
      });
      const { token, user } = response.data;
      const normalizedUser = normalizeUser(user);
      
      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(normalizedUser));
      
      setToken(token);
      setUser(normalizedUser);
      
      return { success: true, user: normalizedUser };
    } catch (error) {
      return { 
        success: false, 
        message: error.response?.data?.message || "Login failed" 
      };
    }
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setToken(null);
    setUser(null);
  };

  const changePassword = async (currentPassword, newPassword) => {
    try {
      await axios.post(apiUrl("/auth/change-password"), {
        currentPassword,
        newPassword,
      });
      
      // Update local user state
      const updatedUser = { ...user, mustChangePassword: false };
      localStorage.setItem("user", JSON.stringify(updatedUser));
      setUser(updatedUser);
      
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        message: error.response?.data?.message || "Password change failed" 
      };
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, changePassword, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
