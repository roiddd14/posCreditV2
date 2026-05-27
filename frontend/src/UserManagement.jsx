import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Check,
  ChevronDown,
  Edit2,
  Key,
  Search,
  Shield,
  SlidersHorizontal,
  Trash2,
  UserCog,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { useDarkMode } from "./contexts/DarkModeContext";
import { useAuth } from "./contexts/AuthContext";
import { apiUrl } from "./config/api";

const USERS_API = apiUrl("/users");

const getInitials = (user) =>
  (user?.name || user?.username || "User")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

function UserManagement() {
  const { isDarkMode } = useDarkMode();
  const { token } = useAuth();

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notification, setNotification] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("name");

  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);
  const [showResetPasswordModal, setShowResetPasswordModal] = useState(false);
  const [userToReset, setUserToReset] = useState(null);
  const [newPassword, setNewPassword] = useState("");

  const [formData, setFormData] = useState({
    username: "",
    password: "",
    name: "",
  });

  useEffect(() => {
    if (token) fetchUsers();
  }, [token]);

  const requestHeaders = {
    Authorization: `Bearer ${token}`,
  };

  const showToast = (message, type = "success") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await axios.get(USERS_API, { headers: requestHeaders });
      setUsers(Array.isArray(response.data) ? response.data : []);
      setError("");
    } catch (err) {
      console.error("Fetch users error:", err);
      setError("Failed to fetch users");
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setEditingUser(null);
    setFormData({ username: "", password: "", name: "" });
  };

  const openCreateModal = () => {
    resetForm();
    setShowModal(true);
  };

  const openEditModal = (user) => {
    setEditingUser(user);
    setFormData({
      username: user.username,
      name: user.name,
      password: "",
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      if (editingUser) {
        await axios.put(`${USERS_API}/${editingUser._id}`, formData, {
          headers: requestHeaders,
        });
        showToast(`"${formData.name}" updated`);
      } else {
        await axios.post(USERS_API, formData, {
          headers: requestHeaders,
        });
        showToast(`"${formData.name}" created`);
      }

      setShowModal(false);
      resetForm();
      await fetchUsers();
      setError("");
    } catch (err) {
      console.error("Submit error:", err);
      setError(err.response?.data?.message || "Operation failed");
    }
  };

  const openDeleteModal = (user) => {
    setUserToDelete(user);
    setShowDeleteModal(true);
  };

  const handleDelete = async () => {
    try {
      await axios.delete(`${USERS_API}/${userToDelete._id}`, {
        headers: requestHeaders,
      });
      showToast(`"${userToDelete.name}" deleted`);
      await fetchUsers();
      setError("");
      setShowDeleteModal(false);
      setUserToDelete(null);
    } catch (err) {
      console.error("Delete error:", err);
      setError(err.response?.data?.message || "Delete failed");
    }
  };

  const openResetPasswordModal = (user) => {
    setUserToReset(user);
    setNewPassword("");
    setShowResetPasswordModal(true);
  };

  const handleResetPassword = async () => {
    if (!newPassword.trim()) {
      setError("Password cannot be empty");
      return;
    }

    try {
      await axios.post(
        `${USERS_API}/${userToReset._id}/reset-password`,
        { newPassword },
        { headers: requestHeaders }
      );
      setShowResetPasswordModal(false);
      setUserToReset(null);
      setNewPassword("");
      setError("");
      showToast(`Password reset for "${userToReset.name}"`);
      await fetchUsers();
    } catch (err) {
      console.error("Reset password error:", err);
      setError(err.response?.data?.message || "Reset failed");
    }
  };

  const stats = useMemo(() => {
    const admins = users.filter((user) => user.role === "admin").length;
    const managers = users.filter((user) => user.role === "manager").length;
    const pendingResets = users.filter((user) => user.mustChangePassword).length;

    return {
      total: users.length,
      admins,
      managers,
      pendingResets,
    };
  }, [users]);

  const filteredUsers = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    return users
      .filter((user) => {
        const matchesSearch =
          !query ||
          user.name?.toLowerCase().includes(query) ||
          user.username?.toLowerCase().includes(query);
        const matchesRole = roleFilter === "all" || user.role === roleFilter;
        const matchesStatus =
          statusFilter === "all" ||
          (statusFilter === "active" && !user.mustChangePassword) ||
          (statusFilter === "pending" && user.mustChangePassword);

        return matchesSearch && matchesRole && matchesStatus;
      })
      .sort((a, b) => {
        if (sortBy === "role") return (a.role || "").localeCompare(b.role || "");
        if (sortBy === "status") return Number(b.mustChangePassword) - Number(a.mustChangePassword);
        return (a.name || "").localeCompare(b.name || "");
      });
  }, [roleFilter, searchTerm, sortBy, statusFilter, users]);

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${isDarkMode ? "bg-neutral-900" : "bg-neutral-50"}`}>
        <div className="text-center">
          <div className="relative mb-5">
            <div className="w-16 h-16 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <Shield className="w-7 h-7 text-orange-600 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
          </div>
          <p className={`font-medium ${isDarkMode ? "text-neutral-400" : "text-neutral-600"}`}>Loading users...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen pb-20 transition-colors duration-300 ${isDarkMode ? "bg-neutral-900" : "bg-neutral-50"}`}>
      <div className={`pt-8 pb-10 px-4 sm:px-6 lg:px-8 ${isDarkMode ? "bg-neutral-800/50" : "bg-white shadow-sm"}`}>
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
            <div className="flex items-start gap-4">
              <div className={`p-3 rounded-2xl flex-shrink-0 ${isDarkMode ? "bg-orange-900/30" : "bg-orange-100"}`}>
                <Shield className="w-8 h-8 text-orange-600" />
              </div>
              <div>
                <h1 className={`text-3xl sm:text-4xl font-black tracking-tight ${isDarkMode ? "text-white" : "text-neutral-900"}`}>
                  Admin <span className="text-orange-600">Console</span>
                </h1>
                <p className={`text-base sm:text-lg font-medium mt-1 ${isDarkMode ? "text-neutral-400" : "text-neutral-600"}`}>
                  Manage account access, roles, and password resets.
                </p>
              </div>
            </div>

            <button
              onClick={openCreateModal}
              className="flex items-center justify-center gap-2 bg-gradient-to-r from-orange-500 to-orange-600 text-white px-6 py-3 rounded-2xl font-bold shadow-lg hover:shadow-orange-500/25 hover:from-orange-600 hover:to-orange-700 active:scale-95 transition-all"
            >
              <UserPlus className="w-5 h-5" />
              Add User
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mt-8">
            <AdminMetric icon={<Users className="w-5 h-5" />} label="Total users" value={stats.total} isDarkMode={isDarkMode} />
            <AdminMetric icon={<Shield className="w-5 h-5" />} label="Admins" value={stats.admins} isDarkMode={isDarkMode} />
            <AdminMetric icon={<UserCog className="w-5 h-5" />} label="Managers" value={stats.managers} isDarkMode={isDarkMode} />
            <AdminMetric icon={<Key className="w-5 h-5" />} label="Pending resets" value={stats.pendingResets} isDarkMode={isDarkMode} />
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
        {error && (
          <div className="mb-6 p-4 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-2xl flex items-center gap-3 text-rose-600 dark:text-rose-400">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <p className="font-medium">{error}</p>
            <button
              onClick={() => setError("")}
              className="ml-auto p-1 hover:bg-rose-100 dark:hover:bg-rose-900/40 rounded-lg transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        <div className={`rounded-2xl border p-4 mb-6 shadow-sm ${isDarkMode ? "bg-neutral-800 border-neutral-700" : "bg-white border-neutral-200"}`}>
          <div className="flex flex-col xl:flex-row gap-4">
            <div className="relative group flex-1">
              <Search className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 transition-colors ${isDarkMode ? "text-neutral-500 group-focus-within:text-orange-500" : "text-neutral-400 group-focus-within:text-orange-500"}`} />
              <input
                type="text"
                placeholder="Search by name or username..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={`w-full pl-12 pr-4 py-3.5 rounded-xl border-2 focus:outline-none focus:border-orange-500 transition-all text-base ${isDarkMode ? "bg-neutral-900/60 border-neutral-700 text-white placeholder-neutral-500" : "bg-neutral-50 border-neutral-200 text-neutral-800 placeholder-neutral-400"}`}
              />
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <SegmentedControl
                value={roleFilter}
                onChange={setRoleFilter}
                options={[
                  ["all", "All"],
                  ["admin", "Admins"],
                  ["manager", "Managers"],
                ]}
                isDarkMode={isDarkMode}
              />

              <SortDropdown
                value={sortBy}
                onChange={setSortBy}
                isDarkMode={isDarkMode}
                options={[
                  ["name", "Name A-Z"],
                  ["role", "Role"],
                  ["status", "Password status"],
                ]}
              />
            </div>
          </div>

          <div className={`mt-4 pt-4 border-t flex flex-col lg:flex-row lg:items-center justify-between gap-3 ${isDarkMode ? "border-neutral-700" : "border-neutral-100"}`}>
            <SegmentedControl
              value={statusFilter}
              onChange={setStatusFilter}
              options={[
                ["all", "All status"],
                ["active", "Active"],
                ["pending", "Pending reset"],
              ]}
              isDarkMode={isDarkMode}
            />

            <div className={`text-sm font-medium flex items-center justify-between gap-3 ${isDarkMode ? "text-neutral-400" : "text-neutral-500"}`}>
              <span>
                Showing {filteredUsers.length} of {users.length} users
              </span>
              {(searchTerm || roleFilter !== "all" || statusFilter !== "all") && (
                <button
                  onClick={() => {
                    setSearchTerm("");
                    setRoleFilter("all");
                    setStatusFilter("all");
                  }}
                  className={isDarkMode ? "text-orange-400 hover:text-orange-300" : "text-orange-600 hover:text-orange-700"}
                >
                  Clear filters
                </button>
              )}
            </div>
          </div>
        </div>

        <div className={`rounded-2xl shadow-lg border overflow-hidden ${isDarkMode ? "bg-neutral-800 border-neutral-700" : "bg-white border-neutral-200"}`}>
          <div className={`px-5 py-4 border-b flex items-center justify-between ${isDarkMode ? "border-neutral-700" : "border-neutral-100"}`}>
            <div>
              <h2 className={`text-xl font-black ${isDarkMode ? "text-white" : "text-neutral-900"}`}>User Directory</h2>
              <p className={`text-sm ${isDarkMode ? "text-neutral-500" : "text-neutral-500"}`}>Account records and access controls</p>
            </div>
          </div>

          {filteredUsers.length === 0 ? (
            <div className="text-center py-20">
              <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 ${isDarkMode ? "bg-neutral-700" : "bg-neutral-100"}`}>
                <Search className="w-10 h-10 text-neutral-400" />
              </div>
              <h3 className={`text-2xl font-bold mb-2 ${isDarkMode ? "text-white" : "text-neutral-800"}`}>No users found</h3>
              <p className={isDarkMode ? "text-neutral-400" : "text-neutral-600"}>Try a different search term or filter.</p>
            </div>
          ) : (
            <>
              <div className="hidden lg:block overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className={`${isDarkMode ? "bg-neutral-900/40 text-neutral-400" : "bg-neutral-50 text-neutral-500"}`}>
                      <th className="text-left py-3 px-5 font-bold text-xs uppercase tracking-wide">User</th>
                      <th className="text-left py-3 px-5 font-bold text-xs uppercase tracking-wide">Role</th>
                      <th className="text-left py-3 px-5 font-bold text-xs uppercase tracking-wide">Password Status</th>
                      <th className="text-right py-3 px-5 font-bold text-xs uppercase tracking-wide">Actions</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${isDarkMode ? "divide-neutral-700" : "divide-neutral-100"}`}>
                    {filteredUsers.map((user) => (
                      <UserRow
                        key={user._id}
                        user={user}
                        isDarkMode={isDarkMode}
                        onEdit={() => openEditModal(user)}
                        onDelete={() => openDeleteModal(user)}
                        onResetPassword={() => openResetPasswordModal(user)}
                      />
                    ))}
                  </tbody>
                </table>
              </div>

              <div className={`lg:hidden divide-y ${isDarkMode ? "divide-neutral-700" : "divide-neutral-100"}`}>
                {filteredUsers.map((user) => (
                  <UserMobileCard
                    key={user._id}
                    user={user}
                    isDarkMode={isDarkMode}
                    onEdit={() => openEditModal(user)}
                    onDelete={() => openDeleteModal(user)}
                    onResetPassword={() => openResetPasswordModal(user)}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {showModal && (
        <UserFormModal
          editingUser={editingUser}
          formData={formData}
          setFormData={setFormData}
          isDarkMode={isDarkMode}
          onClose={() => {
            setShowModal(false);
            resetForm();
          }}
          onSubmit={handleSubmit}
        />
      )}

      {showDeleteModal && userToDelete && (
        <ConfirmDeleteModal
          user={userToDelete}
          isDarkMode={isDarkMode}
          onCancel={() => {
            setShowDeleteModal(false);
            setUserToDelete(null);
          }}
          onConfirm={handleDelete}
        />
      )}

      {showResetPasswordModal && userToReset && (
        <ResetPasswordModal
          user={userToReset}
          newPassword={newPassword}
          setNewPassword={setNewPassword}
          isDarkMode={isDarkMode}
          onCancel={() => {
            setShowResetPasswordModal(false);
            setUserToReset(null);
            setNewPassword("");
          }}
          onConfirm={handleResetPassword}
        />
      )}

      {notification && (
        <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom duration-300">
          <div className={`px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3 ${notification.type === "error" ? "bg-rose-600 text-white" : "bg-emerald-600 text-white"}`}>
            <CheckCircle2 className="w-5 h-5" />
            <div className="flex-1 font-medium">{notification.message}</div>
            <button onClick={() => setNotification(null)} className="text-white opacity-75 hover:opacity-100">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function AdminMetric({ icon, label, value, isDarkMode }) {
  return (
    <div className={`rounded-2xl border p-5 shadow-sm ${isDarkMode ? "bg-neutral-900/40 border-neutral-700" : "bg-neutral-50 border-neutral-100"}`}>
      <div className="flex items-center gap-3">
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${isDarkMode ? "bg-orange-900/30 text-orange-400" : "bg-orange-100 text-orange-600"}`}>
          {icon}
        </div>
        <div>
          <p className={`text-xs font-bold uppercase tracking-wide ${isDarkMode ? "text-neutral-500" : "text-neutral-500"}`}>{label}</p>
          <p className={`text-2xl font-black ${isDarkMode ? "text-white" : "text-neutral-900"}`}>{value}</p>
        </div>
      </div>
    </div>
  );
}

