import { useNavigate, Link } from "react-router-dom";
import { useState } from "react";
import { UserPlus, ShoppingBag, Eye, EyeOff, Moon, Sun, Sparkles, Check } from "lucide-react";
import { useDarkMode } from "./contexts/DarkModeContext";
import { apiUrl } from "./config/api";

const API = apiUrl("/auth/register");

function Register() {
  const navigate = useNavigate();
  const { isDarkMode, toggleDarkMode } = useDarkMode();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submitHandler = async (e) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters long");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (res.ok) {
        navigate("/login");
      } else {
        setError(data.message || "Registration failed. Please try again.");
      }
    } catch (err) {
      setError("Connection error. Please check your network.");
    } finally {
      setLoading(false);
    }
  };

  const passwordStrength = () => {
    if (password.length === 0) return 0;
    if (password.length < 6) return 1;
    if (password.length < 10) return 2;
    return 3;
  };

  const strengthColor = () => {
    const strength = passwordStrength();
    if (strength === 0) return isDarkMode ? "bg-neutral-700" : "bg-neutral-200";
    if (strength === 1) return "bg-rose-500";
    if (strength === 2) return "bg-amber-500";
    return "bg-emerald-500";
  };

  const strengthText = () => {
    const strength = passwordStrength();
    if (strength === 0) return "";
    if (strength === 1) return "Weak";
    if (strength === 2) return "Good";
    return "Strong";
  };

  return (
    <div className={`min-h-screen flex items-center justify-center p-4 relative overflow-hidden ${
      isDarkMode 
        ? "bg-gradient-to-br from-neutral-950 via-neutral-900 to-neutral-950" 
        : "bg-gradient-to-br from-orange-50 via-amber-50 to-orange-100"
    }`}>
      {/* Decorative Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className={`absolute top-20 -left-20 w-96 h-96 rounded-full blur-3xl opacity-20 ${
          isDarkMode ? "bg-primary-600" : "bg-primary-400"
        }`}></div>
        <div className={`absolute bottom-20 -right-20 w-96 h-96 rounded-full blur-3xl opacity-20 ${
          isDarkMode ? "bg-orange-600" : "bg-orange-400"
        }`}></div>
        <div className={`absolute top-1/2 left-1/2 -tra-neutral-x-1/2 -tra-neutral-y-1/2 w-[600px] h-[600px] rounded-full blur-3xl opacity-10 ${
          isDarkMode ? "bg-primary-500" : "bg-primary-300"
        }`}></div>
      </div>

      {/* Dark Mode Toggle */}
      <button
        onClick={toggleDarkMode}
        className={`fixed top-6 right-6 p-3 rounded-2xl shadow-xl backdrop-blur-sm z-50 border transition-all hover:scale-105 ${
          isDarkMode
            ? "bg-neutral-800/80 hover:bg-neutral-700/80 text-amber-400 border-neutral-700"
            : "bg-white/80 hover:bg-white text-primary-600 border-orange-200"
        }`}
        title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
      >
        {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
      </button>

      <div className="w-full max-w-md relative z-10 animate-slide-up">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-primary-500 via-primary-600 to-orange-600 rounded-3xl shadow-2xl shadow-primary-500/40 mb-6 relative group">
            <div className="absolute inset-0 bg-gradient-to-br from-primary-400 to-orange-500 rounded-3xl blur-xl opacity-50 group-hover:opacity-70 transition-opacity"></div>
            <ShoppingBag className="w-10 h-10 text-white relative z-10" />
          </div>
          
          <h1 className={`text-4xl font-bold mb-3 ${
            isDarkMode 
              ? "text-white" 
              : "bg-gradient-to-r from-neutral-800 to-neutral-600 bg-clip-text text-transparent"
          }`}>
            Create Account
          </h1>
          
          <p className={`text-lg ${isDarkMode ? "text-neutral-400" : "text-neutral-600"}`}>
            Join our POS system today
          </p>
        </div>

        {/* Register Card */}
        <div className={`rounded-3xl shadow-2xl p-8 backdrop-blur-sm border relative overflow-hidden ${
          isDarkMode 
            ? "bg-neutral-800/80 border-neutral-700/50" 
            : "bg-white/80 border-orange-200/50"
        }`}>
          {/* Card Glow Effect */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary-500/5 to-orange-500/5 pointer-events-none"></div>
          
          <div className="relative z-10">
            {/* Error Alert */}
            {error && (
              <div className={`mb-6 p-4 rounded-2xl text-sm border backdrop-blur-sm animate-fade-in ${
                isDarkMode
                  ? "bg-rose-900/40 border-rose-700/50 text-rose-300"
                  : "bg-rose-50 border-rose-300 text-rose-700"
              }`}>
                <div className="flex items-start gap-3">
                  <Sparkles className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              </div>
            )}

            <form onSubmit={submitHandler} className="space-y-5">
              {/* Username Field */}
              <div className="space-y-2">
                <label className={`block text-sm font-semibold tracking-wide ${
                  isDarkMode ? "text-neutral-300" : "text-neutral-700"
                }`}>
                  Username
                </label>
                <input
                  className={`w-full px-5 py-3.5 border-2 rounded-2xl transition-all focus:outline-none focus:ring-4 focus:ring-primary-500/20 ${
                    isDarkMode
                      ? "bg-neutral-900/50 border-neutral-600 text-white placeholder-neutral-500 focus:border-primary-500 focus:bg-neutral-900"
                      : "bg-white border-neutral-200 text-neutral-800 placeholder-neutral-400 focus:border-primary-500 focus:bg-orange-50/50"
                  }`}
                  placeholder="Choose a username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
              </div>

              {/* Password Field */}
              <div className="space-y-2">
                <label className={`block text-sm font-semibold tracking-wide ${
                  isDarkMode ? "text-neutral-300" : "text-neutral-700"
                }`}>
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    className={`w-full px-5 py-3.5 border-2 rounded-2xl transition-all focus:outline-none focus:ring-4 focus:ring-primary-500/20 pr-12 ${
                      isDarkMode
                        ? "bg-neutral-900/50 border-neutral-600 text-white placeholder-neutral-500 focus:border-primary-500 focus:bg-neutral-900"
                        : "bg-white border-neutral-200 text-neutral-800 placeholder-neutral-400 focus:border-primary-500 focus:bg-orange-50/50"
                    }`}
                    placeholder="Create a password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className={`absolute right-4 top-1/2 -tra-neutral-y-1/2 transition-colors ${
                      isDarkMode
                        ? "text-neutral-500 hover:text-primary-400"
                        : "text-neutral-400 hover:text-primary-600"
                    }`}
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                {/* Password Strength Indicator */}
                {password && (
                  <div className="space-y-1.5">
                    <div className="flex gap-1.5">
                      {[1, 2, 3].map((level) => (
                        <div
                          key={level}
                          className={`h-1.5 flex-1 rounded-full transition-all ${
                            passwordStrength() >= level ? strengthColor() : isDarkMode ? "bg-neutral-700" : "bg-neutral-200"
                          }`}
                        ></div>
                      ))}
                    </div>
                    {passwordStrength() > 0 && (
                      <p className={`text-xs font-medium ${
                        passwordStrength() === 1 ? "text-rose-500" :
                        passwordStrength() === 2 ? "text-amber-500" :
                        "text-emerald-500"
                      }`}>
                        {strengthText()} password
                      </p>
                    )}
                  </div>
                )}
                <p className={`text-xs ${isDarkMode ? "text-neutral-500" : "text-neutral-500"}`}>
                  Minimum 6 characters
                </p>
              </div>

              {/* Confirm Password Field */}
              <div className="space-y-2">
                <label className={`block text-sm font-semibold tracking-wide ${
                  isDarkMode ? "text-neutral-300" : "text-neutral-700"
                }`}>
                  Confirm Password
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    className={`w-full px-5 py-3.5 border-2 rounded-2xl transition-all focus:outline-none focus:ring-4 focus:ring-primary-500/20 pr-12 ${
                      isDarkMode
                        ? "bg-neutral-900/50 border-neutral-600 text-white placeholder-neutral-500 focus:border-primary-500 focus:bg-neutral-900"
                        : "bg-white border-neutral-200 text-neutral-800 placeholder-neutral-400 focus:border-primary-500 focus:bg-orange-50/50"
                    }`}
                    placeholder="Confirm your password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className={`absolute right-4 top-1/2 -tra-neutral-y-1/2 transition-colors ${
                      isDarkMode
                        ? "text-neutral-500 hover:text-primary-400"
                        : "text-neutral-400 hover:text-primary-600"
                    }`}
                  >
                    {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                  {confirmPassword && password === confirmPassword && (
                    <div className="absolute right-14 top-1/2 -tra-neutral-y-1/2">
                      <Check className="w-5 h-5 text-emerald-500" />
                    </div>
                  )}
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="relative w-full group overflow-hidden rounded-2xl transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 mt-6"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-primary-500 via-primary-600 to-orange-600 transition-transform group-hover:scale-105"></div>
                <div className="absolute inset-0 bg-gradient-to-r from-primary-600 to-orange-700 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <div className={`absolute inset-0 shadow-glow-orange opacity-0 group-hover:opacity-100 transition-opacity`}></div>
                
                <div className="relative px-6 py-4 text-white font-bold text-lg flex items-center justify-center gap-3">
                  {loading ? (
                    <>
                      <div className="w-6 h-6 border-3 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Creating account...</span>
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-6 h-6" />
                      <span>Create Account</span>
                    </>
                  )}
                </div>
              </button>
            </form>

            {/* Login Link */}
            <div className="mt-8 text-center">
              <p className={`text-sm ${isDarkMode ? "text-neutral-400" : "text-neutral-600"}`}>
                Already have an account?{" "}
                <Link
                  to="/login"
                  className="text-primary-600 font-bold hover:text-primary-700 transition-colors inline-flex items-center gap-1 group"
                >
                  <span>Sign in here</span>
                  <span className="group-hover:tra-neutral-x-1 transition-transform inline-block">→</span>
                </Link>
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <p className={`text-center text-xs mt-8 ${isDarkMode ? "text-neutral-500" : "text-neutral-600"}`}>
          By creating an account, you agree to our terms of service
        </p>
      </div>
    </div>
  );
}

export default Register;
