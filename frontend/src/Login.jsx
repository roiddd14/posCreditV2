import { useState } from "react";
import { useAuth } from "./contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { ShoppingBag, User, Lock, AlertCircle, Loader2, Sun, Moon } from "lucide-react";
import { useDarkMode } from "./contexts/DarkModeContext";

function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const { isDarkMode, toggleDarkMode } = useDarkMode();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    const result = await login(username, password);
    
    if (result.success) {
      if (result.user.mustChangePassword) {
        navigate("/change-password");
      } else {
        navigate("/");
      }
    } else {
      setError(result.message);
      setIsLoading(false);
    }
  };

  return (
    <div className={`min-h-screen flex items-center justify-center p-4 relative overflow-hidden ${
      isDarkMode ? "bg-neutral-950" : "bg-orange-50"
    }`}>
      {/* Dark Mode Toggle */}
      <button
        onClick={toggleDarkMode}
        className={`fixed top-6 right-6 p-3 rounded-2xl shadow-xl z-50 border transition-all hover:scale-105 ${
          isDarkMode ? "bg-neutral-800 text-amber-400 border-neutral-700" : "bg-white text-primary-600 border-orange-200"
        }`}
      >
        {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
      </button>

      <div className="max-w-md w-full bg-white dark:bg-neutral-800 rounded-3xl shadow-2xl overflow-hidden border border-neutral-100 dark:border-neutral-700">
        <div className="p-8 md:p-12">
          <div className="flex flex-col items-center mb-10">
            <div className="w-20 h-20 bg-gradient-to-br from-primary-500 to-orange-600 rounded-2xl flex items-center justify-center shadow-xl shadow-primary-500/20 mb-6">
              <ShoppingBag className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-3xl font-black text-neutral-800 dark:text-white tracking-tight">Welcome Back</h1>
            <p className="text-neutral-500 dark:text-neutral-400 mt-2 font-medium text-center">POS Credit Management System</p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-rose-50 dark:bg-rose-900/20 border border-rose-100 dark:border-rose-800 rounded-2xl flex items-center gap-3 text-rose-600 dark:text-rose-400">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <p className="text-sm font-semibold">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-bold text-neutral-700 dark:text-neutral-300 mb-2 ml-1">Username</label>
              <div className="relative group">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400 group-focus-within:text-primary-500 transition-colors" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 bg-neutral-50 dark:bg-neutral-900 border-2 border-neutral-100 dark:border-neutral-700 rounded-2xl focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 transition-all outline-none font-medium dark:text-white"
                  placeholder="Enter your username"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-neutral-700 dark:text-neutral-300 mb-2 ml-1">Password</label>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400 group-focus-within:text-primary-500 transition-colors" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 bg-neutral-50 dark:bg-neutral-900 border-2 border-neutral-100 dark:border-neutral-700 rounded-2xl focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 transition-all outline-none font-medium dark:text-white"
                  placeholder="Enter your password"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-4 bg-gradient-to-r from-primary-500 to-orange-600 text-white font-bold rounded-2xl shadow-lg shadow-primary-500/25 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-70 disabled:hover:scale-100 flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Signing in...
                </>
              ) : (
                "Sign In"
              )}
            </button>
          </form>
        </div>
        
        <div className="bg-neutral-50 dark:bg-neutral-900/50 p-6 text-center border-t border-neutral-100 dark:border-neutral-700">
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            Admin-controlled access only. Contact your administrator for credentials.
          </p>
        </div>
      </div>
    </div>
  );
}

export default Login;