function SegmentedControl({ value, onChange, options, isDarkMode }) {
  return (
    <div className={`flex rounded-xl p-1 border overflow-x-auto ${isDarkMode ? "bg-neutral-900/60 border-neutral-700" : "bg-neutral-50 border-neutral-200"}`}>
      {options.map(([optionValue, label]) => (
        <button
          key={optionValue}
          onClick={() => onChange(optionValue)}
          className={`px-3 sm:px-4 py-2 rounded-lg text-sm font-semibold transition-all whitespace-nowrap ${
            value === optionValue
              ? "bg-orange-500 text-white shadow-sm"
              : isDarkMode
              ? "text-neutral-400 hover:text-white"
              : "text-neutral-600 hover:text-neutral-900"
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

function SortDropdown({ value, onChange, options, isDarkMode }) {
  const [open, setOpen] = useState(false);
  const selectedLabel = options.find(([optionValue]) => optionValue === value)?.[1] || "Sort";

  const selectOption = (optionValue) => {
    onChange(optionValue);
    setOpen(false);
  };

  return (
    <div className="relative min-w-[190px]">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        className={`w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl border text-sm font-semibold transition-all ${
          open
            ? "border-orange-500 ring-2 ring-orange-500/20"
            : isDarkMode
            ? "border-neutral-700"
            : "border-neutral-200"
        } ${
          isDarkMode
            ? "bg-neutral-900/60 text-neutral-100 hover:bg-neutral-900"
            : "bg-neutral-50 text-neutral-700 hover:bg-white"
        }`}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="flex items-center gap-2 min-w-0">
          <SlidersHorizontal className={`w-4 h-4 flex-shrink-0 ${isDarkMode ? "text-neutral-400" : "text-neutral-500"}`} />
          <span className="truncate">{selectedLabel}</span>
        </span>
        <ChevronDown className={`w-4 h-4 flex-shrink-0 transition-transform ${open ? "rotate-180" : ""} ${isDarkMode ? "text-neutral-400" : "text-neutral-500"}`} />
      </button>

      {open && (
        <div
          role="listbox"
          className={`absolute right-0 z-50 mt-2 w-full rounded-xl border p-1 shadow-2xl ${
            isDarkMode ? "bg-neutral-900 border-neutral-700" : "bg-white border-neutral-200"
          }`}
        >
          {options.map(([optionValue, label]) => {
            const selected = optionValue === value;
            return (
              <button
                key={optionValue}
                type="button"
                role="option"
                aria-selected={selected}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => selectOption(optionValue)}
                className={`w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
                  selected
                    ? "bg-orange-500 text-white"
                    : isDarkMode
                    ? "text-neutral-300 hover:bg-neutral-800 hover:text-white"
                    : "text-neutral-700 hover:bg-orange-50 hover:text-orange-700"
                }`}
              >
                <span>{label}</span>
                {selected && <Check className="w-4 h-4" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function RoleBadge({ role }) {
  const roleConfig = {
    admin: {
      label: "Admin",
      icon: <Shield className="w-3 h-3" />,
      className: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
    },
    manager: {
      label: "Manager",
      icon: <UserCog className="w-3 h-3" />,
      className: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
    },
  };
  const config = roleConfig[role] || roleConfig.manager;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase ${config.className}`}
    >
      {config.icon}
      {config.label}
    </span>
  );
}

function StatusBadge({ mustChangePassword }) {
  if (mustChangePassword) {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
        <Key className="w-3 h-3" />
        Pending reset
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
      <CheckCircle2 className="w-3 h-3" />
      Active
    </span>
  );
}

function UserAvatar({ user, isDarkMode }) {
  return (
    <div className={`w-11 h-11 rounded-2xl flex items-center justify-center text-sm font-black flex-shrink-0 ${isDarkMode ? "bg-neutral-700 text-orange-300" : "bg-orange-100 text-orange-700"}`}>
      {getInitials(user)}
    </div>
  );
}

function UserActions({ isDarkMode, onEdit, onDelete, onResetPassword }) {
  return (
    <div className="flex justify-end gap-2">
      <IconButton
        label="Reset password"
        icon={<Key className="w-4 h-4" />}
        onClick={onResetPassword}
        className={isDarkMode ? "text-amber-400 hover:bg-amber-900/30" : "text-amber-600 hover:bg-amber-50"}
      />
      <IconButton
        label="Edit user"
        icon={<Edit2 className="w-4 h-4" />}
        onClick={onEdit}
        className={isDarkMode ? "text-blue-400 hover:bg-blue-900/30" : "text-blue-600 hover:bg-blue-50"}
      />
      <IconButton
        label="Delete user"
        icon={<Trash2 className="w-4 h-4" />}
        onClick={onDelete}
        className={isDarkMode ? "text-rose-400 hover:bg-rose-900/30" : "text-rose-600 hover:bg-rose-50"}
      />
    </div>
  );
}

function IconButton({ label, icon, onClick, className }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`w-10 h-10 rounded-xl transition-colors flex items-center justify-center ${className}`}
    >
      {icon}
    </button>
  );
}

