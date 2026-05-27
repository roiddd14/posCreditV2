import { Link, useLocation } from "react-router-dom";
import { LayoutDashboard, Package, LogOut, ShoppingBag, Menu, X, Moon, Sun, Users, BarChart3, ShoppingCart, AlertTriangle } from "lucide-react";
import { useState, useEffect } from "react";
import { useDarkMode } from "../contexts/DarkModeContext";
import { useAuth } from "../contexts/AuthContext";

function Sidebar() {
  const location = useLocation();
  // Default to closed on mobile, open on desktop
  const [isOpen, setIsOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const { isDarkMode, toggleDarkMode } = useDarkMode();
  const { user, logout } = useAuth();

  // Set sidebar open by default on desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setIsOpen(true);
      } else {
        setIsOpen(false);
      }
    };

    // Set initial state
    handleResize();

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Close sidebar on mobile when route changes
  useEffect(() => {
    if (window.innerWidth < 1024) {
      setIsOpen(false);
    }
  }, [location.pathname]);

  const linkStyle = (path) =>
    `flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium ${
      location.pathname === path
        ? "bg-gradient-to-r from-primary-500 to-orange-600 text-white shadow-lg shadow-primary-500/20"
        : isDarkMode
        ? "text-neutral-300 hover:bg-neutral-700"
        : "text-neutral-700 hover:bg-neutral-100"
    }`;

  return (
    <>
      {/* Menu Button - Always visible on mobile, hidden on desktop */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed top-4 left-4 z-50 lg:hidden w-12 h-12 rounded-xl shadow-lg flex items-center justify-center transition-all border ${
          isDarkMode
            ? "bg-neutral-800 text-neutral-200 hover:bg-neutral-700 border-neutral-700"
            : "bg-white text-neutral-700 hover:bg-neutral-50 border-neutral-200"
        }`}
      >
        {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
      </button>

      {/* Overlay for mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed lg:static inset-y-0 left-0 z-40 w-72 h-screen overflow-y-hidden shadow-xl flex flex-col transition-transform duration-300 ${
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        } ${
          isDarkMode
            ? "bg-neutral-800 border-r border-neutral-700"
            : "bg-white border-r border-neutral-200"
        }`}
      >
        {/* Logo/Header */}
        <div className={`p-6 ${isDarkMode ? "border-b border-neutral-700" : "border-b border-neutral-200"}`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-orange-600 rounded-xl flex items-center justify-center shadow-md flex-shrink-0">
              <ShoppingBag className="w-6 h-6 text-white" />
            </div>
            <div className="overflow-hidden">
              <h2 className={`text-xl font-bold whitespace-nowrap ${isDarkMode ? "text-white" : "text-neutral-800"}`}>
                POS System
              </h2>
              <p className={`text-xs whitespace-nowrap ${isDarkMode ? "text-neutral-400" : "text-neutral-500"}`}>
                {user?.role?.toUpperCase()} | {user?.name}
              </p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto">  
          <nav className="flex-1 p-4 space-y-2 overflow-y-auto scrollbar-thin scrollbar-thumb-neutral-600 scrollbar-track-transparent">
            {/* Admin only sees User Management */}
            {user?.role === "admin" && (
              <Link to="/users" className={linkStyle("/users")}>
                <Users className="w-5 h-5 flex-shrink-0" />
                <span>User Management</span>
              </Link>
            )}

            {/* Manager sees Credit Management */}
            {user?.role === "manager" && (
              <Link to="/" className={linkStyle("/")}>
                <LayoutDashboard className="w-5 h-5 flex-shrink-0" />
                <span>Credit Management</span>
              </Link>
            )}

            {/* Manager sees Inventory */}
            {user?.role === "manager" && (
              <Link to="/inventory" className={linkStyle("/inventory")}>
                <Package className="w-5 h-5 flex-shrink-0" />
                <span>Inventory</span>
              </Link>
            )}

            {/* Manager sees Orders */}
            {user?.role === "manager" && (
              <Link to="/orders" className={linkStyle("/orders")}>
                <ShoppingCart className="w-5 h-5 flex-shrink-0" />
                <span>Orders</span>
              </Link>
            )}

            {/* Manager sees Analytics */}
            {user?.role === "manager" && (
              <Link to="/analytics" className={linkStyle("/analytics")}>
                <BarChart3 className="w-5 h-5 flex-shrink-0" />
                <span>Analytics</span>
              </Link>
            )}

          </nav>
        </div>

        {/* Dark Mode Toggle & Logout */}
        <div className={`p-4 space-y-2 mt-auto ${isDarkMode ? "border-t border-neutral-700" : "border-t border-neutral-200"}`}>
          {/* Dark Mode Toggle */}
          <button
            onClick={toggleDarkMode}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium ${
              isDarkMode
                ? "text-neutral-300 hover:bg-neutral-700"
                : "text-neutral-700 hover:bg-neutral-100"
            }`}
          >
            {isDarkMode ? (
              <>
                <Sun className="w-5 h-5 flex-shrink-0" />
                <span>Light Mode</span>
              </>
            ) : (
              <>
                <Moon className="w-5 h-5 flex-shrink-0" />
                <span>Dark Mode</span>
              </>
            )}
          </button>

          {/* Logout Button */}
          <button
            onClick={() => setShowLogoutConfirm(true)}
            className="w-full flex items-center gap-3 px-4 py-3 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-xl transition-all font-medium"
          >
            <LogOut className="w-5 h-5 flex-shrink-0" />
            <span>Logout</span>
          </button>
        </div>
      </div>

      {showLogoutConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[60] animate-in fade-in duration-300">
          <div className={`rounded-2xl shadow-2xl max-w-md w-full p-6 animate-in zoom-in duration-300 ${isDarkMode ? "bg-neutral-800" : "bg-white"}`}>
            <div className="mb-6 text-center">
              <div className="w-16 h-16 bg-rose-100 dark:bg-rose-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-8 h-8 text-rose-600" />
              </div>
              <h3 className={`text-2xl font-bold mb-2 ${isDarkMode ? "text-white" : "text-neutral-800"}`}>
                Log out?
              </h3>
              <p className={isDarkMode ? "text-neutral-400" : "text-neutral-600"}>
                Are you sure you want to end your current session?
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className={`flex-1 px-6 py-3 border-2 rounded-xl font-semibold transition-all active:scale-95 ${
                  isDarkMode
                    ? "border-neutral-600 text-neutral-300 hover:bg-neutral-700"
                    : "border-neutral-300 text-neutral-700 hover:bg-neutral-50"
                }`}
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowLogoutConfirm(false);
                  logout();
                }}
                className="flex-1 px-6 py-3 bg-rose-600 text-white rounded-xl font-semibold hover:bg-rose-700 transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2"
              >
                <LogOut className="w-5 h-5" />
                Log out
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default Sidebar;
