import { Routes, Route, Navigate } from "react-router-dom";
import { DarkModeProvider } from "./contexts/DarkModeContext";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import Login from "./Login";
import Dashboard from "./Dashboard";
import Inventory from "./Inventory";
import Analytics from "./Analytics";
import UserManagement from "./UserManagement";
import ChangePassword from "./ChangePassword";
import OrderTransaction from "./OrderTransaction";
import Layout from "./components/Layout";

const ProtectedRoute = ({ children, roles }) => {
  const { user, token } = useAuth();

  if (!token) {
    return <Navigate to="/login" />;
  }

  if (user?.mustChangePassword) {
    return <Navigate to="/change-password" />;
  }

  if (roles && !roles.includes(user.role)) {
    return <Navigate to="/" />;
  }

  return <Layout>{children}</Layout>;
};

function AppRoutes() {
  const { user } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/change-password" element={<ChangePassword />} />

      {/* Dashboard - Accessible by manager only */}
      {/* Admin users are redirected to /users */}
      <Route
        path="/"
        element={
          user?.role === "admin" ? (
            <Navigate to="/users" replace />
          ) : (
            <ProtectedRoute roles={["manager"]}>
              <Dashboard />
            </ProtectedRoute>
          )
        }
      />

      {/* Inventory - Accessible by manager */}
      <Route
        path="/inventory"
        element={
          <ProtectedRoute roles={["manager"]}>
            <Inventory />
          </ProtectedRoute>
        }
      />

      {/* Analytics - Accessible by manager */}
      <Route
        path="/analytics"
        element={
          <ProtectedRoute roles={["manager"]}>
            <Analytics />
          </ProtectedRoute>
        }
      />

      {/* Order Transaction - Accessible by manager */}
      <Route
        path="/orders"
        element={
          <ProtectedRoute roles={["manager"]}>
            <OrderTransaction />
          </ProtectedRoute>
        }
      />

      {/* User Management - Admin only */}
      <Route
        path="/users"
        element={
          <ProtectedRoute roles={["admin"]}>
            <UserManagement />
          </ProtectedRoute>
        }
      />

      {/* Catch-all redirect based on role */}
      <Route 
        path="*" 
        element={
          user?.role === "admin" ? (
            <Navigate to="/users" replace />
          ) : (
            <Navigate to="/" replace />
          )
        } 
      />
    </Routes>
  );
}

function App() {
  return (
    <DarkModeProvider>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </DarkModeProvider>
  );
}

export default App;