function UserRow({ user, isDarkMode, onEdit, onDelete, onResetPassword }) {
  return (
    <tr className={`transition-colors ${isDarkMode ? "hover:bg-neutral-700/40" : "hover:bg-neutral-50"}`}>
      <td className="py-4 px-5">
        <div className="flex items-center gap-3 min-w-0">
          <UserAvatar user={user} isDarkMode={isDarkMode} />
          <div className="min-w-0">
            <div className={`font-bold truncate ${isDarkMode ? "text-white" : "text-neutral-900"}`}>{user.name}</div>
            <div className={`text-sm truncate ${isDarkMode ? "text-neutral-400" : "text-neutral-500"}`}>@{user.username}</div>
          </div>
        </div>
      </td>
      <td className="py-4 px-5">
        <RoleBadge role={user.role} />
      </td>
      <td className="py-4 px-5">
        <StatusBadge mustChangePassword={user.mustChangePassword} />
      </td>
      <td className="py-4 px-5">
        <UserActions isDarkMode={isDarkMode} onEdit={onEdit} onDelete={onDelete} onResetPassword={onResetPassword} />
      </td>
    </tr>
  );
}

function UserMobileCard({ user, isDarkMode, onEdit, onDelete, onResetPassword }) {
  return (
    <div className="p-5">
      <div className="flex items-start gap-3">
        <UserAvatar user={user} isDarkMode={isDarkMode} />
        <div className="flex-1 min-w-0">
          <h3 className={`font-black truncate ${isDarkMode ? "text-white" : "text-neutral-900"}`}>{user.name}</h3>
          <p className={`text-sm truncate ${isDarkMode ? "text-neutral-400" : "text-neutral-500"}`}>@{user.username}</p>
          <div className="flex flex-wrap gap-2 mt-3">
            <RoleBadge role={user.role} />
            <StatusBadge mustChangePassword={user.mustChangePassword} />
          </div>
        </div>
      </div>
      <div className={`mt-4 pt-4 border-t ${isDarkMode ? "border-neutral-700" : "border-neutral-100"}`}>
        <UserActions isDarkMode={isDarkMode} onEdit={onEdit} onDelete={onDelete} onResetPassword={onResetPassword} />
      </div>
    </div>
  );
}

