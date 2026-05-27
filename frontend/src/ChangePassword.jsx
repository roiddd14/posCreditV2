import { useState } from "react";
import { useAuth } from "./contexts/AuthContext";
import { useDarkMode } from "./contexts/DarkModeContext";
import { useNavigate } from "react-router-dom";
import { Lock, KeyRound, AlertCircle, CheckCircle2 } from "lucide-react";

function ChangePassword() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const { changePassword } = useAuth();
  const { isDarkMode } = useDarkMode();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (newPassword !== confirmPassword) {
      return setError("Passwords do not match");
    }

    if (newPassword.length < 6) {
      return setError("New password must be at least 6 characters");
    }

    const result = await changePassword(currentPassword, newPassword);
    if (result.success) {
      setSuccess(true);
      setTimeout(() => navigate("/"), 2000);
    } else {
      setError(result.message);
    }
  };

  return (
    <div className={`min-h-screen flex items-center justify-center p-4 transition-colors duration-200 ${
      isDarkMode 
        ? "bg-neutral-900" 
        : "bg-gradient-to-br from-blue-50 via-white to-purple-50"
    }`}>
      <div className={`max-w-md w-full rounded-2xl shadow-xl p-8 border transition-colors ${
        isDarkMode 
          ? "bg-neutral-800 border-neutral-700" 
          : "bg-white border-neutral-100"
      }`}>
        <div className="text-center mb-8">
          <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 ${
            isDarkMode 
              ? "bg-primary-900/30" 
              : "bg-primary-100"
          }`}>
            <Lock className="w-8 h-8 text-primary-600" />
          </div>
          <h2 className={`text-2xl font-bold ${isDarkMode ? "text-white" : "text-neutral-800"}`}>
            Change Password
          </h2>
          <p className={`mt-2 ${isDarkMode ? "text-neutral-400" : "text-neutral-500"}`}>
            You must change your password before continuing.
          </p>
        </div>

        {error && (
          <div className={`mb-6 p-4 rounded-xl flex items-center gap-3 ${
            isDarkMode 
              ? "bg-rose-900/20 border border-rose-800 text-rose-400" 
              : "bg-rose-50 border border-rose-100 text-rose-600"
          }`}>
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <p className="text-sm font-medium">{error}</p>
          </div>
        )}

        {success && (
          <div className={`mb-6 p-4 rounded-xl flex items-center gap-3 ${
            isDarkMode 
              ? "bg-emerald-900/20 border border-emerald-800 text-emerald-400" 
              : "bg-emerald-50 border border-emerald-100 text-emerald-600"
          }`}>
            <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
            <p className="text-sm font-medium">Password changed! Redirecting...</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className={`block text-sm font-semibold mb-2 ${
              isDarkMode ? "text-neutral-300" : "text-neutral-700"
            }`}>
              Current Password
            </label>
            <div className="relative">
              <KeyRound className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 ${
                isDarkMode ? "text-neutral-500" : "text-neutral-400"
              }`} />
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className={`w-full pl-12 pr-4 py-3 rounded-xl border transition-all outline-none ${
                  isDarkMode 
                    ? "bg-neutral-700 border-neutral-600 text-white placeholder-neutral-500 focus:border-primary-500" 
                    : "bg-neutral-50 border-neutral-200 text-neutral-800 placeholder-neutral-400 focus:border-primary-500"
                } focus:ring-2 focus:ring-primary-500/20`}
                placeholder="Enter current password"
                required
              />
            </div>
          </div>

          <div>
            <label className={`block text-sm font-semibold mb-2 ${
              isDarkMode ? "text-neutral-300" : "text-neutral-700"
            }`}>
              New Password
            </label>
            <div className="relative">
              <Lock className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 ${
                isDarkMode ? "text-neutral-500" : "text-neutral-400"
              }`} />
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className={`w-full pl-12 pr-4 py-3 rounded-xl border transition-all outline-none ${
                  isDarkMode 
                    ? "bg-neutral-700 border-neutral-600 text-white placeholder-neutral-500 focus:border-primary-500" 
                    : "bg-neutral-50 border-neutral-200 text-neutral-800 placeholder-neutral-400 focus:border-primary-500"
                } focus:ring-2 focus:ring-primary-500/20`}
                placeholder="Enter new password"
                required
              />
            </div>
          </div>

          <div>
            <label className={`block text-sm font-semibold mb-2 ${
              isDarkMode ? "text-neutral-300" : "text-neutral-700"
            }`}>
              Confirm New Password
            </label>
            <div className="relative">
              <Lock className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 ${
                isDarkMode ? "text-neutral-500" : "text-neutral-400"
              }`} />
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={`w-full pl-12 pr-4 py-3 rounded-xl border transition-all outline-none ${
                  isDarkMode 
                    ? "bg-neutral-700 border-neutral-600 text-white placeholder-neutral-500 focus:border-primary-500" 
                    : "bg-neutral-50 border-neutral-200 text-neutral-800 placeholder-neutral-400 focus:border-primary-500"
                } focus:ring-2 focus:ring-primary-500/20`}
                placeholder="Confirm new password"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-4 bg-gradient-to-r from-primary-500 to-orange-600 text-white font-bold rounded-xl shadow-lg shadow-primary-500/25 hover:from-primary-600 hover:to-orange-700 hover:scale-[1.02] active:scale-[0.98] transition-all mt-4"
          >
            Update Password
          </button>
        </form>
      </div>
    </div>
  );
}

export default ChangePassword;