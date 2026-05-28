import { useEffect, useState } from "react";
import { X, Plus, CreditCard, Wallet, Trash2, TrendingUp, Users, AlertCircle, History, Receipt, ArrowUpRight, ArrowDownRight, AlertTriangle, Search, UserPlus, Eye, Edit2, CheckCircle, ArrowUpDown, ChevronDown, RotateCcw, Archive, Package, Image as ImageIcon, Tag, Barcode } from "lucide-react";
import { useDarkMode } from "./contexts/DarkModeContext";
import { apiUrl } from "./config/api";

const DASHBOARD_API = apiUrl("/dashboard");
const CUSTOMER_API  = apiUrl("/customers");
const UTANG_API     = apiUrl("/utang");

const formatCurrency = (value) =>
  new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value) || 0);

const formatDate = (value) => {
  if (!value) return "Unknown";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown";
  return date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
};

function Dashboard({ setToken }) {
  const { isDarkMode } = useDarkMode();
  const [customers, setCustomers]               = useState([]);
  const [name, setName]                         = useState("");
  const [fullName, setFullName]                 = useState("");
  const [creditLimit, setCreditLimit]           = useState("");
  const [loading, setLoading]                   = useState(true);
  const [showModal, setShowModal]               = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [amount, setAmount]                     = useState("");
  const [notification, setNotification]         = useState(null);
  const [searchTerm, setSearchTerm]             = useState("");
  const [filterStatus, setFilterStatus]         = useState("all");   // 'all' | 'owing' | 'paid'
  const [sortBy, setSortBy]                     = useState("balance-desc"); // 'balance-desc' | 'balance-asc' | 'name'
  const [showSortMenu, setShowSortMenu]         = useState(false);

  const [history, setHistory]                         = useState([]);
  const [showHistoryModal, setShowHistoryModal]       = useState(false);
  const [historyLoading, setHistoryLoading]           = useState(false);
  const [showCustomerDetail, setShowCustomerDetail]   = useState(false);
  const [customerDetailData, setCustomerDetailData]   = useState(null);
  const [showDeleteModal, setShowDeleteModal]         = useState(false);
  const [customerToDelete, setCustomerToDelete]       = useState(null);
  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false);
  const [showEditCustomerModal, setShowEditCustomerModal] = useState(false);
  const [customerToEdit, setCustomerToEdit] = useState(null);
  const [editCustomerForm, setEditCustomerForm] = useState({ name: "", fullName: "", creditLimit: "" });

  // Archived customers
  const [showArchived, setShowArchived] = useState(false);
  const [archivedCustomers, setArchivedCustomers] = useState([]);
  const [archivedLoading, setArchivedLoading] = useState(false);
  const [archivedSearch, setArchivedSearch] = useState("");
  const [confirmDeleteArchived, setConfirmDeleteArchived] = useState(null);
  const [confirmRestoreArchived, setConfirmRestoreArchived] = useState(null);

  const loadDashboard = async () => {
    try {
      const res = await fetch(DASHBOARD_API, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      if (res.status === 403) {
        const data = await res.json();
        showNotification(data.message || "You need to be assigned to a manager. Please contact your administrator.", "error");
        setCustomers([]);
        setLoading(false);
        return;
      }
      const data = await res.json();
      setCustomers(Array.isArray(data) ? data : []);
    } catch (err) {
      setCustomers([]);
      showNotification("Failed to load customers", "error");
    } finally {
      setLoading(false);
    }
  };

  const loadCustomerHistory = async (customerId) => {
    setHistoryLoading(true);
    try {
      const res = await fetch(`${UTANG_API}/${customerId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      if (!res.ok) throw new Error("Failed to load history");
      const data = await res.json();
      setHistory(Array.isArray(data) ? data : []);
    } catch (err) {
      showNotification("Failed to load transaction history", "error");
      setHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  const showNotification = (message, type = "success") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const addCustomer = async (e) => {
    e.preventDefault();
    const trimmedName     = name.trim();
    const trimmedFullName = fullName.trim();
    if (!trimmedName)     { showNotification("Please enter a customer name", "error"); return; }
    if (!trimmedFullName) { showNotification("Please enter customer's full name", "error"); return; }
    if (creditLimit === "" || Number(creditLimit) <= 0) { showNotification("Please enter a credit limit", "error"); return; }

    try {
      const token = localStorage.getItem("token");
      if (!token) { showNotification("Session expired. Please login again.", "error"); return; }

      const response = await fetch(CUSTOMER_API, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          name: trimmedName,
          fullName: trimmedFullName,
          creditLimit: creditLimit !== "" ? Number(creditLimit) : 0,
        }),
      });

      if (response.status === 401) { showNotification("Session expired. Please login again.", "error"); return; }
      if (response.status === 403) {
        const errorData = await response.json();
        showNotification(errorData.message || "You don't have permission to add customers", "error");
        return;
      }
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Request failed: ${response.status}`);
      }

      setName(""); setFullName(""); setCreditLimit("");
      setShowAddCustomerModal(false);
      await loadDashboard();
      showNotification(`Customer "${trimmedName}" added successfully!`);
    } catch (err) {
      showNotification(err.message || "Failed to add customer", "error");
    }
  };

  const openModal = (customer) => {
    setSelectedCustomer(customer);
    setShowModal(true);
    setAmount("");
  };

  const openCustomerDetail = async (customer) => {
    setSelectedCustomer(customer);
    setShowCustomerDetail(true);
    await loadCustomerHistory(customer._id);
  };

  const openDeleteModal = (customer) => {
    setCustomerToDelete(customer);
    setShowDeleteModal(true);
  };

  const openEditCustomerModal = (customer) => {
    setCustomerToEdit(customer);
    setEditCustomerForm({
      name: customer?.name || "",
      fullName: customer?.fullName || "",
      creditLimit: customer?.creditLimit ?? "",
    });
    setShowEditCustomerModal(true);
  };

  const updateCustomerInfo = async (e) => {
    e.preventDefault();
    if (!customerToEdit) return;

    const trimmedName = editCustomerForm.name.trim();
    const trimmedFullName = editCustomerForm.fullName.trim();
    if (!trimmedName) { showNotification("Please enter a customer name", "error"); return; }
    if (!trimmedFullName) { showNotification("Please enter customer's full name", "error"); return; }

    try {
      const response = await fetch(`${CUSTOMER_API}/${customerToEdit._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("token")}` },
        body: JSON.stringify({
          name: trimmedName,
          fullName: trimmedFullName,
          creditLimit: editCustomerForm.creditLimit !== "" ? Number(editCustomerForm.creditLimit) : 0,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to update customer");
      }

      const updated = await response.json();
      setCustomers(prev => prev.map(c => c._id === updated._id ? { ...c, ...updated } : c));
      if (selectedCustomer?._id === updated._id) {
        setSelectedCustomer(prev => ({ ...prev, ...updated }));
      }
      setShowEditCustomerModal(false);
      setCustomerToEdit(null);
      showNotification(`Customer "${updated.name}" updated successfully`);
      await loadDashboard();
    } catch (err) {
      showNotification(err.message || "Failed to update customer", "error");
    }
  };

  const handleModalSubmit = async (e) => {
    e.preventDefault();
    const numAmount = Number(amount);
    if (!amount || isNaN(numAmount) || numAmount <= 0) {
      showNotification("Please enter a valid positive amount", "error");
      return;
    }
    if (numAmount > selectedCustomer.balance) {
      showNotification(
        `Payment amount (₱${numAmount.toFixed(2)}) cannot exceed customer balance (₱${selectedCustomer.balance.toFixed(2)})`,
        "error"
      );
      return;
    }

    const customerId = selectedCustomer._id;
    try {
      const response = await fetch(UTANG_API, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("token")}` },
        body: JSON.stringify({ customerId, amount: numAmount, type: "payment" }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to record payment");
      }

      await loadDashboard();
      showNotification(`Recorded payment of ₱${numAmount.toFixed(2)}`);
      setShowModal(false);
      setAmount("");

      if (showCustomerDetail) {
        await loadCustomerHistory(customerId);
        const dashRes = await fetch(DASHBOARD_API, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        });
        if (dashRes.ok) {
          const dashData = await dashRes.json();
          const updatedCustomer = dashData.find(c => c._id === customerId);
          if (updatedCustomer) setSelectedCustomer(updatedCustomer);
        }
      }
    } catch (err) {
      showNotification(err.message, "error");
    }
  };

  const deleteCustomer = async () => {
    try {
      const response = await fetch(`${CUSTOMER_API}/${customerToDelete._id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to delete customer");
      }
      loadDashboard();
      showNotification(`Customer "${customerToDelete.name}" deleted successfully`);
      setShowDeleteModal(false);
      setCustomerToDelete(null);
      if (showCustomerDetail) setShowCustomerDetail(false);
    } catch (err) {
      showNotification(err.message, "error");
    }
  };

  const updateCreditLimit = async (customerId, newLimit) => {
    try {
      const response = await fetch(`${CUSTOMER_API}/${customerId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("token")}` },
        body: JSON.stringify({ creditLimit: newLimit }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to update credit limit");
      }
      const updated = await response.json();
      setCustomers(prev => prev.map(c => c._id === customerId ? { ...c, creditLimit: updated.creditLimit } : c));
      if (selectedCustomer?._id === customerId) {
        setSelectedCustomer(prev => ({ ...prev, creditLimit: updated.creditLimit }));
      }
      showNotification("Credit limit updated successfully!");
      return true;
    } catch (err) {
      showNotification(err.message, "error");
      return false;
    }
  };

  const handleAmountChange = (e) => {
    const value = e.target.value;
    if (value === "" || (!isNaN(value) && Number(value) >= 0)) setAmount(value);
  };

  const loadArchivedCustomers = async () => {
    setArchivedLoading(true);
    try {
      const res = await fetch(`${CUSTOMER_API}/archived`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      if (!res.ok) throw new Error("Failed to load archived customers");
      const data = await res.json();
      setArchivedCustomers(Array.isArray(data) ? data : []);
    } catch {
      showNotification("Failed to load archived customers", "error");
      setArchivedCustomers([]);
    } finally {
      setArchivedLoading(false);
    }
  };

  const restoreArchivedCustomer = async (customer) => {
    try {
      const res = await fetch(`${CUSTOMER_API}/${customer._id}/restore`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to restore");
      }
      setArchivedCustomers((prev) => prev.filter((c) => c._id !== customer._id));
      showNotification(`"${customer.name}" restored successfully`);
    } catch (err) {
      showNotification(err.message, "error");
    }
  };

  const permanentDeleteArchivedCustomer = async (customer) => {
    try {
      const res = await fetch(`${CUSTOMER_API}/${customer._id}/permanent`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to delete");
      }
      setArchivedCustomers((prev) => prev.filter((c) => c._id !== customer._id));
      setConfirmDeleteArchived(null);
      showNotification(`"${customer.name}" permanently deleted`);
    } catch (err) {
      showNotification(err.message, "error");
    }
  };

  useEffect(() => { loadDashboard(); }, []);

  useEffect(() => {
    if (showArchived) loadArchivedCustomers();
  }, [showArchived]);

  // Derived stats
  const totalCreditors   = customers.filter(c => c.balance > 0).length;
  const totalPaid        = customers.filter(c => c.balance <= 0).length;
  const totalOutstanding = customers.reduce((sum, c) => sum + c.balance, 0);

  // Filter → sort
  const SORT_LABELS = { "balance-desc": "Balance: High → Low", "balance-asc": "Balance: Low → High", "name": "Name: A → Z" };

  const visibleCustomers = customers
    .filter(c =>
      (c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
       c.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
       c.customerId?.toLowerCase().includes(searchTerm.toLowerCase()))
    )
    .filter(c => {
      if (filterStatus === "owing") return c.balance > 0;
      if (filterStatus === "paid")  return c.balance <= 0;
      return true;
    })
    .sort((a, b) => {
      if (sortBy === "balance-desc") return b.balance - a.balance;
      if (sortBy === "balance-asc")  return a.balance - b.balance;
      return a.name.localeCompare(b.name);
    });

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${isDarkMode ? "bg-neutral-900" : "bg-neutral-50"}`}>
        <div className="text-center">
          <div className="w-14 h-14 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className={`text-sm font-medium ${isDarkMode ? "text-neutral-400" : "text-neutral-500"}`}>Loading credit management...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen pb-20 transition-colors duration-300 ${isDarkMode ? "bg-neutral-900" : "bg-neutral-50"}`}>

      {/* ── Header ─────────────────────────────────────────── */}
      <div className={`pt-8 pb-10 px-4 sm:px-6 lg:px-8 ${isDarkMode ? "bg-neutral-800/50" : "bg-white shadow-sm"}`}>
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row lg:items-end justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className={`p-3 rounded-2xl flex-shrink-0 ${isDarkMode ? "bg-orange-900/30" : "bg-orange-100"}`}>
              <Users className="w-8 h-8 text-orange-600" />
            </div>
            <div>
              <h1 className={`text-3xl sm:text-4xl font-black tracking-tight ${isDarkMode ? "text-white" : "text-neutral-900"}`}>
                Credit <span className="text-orange-600">Management</span>
              </h1>
              <p className="hidden">
              {customers.length} customer{customers.length !== 1 ? "s" : ""} · ₱{totalOutstanding.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} outstanding
            </p>
              <p className={`text-base sm:text-lg font-medium mt-1 ${isDarkMode ? "text-neutral-400" : "text-neutral-600"}`}>
                Monitor customer balances, credit limits, and payment activity.
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowAddCustomerModal(true)}
            className="flex items-center justify-center gap-2 bg-gradient-to-r from-orange-500 to-orange-600 text-white px-6 py-3 rounded-2xl font-bold shadow-lg hover:shadow-orange-500/25 hover:from-orange-600 hover:to-orange-700 active:scale-95 transition-all"
          >
            <UserPlus className="w-5 h-5" />
            Add Customer
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8 space-y-6">

        {/* ── View Toggle ─────────────────────────────────────── */}
        <div className={`flex items-center gap-1 p-1 rounded-xl border w-fit ${isDarkMode ? "bg-neutral-900/60 border-neutral-700" : "bg-neutral-100 border-neutral-200"}`}>
          <button
            onClick={() => setShowArchived(false)}
            className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold transition-all ${!showArchived ? "bg-orange-500 text-white shadow-sm" : isDarkMode ? "text-neutral-400 hover:text-white" : "text-neutral-600 hover:text-neutral-800"}`}
          >
            <Users className="w-4 h-4" />
            Active
          </button>
          <button
            onClick={() => setShowArchived(true)}
            className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold transition-all ${showArchived ? "bg-orange-500 text-white shadow-sm" : isDarkMode ? "text-neutral-400 hover:text-white" : "text-neutral-600 hover:text-neutral-800"}`}
          >
            <Archive className="w-4 h-4" />
            Archived
          </button>
        </div>

        {/* ── Archived Customers View ─────────────────────────── */}
        {showArchived && (
          <div>
            <div className={`rounded-2xl border p-4 mb-8 shadow-sm ${isDarkMode ? "bg-neutral-800 border-neutral-700" : "bg-white border-neutral-200"}`}>
              <div className="relative group">
                <Search className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 transition-colors ${isDarkMode ? "text-neutral-500 group-focus-within:text-orange-500" : "text-neutral-400 group-focus-within:text-orange-500"}`} />
                <input
                  type="text"
                  placeholder="Search archived customers by name, full name, or ID..."
                  value={archivedSearch}
                  onChange={(e) => setArchivedSearch(e.target.value)}
                  className={`w-full pl-12 pr-4 py-3.5 rounded-xl border-2 focus:outline-none focus:border-orange-500 transition-all text-base ${isDarkMode ? "bg-neutral-900/60 border-neutral-700 text-white placeholder-neutral-500" : "bg-neutral-50 border-neutral-200 text-neutral-800 placeholder-neutral-400"}`}
                />
              </div>
            </div>

            {archivedLoading ? (
              <div className="flex items-center justify-center py-20">
                <div className="text-center">
                  <div className="w-14 h-14 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                  <p className={`font-medium ${isDarkMode ? "text-neutral-400" : "text-neutral-600"}`}>Loading archived customers...</p>
                </div>
              </div>
            ) : (() => {
              const filtered = archivedCustomers.filter((c) => {
                const q = archivedSearch.trim().toLowerCase();
                return !q || c.name?.toLowerCase().includes(q) || c.fullName?.toLowerCase().includes(q) || c.customerId?.toLowerCase().includes(q);
              });
              return filtered.length === 0 ? (
                <div className={`text-center py-20 rounded-3xl border-2 border-dashed ${isDarkMode ? "border-neutral-800 bg-neutral-800/30" : "border-neutral-200 bg-white"}`}>
                  <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 ${isDarkMode ? "bg-neutral-700" : "bg-neutral-100"}`}>
                    <Archive className="w-10 h-10 text-neutral-400" />
                  </div>
                  <h3 className={`text-2xl font-bold mb-2 ${isDarkMode ? "text-white" : "text-neutral-800"}`}>
                    {archivedCustomers.length === 0 ? "No archived customers" : "No results found"}
                  </h3>
                  <p className={isDarkMode ? "text-neutral-400" : "text-neutral-600"}>
                    {archivedCustomers.length === 0 ? "Customers you archive will appear here." : "Try a different search term."}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filtered.map((customer) => (
                    <ArchivedCustomerCard
                      key={customer._id}
                      customer={customer}
                      isDarkMode={isDarkMode}
                      onRestore={() => setConfirmRestoreArchived(customer)}
                      onDelete={() => setConfirmDeleteArchived(customer)}
                    />
                  ))}
                </div>
              );
            })()}
          </div>
        )}

        {!showArchived && <>
        {/* ── Stat Cards ─────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <KPICard label="Total Customers" value={customers.length} sub="registered accounts" icon={Users} color="orange" isDarkMode={isDarkMode} />
          <KPICard label="With Balance" value={totalCreditors} sub="active creditors" icon={AlertCircle} color="rose" isDarkMode={isDarkMode} />
          <KPICard label="Fully Paid" value={totalPaid} sub="settled accounts" icon={CheckCircle} color="emerald" isDarkMode={isDarkMode} />
          <KPICard
            label="Total Outstanding"
            value={`₱${totalOutstanding.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            sub="across all customers"
            icon={TrendingUp}
            color="blue"
            isDarkMode={isDarkMode}
          />
        </div>

        {/* ── Search + Filter + Sort ─────────────────────────── */}
        <div className={`rounded-2xl border p-4 shadow-sm ${isDarkMode ? "bg-neutral-800 border-neutral-700" : "bg-white border-neutral-200"}`}>
          {/* Search */}
          <div className="relative mb-4 group">
            <Search className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 transition-colors ${isDarkMode ? "text-neutral-500 group-focus-within:text-orange-500" : "text-neutral-400 group-focus-within:text-orange-500"}`} />
            <input
              type="text"
              placeholder="Search by name, full name, or ID…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`w-full pl-12 pr-4 py-3.5 rounded-xl border-2 focus:outline-none focus:border-orange-500 text-base transition-all ${
                isDarkMode ? "bg-neutral-900/60 border-neutral-700 text-white placeholder-neutral-500" : "bg-neutral-50 border-neutral-200 text-neutral-800 placeholder-neutral-400"
              }`}
            />
          </div>

          {/* Filter chips + Sort */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div className={`flex rounded-xl p-1 border overflow-x-auto ${isDarkMode ? "bg-neutral-900/60 border-neutral-700" : "bg-neutral-50 border-neutral-200"}`}>
              {[
                { key: "all",   label: "All",          count: customers.length  },
                { key: "owing", label: "With Balance",  count: totalCreditors   },
                { key: "paid",  label: "Fully Paid",    count: totalPaid        },
              ].map(({ key, label, count }) => (
                <button
                  key={key}
                  onClick={() => setFilterStatus(key)}
                  className={`px-3 sm:px-4 py-2 rounded-lg text-sm font-semibold transition-all whitespace-nowrap ${
                    filterStatus === key
                      ? "bg-orange-500 text-white shadow-sm"
                      : isDarkMode
                      ? "text-neutral-400 hover:text-white"
                      : "text-neutral-600 hover:text-neutral-900"
                  }`}
                >
                  {label} <span className={`ml-1 ${filterStatus === key ? "opacity-80" : "opacity-50"}`}>({count})</span>
                </button>
              ))}
            </div>

            {/* Sort dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowSortMenu(v => !v)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border transition-all ${
                  isDarkMode ? "bg-neutral-900/60 border-neutral-700 text-neutral-300 hover:border-orange-500 hover:text-orange-400" : "bg-neutral-50 border-neutral-200 text-neutral-600 hover:border-orange-400 hover:text-orange-600"
                }`}
              >
                <ArrowUpDown className="w-3.5 h-3.5" />
                {SORT_LABELS[sortBy]}
                <ChevronDown className={`w-3 h-3 transition-transform ${showSortMenu ? "rotate-180" : ""}`} />
              </button>
              {showSortMenu && (
                <div className={`absolute right-0 top-full mt-1 rounded-xl border shadow-xl z-20 overflow-hidden min-w-[180px] ${isDarkMode ? "bg-neutral-800 border-neutral-700" : "bg-white border-neutral-200"}`}>
                  {Object.entries(SORT_LABELS).map(([key, label]) => (
                    <button
                      key={key}
                      onClick={() => { setSortBy(key); setShowSortMenu(false); }}
                      className={`w-full text-left px-4 py-2.5 text-xs font-semibold transition-colors ${
                        sortBy === key
                          ? "bg-orange-500 text-white"
                          : isDarkMode ? "text-neutral-300 hover:bg-neutral-700" : "text-neutral-700 hover:bg-neutral-50"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Customer Grid ──────────────────────────────────── */}
        {visibleCustomers.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {visibleCustomers.map((customer) => (
              <CustomerCard
                key={customer._id}
                customer={customer}
                isDarkMode={isDarkMode}
                onViewDetails={() => openCustomerDetail(customer)}
                onEdit={(e) => { e.stopPropagation(); openEditCustomerModal(customer); }}
                onRecordPayment={(e) => { e.stopPropagation(); openModal(customer); }}
                onArchive={() => openDeleteModal(customer)}
              />
            ))}
          </div>
        ) : (
          <div className={`text-center py-16 rounded-2xl border-2 border-dashed ${isDarkMode ? "border-neutral-800 bg-neutral-800/30" : "border-neutral-200 bg-white"}`}>
            <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${isDarkMode ? "bg-neutral-700" : "bg-neutral-100"}`}>
              {customers.length === 0 ? (
                <Users className="w-8 h-8 text-neutral-400" />
              ) : (
                <Search className="w-8 h-8 text-neutral-400" />
              )}
            </div>
            <h3 className={`text-lg font-bold mb-1 ${isDarkMode ? "text-white" : "text-neutral-800"}`}>
              {customers.length === 0 ? "No customers yet" : "No customers found"}
            </h3>
            <p className={`text-sm ${isDarkMode ? "text-neutral-400" : "text-neutral-500"}`}>
              {customers.length === 0
                ? "Add your first customer to get started"
                : "Try adjusting your search or filter"}
            </p>
            {customers.length === 0 && (
              <button
                onClick={() => setShowAddCustomerModal(true)}
                className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold rounded-xl transition-all"
              >
                <UserPlus className="w-4 h-4" />
                Add First Customer
              </button>
            )}
          </div>
        )}
        </> }
      </div>

      {/* ── Modals ─────────────────────────────────────────── */}
      {showAddCustomerModal && (
        <AddCustomerModal
          name={name} fullName={fullName} creditLimit={creditLimit}
          isDarkMode={isDarkMode}
          onNameChange={(e) => setName(e.target.value)}
          onFullNameChange={(e) => setFullName(e.target.value)}
          onCreditLimitChange={(e) => setCreditLimit(e.target.value)}
          onSubmit={addCustomer}
          onClose={() => { setShowAddCustomerModal(false); setName(""); setFullName(""); setCreditLimit(""); }}
        />
      )}

      {showEditCustomerModal && customerToEdit && (
        <EditCustomerModal
          form={editCustomerForm}
          isDarkMode={isDarkMode}
          onChange={setEditCustomerForm}
          onSubmit={updateCustomerInfo}
          onClose={() => { setShowEditCustomerModal(false); setCustomerToEdit(null); }}
        />
      )}

      {showModal && (
        <PaymentModal
          customer={selectedCustomer} amount={amount}
          isDarkMode={isDarkMode}
          onAmountChange={handleAmountChange}
          onSubmit={handleModalSubmit}
          onClose={() => setShowModal(false)}
        />
      )}

      {showCustomerDetail && (
        <CustomerDetailModal
          customer={selectedCustomer} history={history} historyLoading={historyLoading}
          isDarkMode={isDarkMode}
          onClose={() => setShowCustomerDetail(false)}
          onUpdateCreditLimit={updateCreditLimit}
          onEdit={() => openEditCustomerModal(selectedCustomer)}
          onRecordPayment={() => { setShowCustomerDetail(false); openModal(selectedCustomer); }}
          onDelete={() => { openDeleteModal(selectedCustomer); }}
        />
      )}

      {showDeleteModal && (
        <DeleteConfirmationModal
          customer={customerToDelete}
          isDarkMode={isDarkMode}
          onConfirm={deleteCustomer}
          onCancel={() => { setShowDeleteModal(false); setCustomerToDelete(null); }}
        />
      )}

      {/* ── Restore Confirmation ───────────────────────────── */}
      {confirmRestoreArchived && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className={`rounded-2xl shadow-2xl max-w-md w-full p-6 animate-in zoom-in duration-300 ${isDarkMode ? "bg-neutral-800" : "bg-white"}`}>
            <div className="mb-6 text-center">
              <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${isDarkMode ? "bg-orange-900/30" : "bg-orange-100"}`}>
                <RotateCcw className="w-8 h-8 text-orange-600" />
              </div>
              <h3 className={`text-xl font-bold mb-2 ${isDarkMode ? "text-white" : "text-neutral-800"}`}>
                Restore Customer?
              </h3>
              <p className={isDarkMode ? "text-neutral-400" : "text-neutral-600"}>
                <span className="font-semibold">"{confirmRestoreArchived.name}"</span> will be moved back to active customers.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmRestoreArchived(null)}
                className={`flex-1 px-5 py-3 border-2 rounded-xl font-semibold transition-all active:scale-95 ${isDarkMode ? "border-neutral-600 text-neutral-300 hover:bg-neutral-700" : "border-neutral-300 text-neutral-700 hover:bg-neutral-50"}`}
              >
                Cancel
              </button>
              <button
                onClick={() => { restoreArchivedCustomer(confirmRestoreArchived); setConfirmRestoreArchived(null); }}
                className="flex-1 px-5 py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-xl font-semibold hover:from-orange-600 hover:to-orange-700 transition-all shadow-md active:scale-95 flex items-center justify-center gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                Restore
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Permanent Delete Confirmation ──────────────────── */}
      {confirmDeleteArchived && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className={`rounded-2xl shadow-2xl max-w-md w-full p-6 animate-in zoom-in duration-300 ${isDarkMode ? "bg-neutral-800" : "bg-white"}`}>
            <div className="mb-6 text-center">
              <div className="w-16 h-16 bg-rose-100 dark:bg-rose-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-8 h-8 text-rose-600" />
              </div>
              <h3 className={`text-xl font-bold mb-2 ${isDarkMode ? "text-white" : "text-neutral-800"}`}>
                Permanently Delete?
              </h3>
              <p className={isDarkMode ? "text-neutral-400" : "text-neutral-600"}>
                This will permanently delete <span className="font-semibold">"{confirmDeleteArchived.name}"</span> and all their transaction history. This cannot be undone.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDeleteArchived(null)}
                className={`flex-1 px-5 py-3 border-2 rounded-xl font-semibold transition-all active:scale-95 ${isDarkMode ? "border-neutral-600 text-neutral-300 hover:bg-neutral-700" : "border-neutral-300 text-neutral-700 hover:bg-neutral-50"}`}
              >
                Cancel
              </button>
              <button
                onClick={() => permanentDeleteArchivedCustomer(confirmDeleteArchived)}
                className="flex-1 px-5 py-3 bg-rose-600 text-white rounded-xl font-semibold hover:bg-rose-700 transition-all active:scale-95"
              >
                Delete Forever
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Toast ──────────────────────────────────────────── */}
      {notification && (
        <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom duration-300">
          <div className={`px-5 py-3.5 rounded-xl shadow-2xl flex items-center gap-3 ${
            notification.type === "error" ? "bg-rose-600 text-white" : "bg-emerald-600 text-white"
          }`}>
            <span className="flex-1 text-sm font-medium">{notification.message}</span>
            <button onClick={() => setNotification(null)} className="opacity-75 hover:opacity-100 transition-opacity">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── KPI Card ──────────────────────────────────────────────── */
const KPI_COLORS = {
  blue:    { bg: "bg-blue-100 dark:bg-blue-900/30",     icon: "text-blue-600"    },
  rose:    { bg: "bg-rose-100 dark:bg-rose-900/30",     icon: "text-rose-600"    },
  emerald: { bg: "bg-emerald-100 dark:bg-emerald-900/30", icon: "text-emerald-600" },
  orange:  { bg: "bg-orange-100 dark:bg-orange-900/30", icon: "text-orange-600"  },
};

function KPICard({ label, value, sub, icon: Icon, color, isDarkMode }) {
  const c = KPI_COLORS[color];
  const displayValue =
    typeof value === "string" && value.includes("â")
      ? formatCurrency(Number(value.replace(/[^\d.-]/g, "")))
      : value;

  return (
    <div className={`rounded-2xl border p-5 shadow-sm transition-all ${isDarkMode ? "bg-neutral-800 border-neutral-700" : "bg-white border-neutral-200"}`}>
      <div className="flex items-center gap-3">
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${c.bg}`}>
          <Icon className={`w-5 h-5 ${c.icon}`} />
        </div>
        <div className="min-w-0">
          <p className={`text-xs font-bold uppercase tracking-wide ${isDarkMode ? "text-neutral-500" : "text-neutral-500"}`}>{label}</p>
          <p className={`font-black truncate text-2xl ${isDarkMode ? "text-white" : "text-neutral-900"}`}>{displayValue}</p>
          {sub && <p className={`text-xs mt-0.5 ${isDarkMode ? "text-neutral-500" : "text-neutral-500"}`}>{sub}</p>}
        </div>
      </div>
    </div>
  );
}