function UserFormModal({ editingUser, formData, setFormData, isDarkMode, onClose, onSubmit }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className={`w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in duration-300 ${isDarkMode ? "bg-neutral-800 text-white" : "bg-white text-neutral-800"}`}>
        <div className={`p-6 border-b flex items-center justify-between ${isDarkMode ? "border-neutral-700" : "border-neutral-100"}`}>
          <div>
            <h2 className="text-2xl font-black">{editingUser ? "Edit User" : "Add User"}</h2>
            <p className={`text-sm ${isDarkMode ? "text-neutral-400" : "text-neutral-500"}`}>
              {editingUser ? "Update account profile." : "Create a new manager account with a temporary password."}
            </p>
          </div>
          <button onClick={onClose} className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${isDarkMode ? "hover:bg-neutral-700" : "hover:bg-neutral-100"}`}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="p-6 space-y-4">
          <FormField label="Full Name" isDarkMode={isDarkMode}>
            <input
              type="text"
              required
              className={inputClass(isDarkMode)}
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </FormField>

          <FormField label="Username" isDarkMode={isDarkMode}>
            <input
              type="text"
              required
              className={inputClass(isDarkMode)}
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
            />
          </FormField>

          {!editingUser && (
            <FormField label="Temporary Password" isDarkMode={isDarkMode}>
              <input
                type="password"
                required
                className={inputClass(isDarkMode)}
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              />
            </FormField>
          )}

          <button
            type="submit"
            className="w-full py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white font-bold rounded-xl mt-2 hover:from-orange-600 hover:to-orange-700 transition-all shadow-lg active:scale-95"
          >
            {editingUser ? "Update User" : "Create User"}
          </button>
        </form>
      </div>
    </div>
  );
}

function ConfirmDeleteModal({ user, isDarkMode, onCancel, onConfirm }) {
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
      <div className={`rounded-2xl shadow-2xl max-w-md w-full p-6 animate-in zoom-in duration-300 ${isDarkMode ? "bg-neutral-800" : "bg-white"}`}>
        <div className="mb-6">
          <div className="w-16 h-16 bg-rose-100 dark:bg-rose-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-8 h-8 text-rose-600" />
          </div>
          <h3 className={`text-2xl font-bold mb-2 text-center ${isDarkMode ? "text-white" : "text-neutral-800"}`}>Delete User</h3>
          <p className={`text-center ${isDarkMode ? "text-neutral-400" : "text-neutral-600"}`}>
            Are you sure you want to delete <span className="font-semibold">"{user.name}"</span>?
          </p>
          <p className={`text-sm text-center mt-2 ${isDarkMode ? "text-neutral-500" : "text-neutral-500"}`}>This action cannot be undone.</p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className={`flex-1 px-6 py-3 border-2 rounded-xl font-semibold transition-colors ${isDarkMode ? "border-neutral-600 text-neutral-300 hover:bg-neutral-700" : "border-neutral-300 text-neutral-700 hover:bg-neutral-50"}`}
          >
            Cancel
          </button>
          <button onClick={onConfirm} className="flex-1 px-6 py-3 bg-rose-600 text-white rounded-xl font-semibold hover:bg-rose-700 transition-colors">
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

function ResetPasswordModal({ user, newPassword, setNewPassword, isDarkMode, onCancel, onConfirm }) {
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
      <div className={`rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-in zoom-in duration-300 ${isDarkMode ? "bg-neutral-800" : "bg-white"}`}>
        <div className={`p-6 border-b flex items-center justify-between ${isDarkMode ? "border-neutral-700" : "border-neutral-100"}`}>
          <div>
            <h3 className={`text-xl font-black ${isDarkMode ? "text-white" : "text-neutral-800"}`}>Reset Password</h3>
            <p className={`text-sm ${isDarkMode ? "text-neutral-400" : "text-neutral-500"}`}>Set a new temporary password.</p>
          </div>
          <button onClick={onCancel} className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${isDarkMode ? "text-neutral-400 hover:bg-neutral-700 hover:text-white" : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-800"}`}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          <div className={`rounded-xl border p-4 mb-5 ${isDarkMode ? "bg-neutral-900/35 border-neutral-700" : "bg-neutral-50 border-neutral-100"}`}>
            <p className={`text-lg font-bold ${isDarkMode ? "text-white" : "text-neutral-800"}`}>{user.name}</p>
            <p className={`text-sm ${isDarkMode ? "text-neutral-400" : "text-neutral-600"}`}>@{user.username}</p>
          </div>

          <FormField label="New Temporary Password" isDarkMode={isDarkMode}>
            <input
              type="password"
              placeholder="Enter new password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className={inputClass(isDarkMode)}
              autoFocus
            />
          </FormField>
          <p className={`text-xs mt-2 ${isDarkMode ? "text-neutral-500" : "text-neutral-500"}`}>
            User will be required to change this password on next login.
          </p>

          <div className="flex gap-3 mt-6">
            <button
              onClick={onCancel}
              className={`flex-1 px-4 py-3 border-2 rounded-xl font-semibold transition-colors ${isDarkMode ? "border-neutral-600 text-neutral-300 hover:bg-neutral-700" : "border-neutral-300 text-neutral-700 hover:bg-neutral-50"}`}
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              className="flex-1 px-4 py-3 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white rounded-xl font-semibold transition-colors"
            >
              Reset
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function FormField({ label, isDarkMode, children }) {
  return (
    <label className="block">
      <span className={`block text-sm font-semibold mb-2 ${isDarkMode ? "text-neutral-300" : "text-neutral-700"}`}>{label}</span>
      {children}
    </label>
  );
}

const inputClass = (isDarkMode) =>
  `w-full px-4 py-3 rounded-xl border-2 transition-colors focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 ${
    isDarkMode
      ? "bg-neutral-900/60 border-neutral-700 text-white placeholder-neutral-500"
      : "bg-neutral-50 border-neutral-200 text-neutral-800 placeholder-neutral-400"
  }`;

export default UserManagement;