/* ── Customer Card ─────────────────────────────────────────── */
function getInitials(name = "") {
  return name.trim().split(/\s+/).map(w => w[0]).slice(0, 2).join("").toUpperCase();
}

function CustomerCard({ customer, isDarkMode, onViewDetails, onEdit, onRecordPayment, onArchive }) {
  const hasBalance = customer.balance > 0;
  const usagePct   = customer.creditLimit > 0
    ? Math.min((customer.balance / customer.creditLimit) * 100, 100)
    : 0;
  const barColor   = usagePct >= 90 ? "bg-rose-500" : usagePct >= 70 ? "bg-orange-500" : "bg-emerald-500";
  const status = hasBalance ? "Owing" : "Settled";

  return (
    <div
      className={`rounded-2xl border overflow-hidden shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all cursor-pointer group ${
        isDarkMode ? "bg-neutral-800 border-neutral-700 hover:border-orange-500/60" : "bg-white border-neutral-200 hover:border-orange-300"
      }`}
      onClick={onViewDetails}
    >
      <div className={`h-1.5 ${hasBalance ? "bg-rose-500" : "bg-emerald-500"}`} />
      <div className="p-5">
      {/* Top row */}
      <div className="flex items-start gap-3 mb-4">
        {/* Avatar */}
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center font-bold text-sm flex-shrink-0 ${
          hasBalance
            ? "bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400"
            : "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400"
        }`}>
          {getInitials(customer.name)}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className={`font-bold truncate ${isDarkMode ? "text-white" : "text-neutral-900"}`}>{customer.name}</h3>
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${hasBalance ? "bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400" : "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400"}`}>
              {status}
            </span>
          </div>
          <p className={`text-xs truncate mt-0.5 ${isDarkMode ? "text-neutral-400" : "text-neutral-500"}`}>
            {customer.fullName || "—"}
          </p>
          <p className={`text-xs font-mono mt-0.5 ${isDarkMode ? "text-neutral-600" : "text-neutral-400"}`}>
            {customer.customerId}
          </p>
        </div>
      </div>

      {/* Balance */}
      <div className={`rounded-xl p-3 mb-4 ${
        hasBalance
          ? isDarkMode ? "bg-rose-900/20" : "bg-rose-50"
          : isDarkMode ? "bg-emerald-900/20" : "bg-emerald-50"
      }`}>
        <p className={`text-xs font-medium mb-1 ${isDarkMode ? "text-neutral-400" : "text-neutral-500"}`}>Balance</p>
        <p className="hidden">
          ₱{customer.balance.toFixed(2)}
        </p>
        <p className={`text-2xl font-black ${hasBalance ? "text-rose-600" : "text-emerald-600"}`}>
          {formatCurrency(customer.balance)}
        </p>

        {customer.creditLimit > 0 && (
          <div className="mt-2">
            <div className="flex justify-between text-xs mb-1">
              <span className="hidden">
                Limit: ₱{customer.creditLimit.toLocaleString()}
              </span>
              <span className={isDarkMode ? "text-neutral-500" : "text-neutral-400"}>
                Limit: {formatCurrency(customer.creditLimit)}
              </span>
              <span className={`font-semibold ${
                usagePct >= 90 ? "text-rose-500" : usagePct >= 70 ? "text-orange-500" : isDarkMode ? "text-emerald-400" : "text-emerald-600"
              }`}>
                {Math.round(usagePct)}%
              </span>
            </div>
            <div className={`h-1.5 rounded-full ${isDarkMode ? "bg-neutral-700" : "bg-neutral-200"}`}>
              <div className={`h-1.5 rounded-full transition-all ${barColor}`} style={{ width: `${usagePct}%` }} />
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={onRecordPayment}
          disabled={!hasBalance}
          className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-1.5 ${
            !hasBalance
              ? isDarkMode ? "bg-neutral-700 text-neutral-500 cursor-not-allowed" : "bg-neutral-100 text-neutral-400 cursor-not-allowed"
              : "bg-emerald-500 hover:bg-emerald-600 text-white shadow-sm hover:shadow active:scale-95"
          }`}
        >
          <Wallet className="w-3.5 h-3.5" />
          {hasBalance ? "Pay" : "Settled"}
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onViewDetails(); }}
          className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all flex items-center gap-1.5 active:scale-95 ${
            isDarkMode ? "bg-neutral-700 text-neutral-300 hover:bg-neutral-600" : "bg-neutral-100 text-neutral-700 hover:bg-neutral-200"
          }`}
        >
          <Eye className="w-3.5 h-3.5" />
          View
        </button>
        <button
          onClick={onEdit}
          className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all flex items-center gap-1.5 active:scale-95 ${
            isDarkMode ? "bg-neutral-700 text-neutral-300 hover:bg-neutral-600" : "bg-neutral-100 text-neutral-700 hover:bg-neutral-200"
          }`}
        >
          <Edit2 className="w-3.5 h-3.5" />
          Edit
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onArchive(); }}
          title="Archive customer"
          className={`px-3 py-2 rounded-xl text-sm font-semibold transition-all flex items-center gap-1.5 active:scale-95 ${
            isDarkMode ? "bg-rose-500/15 text-rose-400 hover:bg-rose-500/25" : "bg-rose-50 text-rose-600 hover:bg-rose-100"
          }`}
        >
          <Archive className="w-3.5 h-3.5" />
        </button>
      </div>
      </div>
    </div>
  );
}

/* ── Add Customer Modal ────────────────────────────────────── */
function AddCustomerModal({ name, fullName, creditLimit, isDarkMode, onNameChange, onFullNameChange, onCreditLimitChange, onSubmit, onClose }) {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-300">
      <div className={`rounded-2xl shadow-2xl max-w-md w-full animate-in zoom-in duration-300 ${isDarkMode ? "bg-neutral-800" : "bg-white"}`}>
        <div className={`p-6 border-b ${isDarkMode ? "border-neutral-700" : "border-neutral-200"}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-xl ${isDarkMode ? "bg-orange-900/30" : "bg-orange-100"}`}>
                <UserPlus className="w-6 h-6 text-orange-600" />
              </div>
              <h3 className={`text-xl font-bold ${isDarkMode ? "text-white" : "text-neutral-800"}`}>Add New Customer</h3>
            </div>
            <button onClick={onClose} className={`p-2 rounded-xl transition-colors ${isDarkMode ? "text-neutral-400 hover:text-white hover:bg-neutral-700" : "text-neutral-600 hover:text-neutral-800 hover:bg-neutral-100"}`}>
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <form onSubmit={onSubmit} className="p-6">
          <div className="space-y-4 mb-6">
            <div>
              <label className={`block text-sm font-medium mb-2 ${isDarkMode ? "text-neutral-300" : "text-neutral-700"}`}>Display Name</label>
              <input type="text" placeholder="e.g., Juan" value={name} onChange={onNameChange} autoFocus
                className={`w-full border-2 px-4 py-3 rounded-xl focus:outline-none focus:border-orange-500 transition-all ${isDarkMode ? "bg-neutral-700 border-neutral-600 text-white placeholder-neutral-400" : "bg-white border-neutral-200 text-neutral-800 placeholder-neutral-500"}`} />
            </div>
            <div>
              <label className={`block text-sm font-medium mb-2 ${isDarkMode ? "text-neutral-300" : "text-neutral-700"}`}>Full Name</label>
              <input type="text" placeholder="e.g., Juan Dela Cruz" value={fullName} onChange={onFullNameChange}
                className={`w-full border-2 px-4 py-3 rounded-xl focus:outline-none focus:border-orange-500 transition-all ${isDarkMode ? "bg-neutral-700 border-neutral-600 text-white placeholder-neutral-400" : "bg-white border-neutral-200 text-neutral-800 placeholder-neutral-500"}`} />
            </div>
            <div>
              <label className={`block text-sm font-medium mb-2 ${isDarkMode ? "text-neutral-300" : "text-neutral-700"}`}>
                Credit Limit
              </label>
              <div className="relative">
                <span className={`absolute left-4 top-1/2 -translate-y-1/2 font-semibold ${isDarkMode ? "text-neutral-400" : "text-neutral-500"}`}>₱</span>
                <input type="number" min="0.01" step="0.01" placeholder="0.00" value={creditLimit} onChange={onCreditLimitChange} required
                  className={`w-full border-2 pl-8 pr-4 py-3 rounded-xl focus:outline-none focus:border-orange-500 transition-all ${isDarkMode ? "bg-neutral-700 border-neutral-600 text-white placeholder-neutral-400" : "bg-white border-neutral-200 text-neutral-800 placeholder-neutral-500"}`} />
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <button type="button" onClick={onClose}
              className={`flex-1 px-6 py-3 border-2 rounded-xl font-semibold transition-all active:scale-95 ${isDarkMode ? "border-neutral-600 text-neutral-300 hover:bg-neutral-700" : "border-neutral-300 text-neutral-700 hover:bg-neutral-50"}`}>
              Cancel
            </button>
            <button type="submit"
              className="flex-1 px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-semibold transition-all flex items-center justify-center gap-2 shadow-lg active:scale-95">
              <Plus className="w-5 h-5" />
              Add Customer
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ── Customer Detail Modal ─────────────────────────────────── */
function EditCustomerModal({ form, isDarkMode, onChange, onSubmit, onClose }) {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[60] animate-in fade-in duration-300">
      <div className={`rounded-2xl shadow-2xl max-w-md w-full animate-in zoom-in duration-300 ${isDarkMode ? "bg-neutral-800" : "bg-white"}`}>
        <div className={`p-6 border-b ${isDarkMode ? "border-neutral-700" : "border-neutral-200"}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-xl ${isDarkMode ? "bg-orange-900/30" : "bg-orange-100"}`}>
                <Edit2 className="w-6 h-6 text-orange-600" />
              </div>
              <h3 className={`text-xl font-bold ${isDarkMode ? "text-white" : "text-neutral-800"}`}>Edit Customer</h3>
            </div>
            <button onClick={onClose} className={`p-2 rounded-xl transition-colors ${isDarkMode ? "text-neutral-400 hover:text-white hover:bg-neutral-700" : "text-neutral-600 hover:text-neutral-800 hover:bg-neutral-100"}`}>
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <form onSubmit={onSubmit} className="p-6">
          <div className="space-y-4 mb-6">
            <div>
              <label className={`block text-sm font-medium mb-2 ${isDarkMode ? "text-neutral-300" : "text-neutral-700"}`}>Display Name</label>
              <input type="text" value={form.name} onChange={(e) => onChange({ ...form, name: e.target.value })} autoFocus
                className={`w-full border-2 px-4 py-3 rounded-xl focus:outline-none focus:border-orange-500 transition-all ${isDarkMode ? "bg-neutral-700 border-neutral-600 text-white placeholder-neutral-400" : "bg-white border-neutral-200 text-neutral-800 placeholder-neutral-500"}`} />
            </div>
            <div>
              <label className={`block text-sm font-medium mb-2 ${isDarkMode ? "text-neutral-300" : "text-neutral-700"}`}>Full Name</label>
              <input type="text" value={form.fullName} onChange={(e) => onChange({ ...form, fullName: e.target.value })}
                className={`w-full border-2 px-4 py-3 rounded-xl focus:outline-none focus:border-orange-500 transition-all ${isDarkMode ? "bg-neutral-700 border-neutral-600 text-white placeholder-neutral-400" : "bg-white border-neutral-200 text-neutral-800 placeholder-neutral-500"}`} />
            </div>
            <div>
              <label className={`block text-sm font-medium mb-2 ${isDarkMode ? "text-neutral-300" : "text-neutral-700"}`}>
                Credit Limit <span className={`font-normal text-xs ${isDarkMode ? "text-neutral-500" : "text-neutral-400"}`}>(optional)</span>
              </label>
              <div className="relative">
                <span className={`absolute left-4 top-1/2 -translate-y-1/2 font-semibold ${isDarkMode ? "text-neutral-400" : "text-neutral-500"}`}>₱</span>
                <input type="number" min="0" step="0.01" value={form.creditLimit} onChange={(e) => onChange({ ...form, creditLimit: e.target.value })}
                  className={`w-full border-2 pl-8 pr-4 py-3 rounded-xl focus:outline-none focus:border-orange-500 transition-all ${isDarkMode ? "bg-neutral-700 border-neutral-600 text-white placeholder-neutral-400" : "bg-white border-neutral-200 text-neutral-800 placeholder-neutral-500"}`} />
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <button type="button" onClick={onClose}
              className={`flex-1 px-6 py-3 border-2 rounded-xl font-semibold transition-all active:scale-95 ${isDarkMode ? "border-neutral-600 text-neutral-300 hover:bg-neutral-700" : "border-neutral-300 text-neutral-700 hover:bg-neutral-50"}`}>
              Cancel
            </button>
            <button type="submit"
              className="flex-1 px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-semibold transition-all flex items-center justify-center gap-2 shadow-lg active:scale-95">
              <Edit2 className="w-5 h-5" />
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function CustomerDetailModal({ customer, history, historyLoading, isDarkMode, onClose, onRecordPayment, onDelete, onEdit, onUpdateCreditLimit }) {
  const [editingLimit, setEditingLimit] = useState(false);
  const [limitInput, setLimitInput]     = useState("");
  const [saving, setSaving]             = useState(false);
  const [historyFilter, setHistoryFilter] = useState("all"); // 'all' | 'credit' | 'payment'

  const handleSaveLimit = async () => {
    const val = Number(limitInput);
    if (isNaN(val) || val < 0) return;
    setSaving(true);
    const ok = await onUpdateCreditLimit(customer._id, val);
    setSaving(false);
    if (ok) setEditingLimit(false);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-300">
      <div className={`rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col animate-in zoom-in duration-300 ${isDarkMode ? "bg-neutral-800" : "bg-white"}`}>
        {/* Header */}
        <div className={`p-6 border-b flex items-center justify-between ${isDarkMode ? "border-neutral-700" : "border-neutral-200"}`}>
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-base flex-shrink-0 ${
              customer?.balance > 0
                ? "bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400"
                : "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400"
            }`}>
              {getInitials(customer?.name)}
            </div>
            <div>
              <h3 className={`text-2xl font-bold ${isDarkMode ? "text-white" : "text-neutral-800"}`}>{customer?.name}</h3>
              <p className={`font-medium text-sm ${isDarkMode ? "text-neutral-400" : "text-neutral-500"}`}>{customer?.fullName}</p>
            </div>
          </div>
          <button onClick={onClose} className={`p-2 rounded-xl transition-colors ${isDarkMode ? "text-neutral-400 hover:text-white hover:bg-neutral-700" : "text-neutral-600 hover:text-neutral-800 hover:bg-neutral-100"}`}>
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className={`p-5 rounded-2xl border-2 ${isDarkMode ? "bg-neutral-900/50 border-neutral-700" : "bg-neutral-50 border-neutral-100"}`}>
              <p className={`text-xs font-semibold uppercase tracking-wide mb-1 ${isDarkMode ? "text-neutral-400" : "text-neutral-500"}`}>Customer ID</p>
              <p className={`font-mono font-bold ${isDarkMode ? "text-white" : "text-neutral-800"}`}>{customer?.customerId}</p>
            </div>
            <div className={`p-5 rounded-2xl border-2 ${
              customer?.balance > 0
                ? isDarkMode ? "bg-rose-900/20 border-rose-900/30" : "bg-rose-50 border-rose-100"
                : isDarkMode ? "bg-emerald-900/20 border-emerald-900/30" : "bg-emerald-50 border-emerald-100"
            }`}>
              <p className={`text-xs font-semibold uppercase tracking-wide mb-1 ${isDarkMode ? "text-neutral-400" : "text-neutral-500"}`}>Current Balance</p>
              <p className={`text-3xl font-black ${customer?.balance > 0 ? "text-rose-600" : "text-emerald-600"}`}>
                ₱{customer?.balance.toFixed(2)}
              </p>
            </div>
          </div>

          {/* Credit Limit */}
          <div className={`p-5 rounded-2xl border-2 mb-6 ${isDarkMode ? "bg-neutral-900/50 border-neutral-700" : "bg-orange-50 border-orange-100"}`}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <CreditCard className={`w-4 h-4 ${isDarkMode ? "text-orange-400" : "text-orange-600"}`} />
                <p className={`text-sm font-semibold ${isDarkMode ? "text-neutral-300" : "text-neutral-700"}`}>Credit Limit</p>
              </div>
              {!editingLimit && (
                <button
                  onClick={() => { setLimitInput(customer?.creditLimit ?? 0); setEditingLimit(true); }}
                  className={`text-xs px-3 py-1 rounded-lg font-semibold transition-all ${isDarkMode ? "bg-neutral-700 text-orange-400 hover:bg-neutral-600" : "bg-orange-100 text-orange-700 hover:bg-orange-200"}`}
                >
                  Edit
                </button>
              )}
            </div>
            {editingLimit ? (
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <span className={`absolute left-3 top-1/2 -translate-y-1/2 font-semibold ${isDarkMode ? "text-neutral-400" : "text-neutral-500"}`}>₱</span>
                  <input type="number" min="0" step="0.01" value={limitInput} onChange={(e) => setLimitInput(e.target.value)} autoFocus
                    className={`w-full border-2 pl-7 pr-3 py-2 rounded-xl focus:outline-none focus:border-orange-500 text-sm font-semibold transition-all ${isDarkMode ? "bg-neutral-700 border-neutral-600 text-white" : "bg-white border-orange-200 text-neutral-800"}`} />
                </div>
                <button onClick={handleSaveLimit} disabled={saving}
                  className="px-4 py-2 bg-orange-500 text-white rounded-xl text-sm font-bold hover:bg-orange-600 transition-all disabled:opacity-50">
                  {saving ? "…" : "Save"}
                </button>
                <button onClick={() => setEditingLimit(false)}
                  className={`px-3 py-2 rounded-xl text-sm font-bold transition-all ${isDarkMode ? "bg-neutral-700 text-neutral-300 hover:bg-neutral-600" : "bg-neutral-200 text-neutral-700 hover:bg-neutral-300"}`}>
                  Cancel
                </button>
              </div>
            ) : (
              <div>
                <p className={`text-2xl font-black ${isDarkMode ? "text-white" : "text-neutral-800"}`}>
                  {customer?.creditLimit > 0
                    ? `₱${customer.creditLimit.toFixed(2)}`
                    : <span className={`text-base font-semibold ${isDarkMode ? "text-neutral-500" : "text-neutral-400"}`}>No limit set</span>
                  }
                </p>
                {customer?.creditLimit > 0 && (
                  <div className="mt-2">
                    <div className="flex justify-between text-xs mb-1">
                      <span className={isDarkMode ? "text-neutral-400" : "text-neutral-500"}>Used: ₱{(customer?.balance ?? 0).toFixed(2)}</span>
                      <span className={`font-semibold ${
                        (customer?.balance ?? 0) / customer.creditLimit >= 0.9 ? "text-rose-500"
                        : (customer?.balance ?? 0) / customer.creditLimit >= 0.7 ? "text-orange-500"
                        : isDarkMode ? "text-emerald-400" : "text-emerald-600"
                      }`}>
                        {Math.round(((customer?.balance ?? 0) / customer.creditLimit) * 100)}% used
                      </span>
                    </div>
                    <div className={`h-2 rounded-full ${isDarkMode ? "bg-neutral-700" : "bg-orange-100"}`}>
                      <div className={`h-2 rounded-full transition-all ${
                        (customer?.balance ?? 0) / customer.creditLimit >= 0.9 ? "bg-rose-500"
                        : (customer?.balance ?? 0) / customer.creditLimit >= 0.7 ? "bg-orange-500"
                        : "bg-emerald-500"
                      }`}
                        style={{ width: `${Math.min(((customer?.balance ?? 0) / customer.creditLimit) * 100, 100)}%` }} />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3 mb-8">
            <button onClick={onEdit}
              className={`px-6 py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2 active:scale-95 ${isDarkMode ? "bg-neutral-700 text-neutral-200 hover:bg-neutral-600" : "bg-neutral-100 text-neutral-700 hover:bg-neutral-200"}`}>
              <Edit2 className="w-5 h-5" />
              Edit Info
            </button>
            <button onClick={onRecordPayment} disabled={customer?.balance === 0}
              className={`flex-1 px-6 py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2 active:scale-95 ${
                customer?.balance === 0
                  ? isDarkMode ? "bg-neutral-700 text-neutral-500 cursor-not-allowed" : "bg-neutral-200 text-neutral-400 cursor-not-allowed"
                  : "bg-emerald-600 text-white hover:bg-emerald-700 shadow-lg"
              }`}>
              <Wallet className="w-5 h-5" />
              Record Payment
            </button>
            <button onClick={onDelete}
              className={`px-6 py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2 active:scale-95 ${isDarkMode ? "bg-orange-900/20 text-orange-400 hover:bg-orange-900/40" : "bg-orange-50 text-orange-600 hover:bg-orange-100"}`}>
              <Trash2 className="w-5 h-5" />
              Archive Customer
            </button>
          </div>

          {/* Transaction History */}
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2">
              <History className={`w-5 h-5 ${isDarkMode ? "text-neutral-400" : "text-neutral-600"}`} />
              <h4 className={`text-lg font-bold ${isDarkMode ? "text-white" : "text-neutral-800"}`}>Transaction History</h4>
            </div>
            <span className={`text-xs ${isDarkMode ? "text-neutral-500" : "text-neutral-400"}`}>
              {history.filter(t => historyFilter === "all" || t.type === historyFilter).length} record{history.filter(t => historyFilter === "all" || t.type === historyFilter).length !== 1 ? "s" : ""}
            </span>
          </div>

          {/* Filter tabs */}
          <div className={`flex gap-1.5 mb-4 p-1 rounded-xl ${isDarkMode ? "bg-neutral-900/60" : "bg-neutral-100"}`}>
            {[
              { key: "all",     label: "All",             count: history.length },
              { key: "credit",  label: "Credit Purchase", count: history.filter(t => t.type === "credit").length },
              { key: "payment", label: "Payment",         count: history.filter(t => t.type === "payment").length },
            ].map(({ key, label, count }) => (
              <button
                key={key}
                onClick={() => setHistoryFilter(key)}
                className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  historyFilter === key
                    ? key === "credit"
                      ? "bg-rose-600 text-white shadow-sm"
                      : key === "payment"
                      ? "bg-emerald-600 text-white shadow-sm"
                      : isDarkMode ? "bg-neutral-700 text-white shadow-sm" : "bg-white text-neutral-800 shadow-sm"
                    : isDarkMode ? "text-neutral-400 hover:text-neutral-200" : "text-neutral-500 hover:text-neutral-700"
                }`}
              >
                {label}
                <span className={`px-1.5 py-0.5 rounded-full text-xs font-bold ${
                  historyFilter === key
                    ? "bg-white/20 text-white"
                    : isDarkMode ? "bg-neutral-700 text-neutral-400" : "bg-neutral-200 text-neutral-500"
                }`}>
                  {count}
                </span>
              </button>
            ))}
          </div>

          {historyLoading ? (
            <div className="py-12 text-center">
              <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className={isDarkMode ? "text-neutral-400" : "text-neutral-600"}>Loading history…</p>
            </div>
          ) : (() => {
            const filtered = history.filter(t => historyFilter === "all" || t.type === historyFilter);
            return filtered.length > 0 ? (
              <div className="space-y-3">
                {filtered.map((transaction, index) => (
                  <TransactionCard key={transaction._id} transaction={transaction} isDarkMode={isDarkMode} delay={index * 50} />
                ))}
              </div>
            ) : (
              <div className={`py-12 text-center rounded-2xl border-2 border-dashed ${isDarkMode ? "border-neutral-700 bg-neutral-900/30" : "border-neutral-100 bg-neutral-50"}`}>
                <Receipt className="w-12 h-12 text-neutral-300 mx-auto mb-3" />
                <p className={isDarkMode ? "text-neutral-400" : "text-neutral-600"}>
                  {history.length > 0 ? `No ${historyFilter === "credit" ? "credit purchases" : "payments"} found` : "No transactions recorded yet"}
                </p>
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
}

/* ── Transaction Card ──────────────────────────────────────── */
function TransactionCard({ transaction, isDarkMode, delay }) {
  const isCredit = transaction.type === "credit";
  return (
    <div
      className={`rounded-xl p-4 border-2 animate-in slide-in-from-left duration-300 ${
        isCredit
          ? isDarkMode ? "border-rose-900 bg-rose-900/10" : "border-rose-200 bg-rose-50"
          : isDarkMode ? "border-emerald-900 bg-emerald-900/10" : "border-emerald-200 bg-emerald-50"
      }`}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className={`p-2 rounded-lg flex-shrink-0 ${isCredit ? "bg-rose-600" : "bg-emerald-600"}`}>
            {isCredit ? <ArrowUpRight className="w-4 h-4 text-white" /> : <ArrowDownRight className="w-4 h-4 text-white" />}
          </div>
          <div className="min-w-0 flex-1">
            <p className={`font-semibold text-sm ${isDarkMode ? "text-white" : "text-neutral-800"}`}>
              {isCredit ? "Credit Purchase" : "Payment Received"}
            </p>
            {isCredit && transaction.items?.length > 0 && (
              <div className={`mt-1.5 space-y-0.5 text-xs ${isDarkMode ? "text-neutral-400" : "text-neutral-500"}`}>
                {transaction.items.map((item, idx) => (
                  <div key={idx} className="flex justify-between gap-2">
                    <span className="truncate">{item.quantity}× {item.name}</span>
                    <span className="font-medium whitespace-nowrap">₱{item.subtotal.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            )}
            {transaction.receiptNumber && (
              <p className={`text-xs mt-1 font-mono ${isDarkMode ? "text-neutral-500" : "text-neutral-400"}`}>
                {transaction.receiptNumber}
              </p>
            )}
            <p className={`text-xs mt-1 ${isDarkMode ? "text-neutral-500" : "text-neutral-400"}`}>
              {new Date(transaction.createdAt).toLocaleString()}
            </p>
          </div>
        </div>
        <p className={`text-lg font-bold whitespace-nowrap ${isCredit ? "text-rose-600" : "text-emerald-600"}`}>
          {isCredit ? "+" : "−"}₱{transaction.amount.toFixed(2)}
        </p>
      </div>
    </div>
  );
}

/* ── Payment Modal ─────────────────────────────────────────── */
function PaymentModal({ customer, amount, isDarkMode, onAmountChange, onSubmit, onClose }) {
  const numAmount    = Number(amount);
  const isOverBalance = numAmount > (customer?.balance || 0);
  const isInvalid    = !amount || isNaN(numAmount) || numAmount <= 0 || isOverBalance;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-300">
      <div className={`rounded-2xl shadow-2xl max-w-md w-full animate-in zoom-in duration-300 ${isDarkMode ? "bg-neutral-800" : "bg-white"}`}>
        <div className={`p-6 border-b ${isDarkMode ? "border-neutral-700" : "border-neutral-200"}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl">
                <Wallet className="w-6 h-6 text-emerald-600" />
              </div>
              <h3 className={`text-xl font-bold ${isDarkMode ? "text-white" : "text-neutral-800"}`}>Record Payment</h3>
            </div>
            <button onClick={onClose} className={`p-2 rounded-xl transition-colors ${isDarkMode ? "text-neutral-400 hover:text-white hover:bg-neutral-700" : "text-neutral-600 hover:text-neutral-800 hover:bg-neutral-100"}`}>
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <form onSubmit={onSubmit} className="p-6">
          <div className="mb-4">
            <p className={`text-lg font-semibold ${isDarkMode ? "text-white" : "text-neutral-800"}`}>{customer?.name}</p>
            <p className={`text-sm ${isDarkMode ? "text-neutral-400" : "text-neutral-500"}`}>
              Balance: <span className="font-bold text-rose-600">₱{customer?.balance.toFixed(2)}</span>
            </p>
          </div>

          <div className="mb-6">
            <label className={`block text-sm font-medium mb-2 ${isDarkMode ? "text-neutral-300" : "text-neutral-700"}`}>Payment Amount</label>
            <div className="relative">
              <input type="number" step="0.01" placeholder="0.00" value={amount} onChange={onAmountChange} autoFocus
                className={`w-full border-2 px-4 py-3 rounded-xl focus:outline-none transition-all text-lg font-semibold ${
                  isOverBalance
                    ? "border-rose-500 focus:border-rose-600 bg-rose-50 dark:bg-rose-900/10"
                    : "focus:border-emerald-500 " + (isDarkMode ? "bg-neutral-700 border-neutral-600 text-white" : "bg-white border-neutral-200 text-neutral-800")
                }`} />
              {isOverBalance && (
                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-rose-500">
                  <AlertTriangle className="w-5 h-5" />
                </div>
              )}
            </div>
            {isOverBalance ? (
              <div className="mt-2 p-3 rounded-lg bg-rose-100 dark:bg-rose-900/30 border border-rose-200 dark:border-rose-800 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 mt-0.5 flex-shrink-0" />
                <p className="text-xs font-medium text-rose-700 dark:text-rose-300">
                  Amount exceeds balance. Maximum: ₱{customer?.balance.toFixed(2)}.
                </p>
              </div>
            ) : (
              <p className={`text-xs mt-1 ${isDarkMode ? "text-neutral-500" : "text-neutral-400"}`}>
                Maximum: ₱{customer?.balance.toFixed(2)}
              </p>
            )}
          </div>

          <div className="flex gap-3">
            <button type="button" onClick={onClose}
              className={`flex-1 px-6 py-3 border-2 rounded-xl font-semibold transition-all active:scale-95 ${isDarkMode ? "border-neutral-600 text-neutral-300 hover:bg-neutral-700" : "border-neutral-300 text-neutral-700 hover:bg-neutral-50"}`}>
              Cancel
            </button>
            <button type="submit" disabled={isInvalid}
              className={`flex-1 px-6 py-3 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 active:scale-95 ${
                isInvalid
                  ? "bg-neutral-300 dark:bg-neutral-700 text-neutral-500 cursor-not-allowed"
                  : "bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg"
              }`}>
              Confirm Payment
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ── Delete Confirmation Modal ─────────────────────────────── */
function DeleteConfirmationModal({ customer, isDarkMode, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-300">
      <div className={`rounded-2xl shadow-2xl max-w-md w-full p-6 animate-in zoom-in duration-300 ${isDarkMode ? "bg-neutral-800" : "bg-white"}`}>
        <div className="mb-6">
          <div className="w-16 h-16 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-8 h-8 text-orange-600" />
          </div>
          <h3 className={`text-2xl font-bold mb-2 text-center ${isDarkMode ? "text-white" : "text-neutral-800"}`}>Archive Customer</h3>
          <p className={`text-center ${isDarkMode ? "text-neutral-400" : "text-neutral-600"}`}>
            Are you sure you want to archive <span className="font-semibold">"{customer.name}"</span>?
          </p>
          <p className={`text-sm text-center mt-2 ${isDarkMode ? "text-neutral-500" : "text-neutral-400"}`}>
            The customer and their transaction history will be moved to the Archive.
          </p>
        </div>
        <div className="flex gap-3">
          <button onClick={onCancel}
            className={`flex-1 px-6 py-3 border-2 rounded-xl font-semibold transition-all active:scale-95 ${isDarkMode ? "border-neutral-600 text-neutral-300 hover:bg-neutral-700" : "border-neutral-300 text-neutral-700 hover:bg-neutral-50"}`}>
            Cancel
          </button>
          <button onClick={onConfirm}
            className="flex-1 px-6 py-3 bg-orange-500 text-white rounded-xl font-semibold hover:bg-orange-600 transition-all shadow-lg active:scale-95">
            Archive
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Archived Customer Card ────────────────────────────────── */
function ArchivedCustomerCard({ customer, isDarkMode, onRestore, onDelete }) {
  const balance = Number(customer.balance) || 0;
  const creditLimit = Number(customer.creditLimit) || 0;
  const hasBalance = balance > 0;

  return (
    <div className={`rounded-2xl overflow-hidden shadow-lg border transition-all hover:shadow-xl hover:-translate-y-0.5 ${isDarkMode ? "bg-neutral-800 border-neutral-700" : "bg-white border-neutral-200"}`}>
      <div className={`h-1.5 ${hasBalance ? "bg-rose-500" : "bg-emerald-500"}`} />
      <div className="p-5">
        <div className="flex items-start gap-4 mb-5">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-sm font-black flex-shrink-0 ${isDarkMode ? "bg-neutral-700 text-orange-300" : "bg-orange-100 text-orange-700"}`}>
            {getInitials(customer.name) || "?"}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className={`text-lg font-black leading-tight truncate ${isDarkMode ? "text-white" : "text-neutral-900"}`}>
                  {customer.name || "Unnamed customer"}
                </h3>
                <p className={`text-sm font-medium mt-1 truncate ${isDarkMode ? "text-neutral-400" : "text-neutral-600"}`}>
                  {customer.fullName || "No full name recorded"}
                </p>
              </div>
              <div className={`flex-shrink-0 px-2.5 py-1 rounded-full text-xs font-bold ${hasBalance ? "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400" : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"}`}>
                {hasBalance ? "Open" : "Settled"}
              </div>
            </div>
            <p className={`text-xs font-mono mt-2 ${isDarkMode ? "text-neutral-500" : "text-neutral-500"}`}>
              {customer.customerId || "No ID"}
            </p>
          </div>
        </div>

        <div className={`rounded-xl border divide-y text-sm ${isDarkMode ? "bg-neutral-900/35 border-neutral-700 divide-neutral-700" : "bg-neutral-50 border-neutral-100 divide-neutral-200"}`}>
          <div className="flex items-center justify-between gap-4 px-4 py-3">
            <span className={isDarkMode ? "text-neutral-400" : "text-neutral-500"}>Balance at archive</span>
            <span className={`font-black text-right ${hasBalance ? "text-rose-500" : "text-emerald-600"}`}>
              {formatCurrency(balance)}
            </span>
          </div>
          <div className="flex items-center justify-between gap-4 px-4 py-3">
            <span className={isDarkMode ? "text-neutral-400" : "text-neutral-500"}>Credit limit</span>
            <span className={`font-semibold text-right ${isDarkMode ? "text-neutral-300" : "text-neutral-700"}`}>
              {creditLimit > 0 ? formatCurrency(creditLimit) : "Not set"}
            </span>
          </div>
          <div className="flex items-center justify-between gap-4 px-4 py-3">
            <span className={isDarkMode ? "text-neutral-400" : "text-neutral-500"}>Archived on</span>
            <span className={isDarkMode ? "text-neutral-300" : "text-neutral-700"}>
              {formatDate(customer.archivedAt)}
            </span>
          </div>
        </div>
      </div>

      <div className={`px-5 py-4 flex gap-2 border-t ${isDarkMode ? "border-neutral-700 bg-neutral-900/25" : "border-neutral-100 bg-neutral-50/70"}`}>
        <button
          onClick={onRestore}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-xl font-semibold hover:from-orange-600 hover:to-orange-700 transition-all shadow-md hover:shadow-lg active:scale-95"
        >
          <RotateCcw className="w-4 h-4" />
          Restore
        </button>
        <button
          onClick={onDelete}
          aria-label={`Permanently delete ${customer.name || "customer"}`}
          className={`w-11 h-11 rounded-xl font-semibold transition-all flex items-center justify-center active:scale-95 ${isDarkMode ? "bg-rose-900/20 text-rose-500 hover:bg-rose-900/40" : "bg-rose-50 text-rose-600 hover:bg-rose-100"}`}
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

export default Dashboard;
