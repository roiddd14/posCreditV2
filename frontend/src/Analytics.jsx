import { useState, useEffect } from "react";
import { useDarkMode } from "./contexts/DarkModeContext";
import {
  BarChart3, PhilippinePeso, ShoppingCart, CreditCard, Wallet,
  Users, Package, AlertTriangle, TrendingUp, Calendar,
  Receipt, ArrowUpRight, X, User, FileText, Printer,
} from "lucide-react";
import { apiUrl } from "./config/api";

const API = apiUrl("/analytics");
const fmt = (n) =>
  `₱${(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function Analytics() {
  const { isDarkMode } = useDarkMode();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [barsReady, setBarsReady] = useState(false);
  const [showReport, setShowReport] = useState(false);

  const todayStr = new Date().toISOString().split("T")[0];

  // "input" state — what the user is typing in the Custom picker (not sent to API yet)
  const [startDate, setStartDate] = useState(todayStr);
  const [endDate,   setEndDate]   = useState(todayStr);

  // "applied" state — what is actually sent to the API
  const [appliedStart, setAppliedStart] = useState(todayStr);
  const [appliedEnd,   setAppliedEnd]   = useState(todayStr);

  const [activePreset, setActivePreset] = useState("today");
  const [showCustom,   setShowCustom]   = useState(false);

  const applyPreset = (key) => {
    const today = new Date();
    const fmt   = (d) => d.toISOString().split("T")[0];
    setActivePreset(key);
    setShowCustom(key === "custom");
    if (key === "all") {
      setStartDate(""); setEndDate("");
      setAppliedStart(""); setAppliedEnd("");
    } else if (key === "today") {
      setStartDate(todayStr); setEndDate(todayStr);
      setAppliedStart(todayStr); setAppliedEnd(todayStr);
    } else if (key === "yesterday") {
      const y = new Date(today); y.setDate(y.getDate() - 1);
      setStartDate(fmt(y)); setEndDate(fmt(y));
      setAppliedStart(fmt(y)); setAppliedEnd(fmt(y));
    } else if (key === "7d") {
      const s = new Date(today); s.setDate(s.getDate() - 6);
      setStartDate(fmt(s)); setEndDate(todayStr);
      setAppliedStart(fmt(s)); setAppliedEnd(todayStr);
    } else if (key === "30d") {
      const s = new Date(today); s.setDate(s.getDate() - 29);
      setStartDate(fmt(s)); setEndDate(todayStr);
      setAppliedStart(fmt(s)); setAppliedEnd(todayStr);
    } else if (key === "month") {
      const s = new Date(today.getFullYear(), today.getMonth(), 1);
      setStartDate(fmt(s)); setEndDate(todayStr);
      setAppliedStart(fmt(s)); setAppliedEnd(todayStr);
    } else if (key === "year") {
      const s = new Date(today.getFullYear(), 0, 1);
      setStartDate(fmt(s)); setEndDate(todayStr);
      setAppliedStart(fmt(s)); setAppliedEnd(todayStr);
    }
    // 'custom' — keep existing applied range until user clicks Apply
  };

  const applyCustomRange = () => {
    setAppliedStart(startDate);
    setAppliedEnd(endDate);
  };

  // API fires only when the APPLIED range changes, not while the user is typing
  useEffect(() => { load(); }, [appliedStart, appliedEnd]);
  useEffect(() => {
    if (data) setTimeout(() => setBarsReady(true), 150);
    else setBarsReady(false);
  }, [data]);

  const load = async () => {
    setLoading(true);
    setBarsReady(false);
    try {
      const params = new URLSearchParams();
      if (appliedStart) params.set("startDate", appliedStart);
      if (appliedEnd)   params.set("endDate",   appliedEnd);
      const qs = params.toString();
      const res = await fetch(`${API}${qs ? "?" + qs : ""}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      if (!res.ok) throw new Error((await res.json()).message || "Failed to load");
      setData(await res.json());
      setError("");
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const rangeLabel = () => {
    const labels = {
      all:       "All time",
      today:     "Today",
      yesterday: "Yesterday",
      "7d":      "Last 7 days",
      "30d":     "Last 30 days",
      month:     "This month",
      year:      "This year",
    };
    if (activePreset !== "custom") return labels[activePreset] || "All time";
    if (!appliedStart && !appliedEnd) return "Custom range";
    if (appliedStart && appliedEnd && appliedStart === appliedEnd)
      return new Date(appliedStart + "T12:00:00").toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
    const s = appliedStart
      ? new Date(appliedStart + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })
      : "—";
    const e = appliedEnd
      ? new Date(appliedEnd + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
      : "Today";
    return `${s} — ${e}`;
  };

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${isDarkMode ? "bg-neutral-900" : "bg-neutral-100"}`}>
        <div className="text-center">
          <div className="w-14 h-14 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className={`text-sm font-medium ${isDarkMode ? "text-neutral-400" : "text-neutral-500"}`}>Loading analytics…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${isDarkMode ? "bg-neutral-900" : "bg-neutral-100"}`}>
        <div className="text-center max-w-xs">
          <div className="w-14 h-14 bg-rose-100 dark:bg-rose-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-7 h-7 text-rose-600" />
          </div>
          <p className={`font-bold text-lg mb-1 ${isDarkMode ? "text-white" : "text-neutral-800"}`}>Something went wrong</p>
          <p className={`text-sm ${isDarkMode ? "text-neutral-400" : "text-neutral-500"}`}>{error}</p>
        </div>
      </div>
    );
  }

  const { summary, charts, recentTransactions, customersWithDebt: debtList } = data || {};
  const avg = summary?.totalTransactions > 0 ? summary.totalSales / summary.totalTransactions : 0;

  return (
    <div className={`min-h-screen transition-colors duration-300 ${isDarkMode ? "bg-neutral-900" : "bg-neutral-100"}`}>

      {/* ── Header ─────────────────────────────────────────── */}
      <div className={`px-4 sm:px-8 pt-6 pb-4 border-b ${isDarkMode ? "bg-neutral-900 border-neutral-800" : "bg-neutral-50 border-neutral-200"} shadow-sm`}>
        <div className="max-w-7xl mx-auto space-y-4">

          {/* Title row */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-xl ${isDarkMode ? "bg-orange-900/30" : "bg-orange-100"}`}>
                <BarChart3 className="w-6 h-6 text-orange-600" />
              </div>
              <div>
                <h1 className={`text-2xl font-black tracking-tight leading-none ${isDarkMode ? "text-white" : "text-neutral-900"}`}>
                  Analytics
                </h1>
                <p className={`text-xs font-medium mt-0.5 ${isDarkMode ? "text-neutral-500" : "text-neutral-400"}`}>
                  {rangeLabel()}
                </p>
              </div>
            </div>
            {data && (
              <button
                onClick={() => setShowReport(true)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border transition-all flex-shrink-0 ${
                  isDarkMode
                    ? "bg-neutral-800 border-neutral-700 text-neutral-300 hover:border-orange-500 hover:text-orange-400"
                    : "bg-white border-neutral-200 text-neutral-600 hover:border-orange-400 hover:text-orange-600"
                }`}
              >
                <FileText className="w-4 h-4" />
                <span className="hidden sm:inline">Generate Report</span>
              </button>
            )}
          </div>

          {/* Preset pills */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {[
              { key: "all",       label: "All Time"   },
              { key: "today",     label: "Today"      },
              { key: "yesterday", label: "Yesterday"  },
              { key: "7d",        label: "Last 7 Days"},
              { key: "30d",       label: "Last 30 Days"},
              { key: "month",     label: "This Month" },
              { key: "year",      label: "This Year"  },
              { key: "custom",    label: "Custom"     },
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => applyPreset(key)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                  activePreset === key
                    ? "bg-orange-500 text-white border-orange-500 shadow-md"
                    : isDarkMode
                    ? "bg-neutral-800 border-neutral-700 text-neutral-400 hover:text-white hover:border-neutral-500"
                    : "bg-white border-neutral-200 text-neutral-500 hover:text-neutral-800 hover:border-neutral-300"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Custom date inputs — only shown when Custom is active */}
          {showCustom && (
            <div className="flex items-center gap-2 flex-wrap">
              <div className={`flex items-center gap-3 px-4 py-2.5 rounded-xl border ${isDarkMode ? "bg-neutral-800 border-neutral-700" : "bg-neutral-50 border-neutral-200"}`}>
                <Calendar className={`w-4 h-4 flex-shrink-0 ${isDarkMode ? "text-neutral-500" : "text-neutral-400"}`} />
                <input
                  type="date"
                  value={startDate}
                  max={endDate || todayStr}
                  onChange={(e) => setStartDate(e.target.value)}
                  style={{ colorScheme: isDarkMode ? "dark" : "light" }}
                  className={`text-sm font-medium bg-transparent focus:outline-none ${isDarkMode ? "text-white" : "text-neutral-800"}`}
                />
                <span className={`text-sm ${isDarkMode ? "text-neutral-600" : "text-neutral-300"}`}>→</span>
                <input
                  type="date"
                  value={endDate}
                  min={startDate || undefined}
                  max={todayStr}
                  onChange={(e) => setEndDate(e.target.value)}
                  style={{ colorScheme: isDarkMode ? "dark" : "light" }}
                  className={`text-sm font-medium bg-transparent focus:outline-none ${isDarkMode ? "text-white" : "text-neutral-800"}`}
                />
              </div>
              <button
                onClick={applyCustomRange}
                disabled={!startDate && !endDate}
                className="px-4 py-2.5 rounded-xl text-sm font-semibold bg-orange-500 hover:bg-orange-600 text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
              >
                Apply
              </button>
            </div>
          )}

        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-8 space-y-5">

        {/* ── Primary KPIs ───────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard
            label="Total Sales"
            value={fmt(summary?.totalSales)}
            sub={`${summary?.totalTransactions || 0} transactions`}
            icon={PhilippinePeso}
            color="emerald"
            isDarkMode={isDarkMode}
          />
          <KPICard
            label="Cash Sales"
            value={fmt(summary?.cashSales)}
            sub={`${charts?.paymentDistribution?.cash?.count || 0} transactions`}
            icon={Wallet}
            color="teal"
            isDarkMode={isDarkMode}
          />
          <KPICard
            label="Credit Sales"
            value={fmt(summary?.creditSales)}
            sub={`${charts?.paymentDistribution?.credit?.count || 0} transactions`}
            icon={CreditCard}
            color="blue"
            isDarkMode={isDarkMode}
          />
          <KPICard
            label="Outstanding"
            value={fmt(summary?.outstandingBalance)}
            sub={`${summary?.customersWithDebt || 0} customers`}
            icon={ArrowUpRight}
            color="rose"
            isDarkMode={isDarkMode}
          />
        </div>

        {/* ── Secondary stats ────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <SmallCard label="Avg per Sale"     value={fmt(avg)}                        icon={TrendingUp}     color="orange"  isDarkMode={isDarkMode} />
          <SmallCard label="Total Customers"  value={summary?.totalCustomers || 0}    icon={Users}          color="purple"  isDarkMode={isDarkMode} />
          <SmallCard label="Products"         value={summary?.totalProducts || 0}     icon={Package}        color="indigo"  isDarkMode={isDarkMode} />
          <SmallCard label="Low Stock"        value={summary?.lowStockItems || 0}     icon={AlertTriangle}  color="amber"   isDarkMode={isDarkMode} alert={summary?.lowStockItems > 0} />
        </div>

        {/* ── Charts ─────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

          {/* Bar chart */}
          <div className={`lg:col-span-2 rounded-2xl border p-6 shadow-sm ${isDarkMode ? "bg-neutral-800 border-neutral-700" : "bg-neutral-50 border-neutral-200"}`}>
            <div className="flex items-start justify-between mb-6">
              <div>
                <h2 className={`text-base font-bold ${isDarkMode ? "text-white" : "text-neutral-800"}`}>Daily Sales</h2>
                <p className={`text-xs mt-0.5 ${isDarkMode ? "text-neutral-500" : "text-neutral-400"}`}>{rangeLabel()}</p>
              </div>
              <span className={`text-sm font-bold px-3 py-1.5 rounded-xl ${isDarkMode ? "bg-orange-900/30 text-orange-400" : "bg-orange-50 text-orange-600"}`}>
                {fmt(summary?.totalSales)}
              </span>
            </div>
            <SalesBarChart data={charts?.dailySales} isDarkMode={isDarkMode} ready={barsReady} />
          </div>

          {/* Payment split */}
          <div className={`rounded-2xl border p-6 shadow-sm ${isDarkMode ? "bg-neutral-800 border-neutral-700" : "bg-neutral-50 border-neutral-200"}`}>
            <h2 className={`text-base font-bold mb-6 ${isDarkMode ? "text-white" : "text-neutral-800"}`}>Payment Split</h2>
            <PaymentSplitPanel
              cash={charts?.paymentDistribution?.cash}
              credit={charts?.paymentDistribution?.credit}
              total={summary?.totalSales}
              isDarkMode={isDarkMode}
              ready={barsReady}
            />
          </div>
        </div>

        {/* ── Bottom row ─────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <OutstandingBalancesPanel customers={debtList} totalOutstanding={summary?.outstandingBalance} isDarkMode={isDarkMode} />
          <RecentTransactionsPanel
            transactions={recentTransactions}
            isDarkMode={isDarkMode}
            activePreset={activePreset}
            appliedStart={appliedStart}
            appliedEnd={appliedEnd}
          />
        </div>

      </div>

      {showReport && data && (
        <ReportModal
          data={data}
          isDarkMode={isDarkMode}
          rangeLabel={rangeLabel()}
          startDate={startDate}
          endDate={endDate}
          onClose={() => setShowReport(false)}
        />
      )}
    </div>
  );
}

/* ── KPI Card ──────────────────────────────────────────────── */
const KPI_COLORS = {
  emerald: { bg: "bg-emerald-100 dark:bg-emerald-900/30", icon: "text-emerald-600", val: "text-emerald-600" },
  teal:    { bg: "bg-teal-100 dark:bg-teal-900/30",       icon: "text-teal-600",    val: "text-teal-600" },
  blue:    { bg: "bg-blue-100 dark:bg-blue-900/30",       icon: "text-blue-600",    val: "text-blue-600" },
  rose:    { bg: "bg-rose-100 dark:bg-rose-900/30",       icon: "text-rose-600",    val: "text-rose-600" },
  orange:  { bg: "bg-orange-100 dark:bg-orange-900/30",   icon: "text-orange-600",  val: "text-orange-600" },
  purple:  { bg: "bg-purple-100 dark:bg-purple-900/30",   icon: "text-purple-600",  val: "text-purple-600" },
  indigo:  { bg: "bg-indigo-100 dark:bg-indigo-900/30",   icon: "text-indigo-600",  val: "text-indigo-600" },
  amber:   { bg: "bg-amber-100 dark:bg-amber-900/30",     icon: "text-amber-600",   val: "text-amber-600" },
};

function KPICard({ label, value, sub, icon: Icon, color, isDarkMode }) {
  const c = KPI_COLORS[color];
  return (
    <div className={`rounded-2xl border p-5 shadow-sm transition-all hover:shadow-md ${isDarkMode ? "bg-neutral-800 border-neutral-700" : "bg-neutral-50 border-neutral-200"}`}>
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${c.bg}`}>
        <Icon className={`w-5 h-5 ${c.icon}`} />
      </div>
      <p className={`text-xs font-semibold uppercase tracking-wide mb-1 ${isDarkMode ? "text-neutral-500" : "text-neutral-400"}`}>{label}</p>
      <p className={`text-2xl font-black leading-none mb-1.5 ${isDarkMode ? "text-white" : "text-neutral-900"}`}>{value}</p>
      {sub && <p className={`text-xs ${isDarkMode ? "text-neutral-500" : "text-neutral-400"}`}>{sub}</p>}
    </div>
  );
}

/* ── Small Card ────────────────────────────────────────────── */
function SmallCard({ label, value, icon: Icon, color, alert, isDarkMode }) {
  const c = KPI_COLORS[color];
  return (
    <div className={`rounded-xl border p-4 shadow-sm transition-all hover:shadow-md ${
      isDarkMode ? "bg-neutral-800 border-neutral-700" : "bg-neutral-50 border-neutral-200"
    } ${alert ? "ring-2 ring-amber-400/50" : ""}`}>
      <div className="flex items-center gap-3">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${c.bg}`}>
          <Icon className={`w-4 h-4 ${c.icon}`} />
        </div>
        <div className="min-w-0 flex-1">
          <p className={`text-xs font-medium mb-0.5 ${isDarkMode ? "text-neutral-500" : "text-neutral-400"}`}>{label}</p>
          <p className={`text-lg font-bold leading-none ${isDarkMode ? "text-white" : "text-neutral-800"}`}>{value}</p>
        </div>
        {alert && <AlertTriangle className="w-4 h-4 text-amber-500 animate-pulse flex-shrink-0" />}
      </div>
    </div>
  );
}

/* ── Sales Bar Chart ───────────────────────────────────────── */
function aggregateData(data) {
  const n = data.length;
  if (n <= 14) return { bars: data, mode: "day" };

  if (n <= 90) {
    // Group by week (Monday as start)
    const weeks = {};
    data.forEach((d) => {
      const date = new Date(d.date + "T12:00:00");
      const day  = date.getDay(); // 0=Sun
      const diff = day === 0 ? -6 : 1 - day;
      const monday = new Date(date);
      monday.setDate(date.getDate() + diff);
      const key = monday.toISOString().split("T")[0];
      if (!weeks[key]) weeks[key] = { date: key, sales: 0, transactions: 0 };
      weeks[key].sales        += d.sales;
      weeks[key].transactions += d.transactions;
    });
    return { bars: Object.values(weeks).sort((a, b) => a.date.localeCompare(b.date)), mode: "week" };
  }

  // Group by month
  const months = {};
  data.forEach((d) => {
    const key = d.date.slice(0, 7); // YYYY-MM
    if (!months[key]) months[key] = { date: key + "-01", sales: 0, transactions: 0 };
    months[key].sales        += d.sales;
    months[key].transactions += d.transactions;
  });
  return { bars: Object.values(months).sort((a, b) => a.date.localeCompare(b.date)), mode: "month" };
}

function SalesBarChart({ data, isDarkMode, ready }) {
  if (!data?.length) {
    return (
      <div className="flex flex-col items-center justify-center h-44 gap-3">
        <BarChart3 className={`w-10 h-10 ${isDarkMode ? "text-neutral-700" : "text-neutral-200"}`} />
        <p className={`text-sm ${isDarkMode ? "text-neutral-500" : "text-neutral-400"}`}>No sales data for this period</p>
      </div>
    );
  }

  const { bars, mode } = aggregateData(data);
  const max = Math.max(...bars.map((d) => d.sales), 1);

  const barLabel = (dateStr) => {
    const d = new Date(dateStr + "T12:00:00");
    if (mode === "month") return d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
    if (mode === "week")  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    // day mode
    if (bars.length === 1) return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    if (bars.length <= 7)  return d.toLocaleDateString("en-US", { weekday: "short" });
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const modeLabel = mode === "week" ? "weekly" : mode === "month" ? "monthly" : null;

  return (
    <div>
      {/* Aggregation badge */}
      {modeLabel && (
        <div className="flex justify-end mb-3">
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${isDarkMode ? "bg-neutral-700 text-neutral-400" : "bg-neutral-100 text-neutral-500"}`}>
            Grouped {modeLabel}
          </span>
        </div>
      )}

      <div className="flex items-end gap-1 sm:gap-2" style={{ height: "192px" }}>
        {bars.map((bar, i) => {
          const pct     = (bar.sales / max) * 100;
          const isEmpty = bar.sales === 0;
          return (
            <div key={bar.date} className="flex-1 flex flex-col items-center justify-end h-full group relative">
              {/* Hover tooltip */}
              <div className={`absolute bottom-full mb-2 left-1/2 -translate-x-1/2 px-2.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap opacity-0 group-hover:opacity-100 transition-all duration-150 z-10 pointer-events-none shadow-lg ${isDarkMode ? "bg-neutral-700 text-white" : "bg-neutral-900 text-white"}`}>
                <div>{fmt(bar.sales)}</div>
                <div className={`text-xs font-normal ${isDarkMode ? "text-neutral-400" : "text-neutral-300"}`}>
                  {bar.transactions} txn{mode === "week" ? " · wk" : mode === "month" ? " · mo" : ""}
                </div>
                <div
                  className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0"
                  style={{ borderLeft: "4px solid transparent", borderRight: "4px solid transparent", borderTop: `4px solid ${isDarkMode ? "#404040" : "#171717"}` }}
                />
              </div>

              {/* Bar */}
              <div
                className={`w-full rounded-t-md transition-all duration-500 ease-out ${
                  isEmpty
                    ? isDarkMode ? "bg-neutral-700" : "bg-neutral-100"
                    : "bg-gradient-to-t from-orange-600 to-orange-400 group-hover:from-orange-700 group-hover:to-orange-500"
                }`}
                style={{
                  height: ready ? `${Math.max(pct, isEmpty ? 2 : 4)}%` : "0%",
                  transitionDelay: `${Math.min(i * 30, 600)}ms`,
                }}
              />
            </div>
          );
        })}
      </div>

      {/* Date labels */}
      <div className="flex gap-1 sm:gap-2 mt-2.5">
        {bars.map((bar) => (
          <div key={bar.date} className="flex-1 flex justify-center overflow-hidden">
            <span className={`text-xs font-medium truncate ${isDarkMode ? "text-neutral-500" : "text-neutral-400"}`}>
              {barLabel(bar.date)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Payment Split ─────────────────────────────────────────── */
function PaymentSplitPanel({ cash, credit, total, isDarkMode, ready }) {
  const cashAmt   = cash?.amount   || 0;
  const creditAmt = credit?.amount || 0;
  const tot = total || 1;
  const cashPct   = tot > 0 ? Math.round((cashAmt   / tot) * 100) : 0;
  const creditPct = tot > 0 ? Math.round((creditAmt / tot) * 100) : 0;

  const row = (label, amt, pct, count, barColor, textColor, delay) => (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`w-2.5 h-2.5 rounded-full ${barColor}`} />
          <span className={`text-sm font-semibold ${isDarkMode ? "text-neutral-300" : "text-neutral-700"}`}>{label}</span>
        </div>
        <span className={`text-xs ${isDarkMode ? "text-neutral-500" : "text-neutral-400"}`}>{count} txn</span>
      </div>
      <p className={`text-2xl font-black ${textColor}`}>{fmt(amt)}</p>
      <div className={`h-2 rounded-full overflow-hidden ${isDarkMode ? "bg-neutral-700" : "bg-neutral-100"}`}>
        <div
          className={`h-full rounded-full transition-all duration-700 ease-out ${barColor}`}
          style={{ width: ready ? `${pct}%` : "0%", transitionDelay: `${delay}ms` }}
        />
      </div>
      <p className={`text-xs ${isDarkMode ? "text-neutral-500" : "text-neutral-400"}`}>{pct}% of total</p>
    </div>
  );

  return (
    <div className="space-y-6">
      {row("Cash",   cashAmt,   cashPct,   cash?.count   || 0, "bg-emerald-500", "text-emerald-600", 200)}
      {row("Credit", creditAmt, creditPct, credit?.count || 0, "bg-blue-500",    "text-blue-600",    400)}

      {/* Combined split bar */}
      {(total || 0) > 0 && (
        <div className="pt-2 border-t border-dashed" style={{ borderColor: isDarkMode ? "#404040" : "#e5e7eb" }}>
          <p className={`text-xs font-semibold mb-2 ${isDarkMode ? "text-neutral-500" : "text-neutral-400"}`}>Overall split</p>
          <div className={`h-3 rounded-full overflow-hidden flex gap-0.5 ${isDarkMode ? "bg-neutral-700" : "bg-neutral-100"}`}>
            <div
              className="h-full bg-emerald-500 rounded-l-full transition-all duration-700 ease-out"
              style={{ width: ready ? `${cashPct}%` : "0%", transitionDelay: "600ms" }}
            />
            <div
              className="h-full bg-blue-500 rounded-r-full transition-all duration-700 ease-out"
              style={{ width: ready ? `${creditPct}%` : "0%", transitionDelay: "600ms" }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Outstanding Balances ──────────────────────────────────── */
function OutstandingBalancesPanel({ customers, totalOutstanding, isDarkMode }) {
  const maxBalance = customers?.length ? Math.max(...customers.map(c => c.balance)) : 1;

  return (
    <div className={`rounded-2xl border p-6 shadow-sm ${isDarkMode ? "bg-neutral-800 border-neutral-700" : "bg-neutral-50 border-neutral-200"}`}>
      <div className="flex items-center gap-2.5 mb-1">
        <div className={`p-2 rounded-xl ${isDarkMode ? "bg-rose-900/30" : "bg-rose-100"}`}>
          <AlertTriangle className="w-4 h-4 text-rose-500" />
        </div>
        <h2 className={`text-base font-bold ${isDarkMode ? "text-white" : "text-neutral-800"}`}>Outstanding Balances</h2>
        {(totalOutstanding || 0) > 0 && (
          <span className={`text-xs font-bold ml-auto px-2.5 py-1 rounded-xl ${isDarkMode ? "bg-rose-900/30 text-rose-400" : "bg-rose-50 text-rose-600"}`}>
            {fmt(totalOutstanding)} owed
          </span>
        )}
      </div>
      {/* Always reflects current balances regardless of date filter */}
      <p className={`text-xs mb-5 ml-11 ${isDarkMode ? "text-neutral-500" : "text-neutral-400"}`}>
        Always reflects current balance — not affected by date filter
      </p>

      {!customers?.length ? (
        <div className="py-12 text-center">
          <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 ${isDarkMode ? "bg-emerald-900/30" : "bg-emerald-100"}`}>
            <span className="text-xl">✓</span>
          </div>
          <p className={`text-sm font-bold ${isDarkMode ? "text-emerald-400" : "text-emerald-600"}`}>All clear!</p>
          <p className={`text-xs mt-1 ${isDarkMode ? "text-neutral-500" : "text-neutral-400"}`}>No outstanding balances</p>
        </div>
      ) : (
        <div className="space-y-3">
          {customers.slice(0, 5).map((c, i) => {
            const pct = Math.round((c.balance / maxBalance) * 100);
            const isTop = i === 0;
            return (
              <div key={c.customerId} className={`p-3 rounded-xl transition-all ${isDarkMode ? "bg-neutral-700/40 hover:bg-neutral-700/70" : "bg-neutral-100 hover:bg-neutral-200/60"}`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold ${
                      isTop
                        ? isDarkMode ? "bg-rose-900/50 text-rose-400" : "bg-rose-100 text-rose-600"
                        : isDarkMode ? "bg-neutral-600 text-neutral-300" : "bg-neutral-200 text-neutral-500"
                    }`}>
                      {i + 1}
                    </div>
                    <p className={`font-semibold text-sm truncate ${isDarkMode ? "text-white" : "text-neutral-800"}`}>
                      {c.customerName}
                    </p>
                  </div>
                  <p className={`font-bold text-sm flex-shrink-0 ml-2 ${isTop ? "text-rose-500" : isDarkMode ? "text-amber-400" : "text-amber-600"}`}>
                    {fmt(c.balance)}
                  </p>
                </div>
                <div className={`h-1.5 rounded-full overflow-hidden ${isDarkMode ? "bg-neutral-600" : "bg-neutral-200"}`}>
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${isTop ? "bg-rose-500" : "bg-amber-400"}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ── Recent Transactions ───────────────────────────────────── */
function RecentTransactionsPanel({ transactions, isDarkMode, activePreset, appliedStart, appliedEnd }) {
  const [selected, setSelected] = useState(null);

  // Derive a human-readable header based on the active filter
  const panelTitle = (() => {
    if (activePreset === "all" || (!appliedStart && !appliedEnd)) return "Recent Transactions";
    if (activePreset === "today")     return "Today's Transactions";
    if (activePreset === "yesterday") return "Yesterday's Transactions";
    if (activePreset === "7d")        return "Last 7 Days";
    if (activePreset === "30d")       return "Last 30 Days";
    if (activePreset === "month")     return "This Month";
    if (activePreset === "year")      return "This Year";
    // Custom range
    if (appliedStart && appliedEnd && appliedStart === appliedEnd)
      return new Date(appliedStart + "T12:00:00").toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
    return "Transactions";
  })();

  const isFiltered = activePreset !== "all" || !!appliedStart || !!appliedEnd;
  const count = transactions?.length || 0;

  return (
    <>
      <div className={`rounded-2xl border p-6 shadow-sm flex flex-col ${isDarkMode ? "bg-neutral-800 border-neutral-700" : "bg-neutral-50 border-neutral-200"}`}>
        <div className="flex items-center gap-2.5 mb-5 flex-shrink-0">
          <div className={`p-2 rounded-xl ${isDarkMode ? "bg-orange-900/30" : "bg-orange-100"}`}>
            <Receipt className="w-4 h-4 text-orange-600" />
          </div>
          <h2 className={`text-base font-bold ${isDarkMode ? "text-white" : "text-neutral-800"}`}>{panelTitle}</h2>
          {/* Count badge when filtered */}
          {isFiltered && count > 0 && (
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${isDarkMode ? "bg-orange-900/30 text-orange-400" : "bg-orange-50 text-orange-600"}`}>
              {count}
            </span>
          )}
          <span className={`text-xs ml-auto ${isDarkMode ? "text-neutral-500" : "text-neutral-400"}`}>tap to view receipt</span>
        </div>

        {!count ? (
          <div className="py-12 text-center">
            <Receipt className={`w-9 h-9 mx-auto mb-2 ${isDarkMode ? "text-neutral-700" : "text-neutral-200"}`} />
            <p className={`text-sm ${isDarkMode ? "text-neutral-500" : "text-neutral-400"}`}>No transactions for this period</p>
          </div>
        ) : (
          /* Scrollable list — shows all filtered transactions */
          <div className="overflow-y-auto space-y-1" style={{ maxHeight: "420px" }}>
            {transactions.map((t) => {
              const type = t.transactionType; // 'creditPayment' | 'cash' | 'credit'
              const label    = type === "creditPayment" ? "Credit Payment" : type === "cash" ? "Cash Sale" : "Credit Sale";
              const iconBg   = type === "creditPayment" ? "bg-violet-100 dark:bg-violet-900/30" : type === "cash" ? "bg-emerald-100 dark:bg-emerald-900/30" : "bg-blue-100 dark:bg-blue-900/30";
              const iconNode = type === "creditPayment" ? <Wallet className="w-4 h-4 text-violet-600" /> : type === "cash" ? <Wallet className="w-4 h-4 text-emerald-600" /> : <CreditCard className="w-4 h-4 text-blue-600" />;
              return (
                <button
                  key={t._id}
                  onClick={() => setSelected(t)}
                  className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all text-left group ${
                    isDarkMode ? "hover:bg-neutral-700" : "hover:bg-neutral-100"
                  }`}
                >
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${iconBg}`}>
                    {iconNode}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`font-semibold text-sm ${isDarkMode ? "text-white" : "text-neutral-800"}`}>
                      {label}
                    </p>
                    <p className={`text-xs ${isDarkMode ? "text-neutral-500" : "text-neutral-400"}`}>
                      {new Date(t.createdAt).toLocaleString("en-US", {
                        month: "short", day: "numeric",
                        hour: "2-digit", minute: "2-digit",
                      })}
                      {type === "creditPayment" && t.customer?.name && (
                        <span className="ml-1.5 text-violet-500">· {t.customer.name}</span>
                      )}
                      {type === "cash" && t.cashCustomerName && (
                        <span className="ml-1.5 text-emerald-500">· {t.cashCustomerName}</span>
                      )}
                      {type === "credit" && t.customer?.name && (
                        <span className="ml-1.5 text-blue-500">· {t.customer.name}</span>
                      )}
                    </p>
                  </div>
                  <p className={`font-bold text-sm flex-shrink-0 ${isDarkMode ? "text-white" : "text-neutral-800"}`}>
                    {fmt(t.total)}
                  </p>
                </button>
              );
            })}
            {/* All-time cap notice */}
            {!isFiltered && count >= 50 && (
              <p className={`text-center text-xs py-3 ${isDarkMode ? "text-neutral-600" : "text-neutral-400"}`}>
                Showing last 50 — use a date filter to see specific transactions
              </p>
            )}
          </div>
        )}
      </div>

      {selected && (
        <TransactionReceiptModal
          transaction={selected}
          isDarkMode={isDarkMode}
          onClose={() => setSelected(null)}
        />
      )}
    </>
  );
}

/* ── Report Modal ──────────────────────────────────────────── */
function ReportModal({ data, isDarkMode, rangeLabel, onClose }) {
  const { summary, charts, recentTransactions, customersWithDebt: debtList } = data;
  const avg = summary?.totalTransactions > 0 ? summary.totalSales / summary.totalTransactions : 0;
  const generatedAt = new Date().toLocaleString("en-US", {
    month: "long", day: "numeric", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });

  const handlePrint = () => {
    const cash   = charts?.paymentDistribution?.cash;
    const credit = charts?.paymentDistribution?.credit;
    const tot    = summary?.totalSales || 1;
    const cashPct   = tot > 0 ? Math.round(((cash?.amount   || 0) / tot) * 100) : 0;
    const creditPct = tot > 0 ? Math.round(((credit?.amount || 0) / tot) * 100) : 0;

    const dailyRows = (charts?.dailySales || []).map((d) => `
      <tr>
        <td>${new Date(d.date + "T12:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}</td>
        <td style="text-align:center">${d.transactions}</td>
        <td style="text-align:right">&#8369;${(d.sales || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
      </tr>`).join("");

    const debtRows = (debtList || []).slice(0, 10).map((c, i) => `
      <tr>
        <td style="text-align:center">${i + 1}</td>
        <td>${c.customerName}</td>
        <td style="text-align:right;color:#e11d48">&#8369;${(c.balance || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
      </tr>`).join("");

    const txnRows = (recentTransactions || []).slice(0, 20).map((t) => {
      const type = t.transactionType;
      const typeLabel     = type === "creditPayment" ? "Credit Payment" : type === "cash" ? "Cash" : "Credit";
      const customerLabel = type === "creditPayment" || type === "credit" ? (t.customer?.name || "Unknown") : "Walk-in";
      return `
      <tr>
        <td>${new Date(t.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</td>
        <td style="font-family:monospace;font-size:11px">${t.receiptNumber || "—"}</td>
        <td style="text-align:center">${typeLabel}</td>
        <td>${customerLabel}</td>
        <td style="text-align:right">&#8369;${(t.total || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
      </tr>`;
    }).join("");

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Analytics Report</title>
  <style>
    @page { size: A4 portrait; margin: 18mm 20mm; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 13px; color: #1a1a1a; background: #fff; padding: 24px 28px; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #f97316; padding-bottom: 14px; margin-bottom: 20px; }
    .header-left h1 { font-size: 24px; font-weight: 800; color: #f97316; }
    .header-left p { font-size: 12px; color: #666; margin-top: 4px; }
    .header-right { text-align: right; font-size: 11px; color: #888; }
    .header-right .range { font-size: 14px; font-weight: 700; color: #333; margin-bottom: 3px; }
    h2 { font-size: 13px; font-weight: 700; color: #333; margin-bottom: 10px; padding-bottom: 5px; border-bottom: 1px solid #eee; text-transform: uppercase; letter-spacing: 0.04em; }
    .section { margin-bottom: 22px; }
    .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: 8px; }
    .kpi { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 10px 12px; }
    .kpi .label { font-size: 9px; font-weight: 700; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.06em; }
    .kpi .value { font-size: 17px; font-weight: 800; color: #111; margin-top: 3px; }
    .kpi .sub { font-size: 10px; color: #9ca3af; margin-top: 2px; }
    .kpi-grid2 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; }
    th { background: #f3f4f6; text-align: left; padding: 7px 10px; font-size: 10px; font-weight: 700; color: #6b7280; text-transform: uppercase; letter-spacing: 0.04em; }
    td { padding: 7px 10px; border-bottom: 1px solid #f3f4f6; color: #374151; }
    tr:last-child td { border-bottom: none; }
    tr:nth-child(even) td { background: #fafafa; }
    .split-row { display: flex; gap: 10px; }
    .split-box { flex: 1; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px 14px; }
    .split-box .label { font-size: 9px; font-weight: 700; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.06em; }
    .split-box .value { font-size: 20px; font-weight: 800; margin-top: 4px; }
    .split-box .sub { font-size: 11px; color: #9ca3af; margin-top: 3px; }
    .cash-val { color: #059669; }
    .credit-val { color: #2563eb; }
    .bar-track { height: 6px; background: #e5e7eb; border-radius: 9999px; margin-top: 8px; overflow: hidden; }
    .footer { margin-top: 24px; padding-top: 10px; border-top: 1px solid #e5e7eb; font-size: 10px; color: #9ca3af; text-align: center; }
    @media print {
      body { padding: 0; margin: 0; }
      @page { size: A4 portrait; margin: 18mm 20mm; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="header-left">
      <h1>Analytics Report</h1>
      <p>POS System &mdash; Sales &amp; Performance Summary</p>
    </div>
    <div class="header-right">
      <div class="range">${rangeLabel}</div>
      <div>Generated: ${generatedAt}</div>
    </div>
  </div>

  <div class="section">
    <h2>Sales Summary</h2>
    <div class="kpi-grid">
      <div class="kpi"><div class="label">Total Sales</div><div class="value">&#8369;${(summary?.totalSales || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</div><div class="sub">${summary?.totalTransactions || 0} transactions</div></div>
      <div class="kpi"><div class="label">Cash Sales</div><div class="value">&#8369;${(summary?.cashSales || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</div><div class="sub">${cash?.count || 0} transactions</div></div>
      <div class="kpi"><div class="label">Credit Sales</div><div class="value">&#8369;${(summary?.creditSales || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</div><div class="sub">${credit?.count || 0} transactions</div></div>
      <div class="kpi"><div class="label">Outstanding</div><div class="value">&#8369;${(summary?.outstandingBalance || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</div><div class="sub">${summary?.customersWithDebt || 0} customers</div></div>
    </div>
    <div class="kpi-grid2">
      <div class="kpi"><div class="label">Avg per Sale</div><div class="value">&#8369;${avg.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div></div>
      <div class="kpi"><div class="label">Total Customers</div><div class="value">${summary?.totalCustomers || 0}</div></div>
      <div class="kpi"><div class="label">Products</div><div class="value">${summary?.totalProducts || 0}</div></div>
      <div class="kpi"><div class="label">Low Stock</div><div class="value">${summary?.lowStockItems || 0}</div></div>
    </div>
  </div>

  <div class="section">
    <h2>Payment Distribution</h2>
    <div class="split-row">
      <div class="split-box">
        <div class="label">Cash</div>
        <div class="value cash-val">&#8369;${(cash?.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
        <div class="sub">${cash?.count || 0} transactions &middot; ${cashPct}% of total</div>
        <div class="bar-track"><div style="height:100%;width:${cashPct}%;background:#10b981;border-radius:9999px"></div></div>
      </div>
      <div class="split-box">
        <div class="label">Credit</div>
        <div class="value credit-val">&#8369;${(credit?.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
        <div class="sub">${credit?.count || 0} transactions &middot; ${creditPct}% of total</div>
        <div class="bar-track"><div style="height:100%;width:${creditPct}%;background:#3b82f6;border-radius:9999px"></div></div>
      </div>
    </div>
  </div>

  ${(charts?.dailySales || []).length > 0 ? `
  <div class="section">
    <h2>Daily Sales Breakdown</h2>
    <table>
      <thead><tr><th>Date</th><th style="text-align:center">Transactions</th><th style="text-align:right">Sales</th></tr></thead>
      <tbody>${dailyRows}</tbody>
    </table>
  </div>` : ""}

  ${(debtList || []).length > 0 ? `
  <div class="section">
    <h2>Outstanding Balances</h2>
    <table>
      <thead><tr><th style="text-align:center">Rank</th><th>Customer</th><th style="text-align:right">Balance Owed</th></tr></thead>
      <tbody>${debtRows}</tbody>
    </table>
  </div>` : ""}

  ${(recentTransactions || []).length > 0 ? `
  <div class="section">
    <h2>Transactions</h2>
    <table>
      <thead><tr><th>Date</th><th>Receipt #</th><th style="text-align:center">Type</th><th>Customer</th><th style="text-align:right">Total</th></tr></thead>
      <tbody>${txnRows}</tbody>
    </table>
  </div>` : ""}

  <div class="footer">This report was generated automatically by POS System on ${generatedAt}</div>
</body>
</html>`;

    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url  = URL.createObjectURL(blob);

    const iframe = document.createElement("iframe");
    iframe.style.cssText = "position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;border:0;";
    document.body.appendChild(iframe);

    iframe.onload = () => {
      try {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
      } finally {
        setTimeout(() => {
          document.body.removeChild(iframe);
          URL.revokeObjectURL(url);
        }, 2000);
      }
    };

    iframe.src = url;
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
      <div className={`w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200 ${isDarkMode ? "bg-neutral-800" : "bg-neutral-50"}`}
        style={{ maxHeight: "90vh" }}>

        {/* Header */}
        <div className={`px-6 py-5 flex items-center justify-between border-b flex-shrink-0 ${isDarkMode ? "border-neutral-700" : "border-neutral-200"}`}>
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl ${isDarkMode ? "bg-orange-900/30" : "bg-orange-100"}`}>
              <FileText className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <p className={`font-bold text-base ${isDarkMode ? "text-white" : "text-neutral-900"}`}>Analytics Report</p>
              <p className={`text-xs font-medium ${isDarkMode ? "text-neutral-500" : "text-neutral-400"}`}>{rangeLabel}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2.5 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold rounded-xl transition-all shadow-md"
            >
              <Printer className="w-4 h-4" />
              Print / Save PDF
            </button>
            <button
              onClick={onClose}
              className={`p-2 rounded-xl transition-colors ${isDarkMode ? "text-neutral-400 hover:text-white hover:bg-neutral-700" : "text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100"}`}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Preview */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

          {/* Summary KPIs */}
          <div>
            <p className={`text-xs font-bold uppercase tracking-widest mb-3 ${isDarkMode ? "text-neutral-500" : "text-neutral-400"}`}>Sales Summary</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: "Total Sales",   value: fmt(summary?.totalSales),         sub: `${summary?.totalTransactions || 0} txn` },
                { label: "Cash Sales",    value: fmt(summary?.cashSales),           sub: `${charts?.paymentDistribution?.cash?.count || 0} txn` },
                { label: "Credit Sales",  value: fmt(summary?.creditSales),         sub: `${charts?.paymentDistribution?.credit?.count || 0} txn` },
                { label: "Outstanding",   value: fmt(summary?.outstandingBalance),  sub: `${summary?.customersWithDebt || 0} customers` },
              ].map(({ label, value, sub }) => (
                <div key={label} className={`rounded-xl p-3 border ${isDarkMode ? "bg-neutral-700/50 border-neutral-600" : "bg-neutral-100 border-neutral-200"}`}>
                  <p className={`text-xs font-semibold uppercase tracking-wide mb-1 ${isDarkMode ? "text-neutral-500" : "text-neutral-400"}`}>{label}</p>
                  <p className={`text-base font-black ${isDarkMode ? "text-white" : "text-neutral-900"}`}>{value}</p>
                  <p className={`text-xs mt-0.5 ${isDarkMode ? "text-neutral-500" : "text-neutral-400"}`}>{sub}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Payment split */}
          <div>
            <p className={`text-xs font-bold uppercase tracking-widest mb-3 ${isDarkMode ? "text-neutral-500" : "text-neutral-400"}`}>Payment Distribution</p>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Cash",   amt: charts?.paymentDistribution?.cash?.amount,   count: charts?.paymentDistribution?.cash?.count,   color: "text-emerald-600", bar: "bg-emerald-500" },
                { label: "Credit", amt: charts?.paymentDistribution?.credit?.amount, count: charts?.paymentDistribution?.credit?.count, color: "text-blue-600",    bar: "bg-blue-500" },
              ].map(({ label, amt, count, color, bar }) => {
                const pct = summary?.totalSales > 0 ? Math.round(((amt || 0) / summary.totalSales) * 100) : 0;
                return (
                  <div key={label} className={`rounded-xl p-3 border ${isDarkMode ? "bg-neutral-700/50 border-neutral-600" : "bg-neutral-100 border-neutral-200"}`}>
                    <p className={`text-xs font-semibold uppercase tracking-wide mb-1 ${isDarkMode ? "text-neutral-500" : "text-neutral-400"}`}>{label}</p>
                    <p className={`text-base font-black ${color}`}>{fmt(amt || 0)}</p>
                    <p className={`text-xs mt-0.5 ${isDarkMode ? "text-neutral-500" : "text-neutral-400"}`}>{count || 0} txn · {pct}%</p>
                    <div className={`h-1.5 rounded-full mt-2 overflow-hidden ${isDarkMode ? "bg-neutral-600" : "bg-neutral-200"}`}>
                      <div className={`h-full rounded-full ${bar}`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Outstanding Balances */}
          {(debtList || []).length > 0 && (
            <div>
              <p className={`text-xs font-bold uppercase tracking-widest mb-3 ${isDarkMode ? "text-neutral-500" : "text-neutral-400"}`}>Outstanding Balances</p>
              <div className={`rounded-xl border overflow-hidden ${isDarkMode ? "border-neutral-700" : "border-neutral-200"}`}>
                {debtList.slice(0, 5).map((c, i) => (
                  <div key={c.customerId} className={`flex items-center justify-between px-4 py-2.5 text-sm ${
                    i < debtList.length - 1 ? (isDarkMode ? "border-b border-neutral-700" : "border-b border-neutral-200") : ""
                  } ${isDarkMode ? (i % 2 === 0 ? "bg-neutral-700/30" : "") : (i % 2 === 0 ? "bg-neutral-100" : "bg-neutral-50")}`}>
                    <div className="flex items-center gap-2">
                      <span className={`w-5 text-center text-xs font-bold ${isDarkMode ? "text-neutral-500" : "text-neutral-400"}`}>{i + 1}</span>
                      <span className={`font-medium ${isDarkMode ? "text-white" : "text-neutral-800"}`}>{c.customerName}</span>
                    </div>
                    <span className="font-bold text-rose-500">{fmt(c.balance)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent transactions */}
          {(recentTransactions || []).length > 0 && (
            <div>
              <p className={`text-xs font-bold uppercase tracking-widest mb-3 ${isDarkMode ? "text-neutral-500" : "text-neutral-400"}`}>Transactions</p>
              <div className={`rounded-xl border overflow-hidden ${isDarkMode ? "border-neutral-700" : "border-neutral-200"}`}>
                {recentTransactions.slice(0, 10).map((t, i) => {
                  const type = t.transactionType;
                  const label = type === "creditPayment"
                    ? `Credit Payment — ${t.customer?.name || "Unknown"}`
                    : type === "cash" ? "Cash Sale"
                    : `Credit — ${t.customer?.name || "Unknown"}`;
                  return (
                    <div key={t._id} className={`flex items-center justify-between px-4 py-2.5 text-sm ${
                      i < recentTransactions.length - 1 ? (isDarkMode ? "border-b border-neutral-700" : "border-b border-neutral-200") : ""
                    } ${isDarkMode ? (i % 2 === 0 ? "bg-neutral-700/30" : "") : (i % 2 === 0 ? "bg-neutral-100" : "bg-neutral-50")}`}>
                      <div>
                        <p className={`font-medium ${isDarkMode ? "text-white" : "text-neutral-800"}`}>
                          {label}
                        </p>
                        <p className={`text-xs ${isDarkMode ? "text-neutral-500" : "text-neutral-400"}`}>
                          {new Date(t.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                          {t.receiptNumber && <span className="ml-1.5 font-mono">· {t.receiptNumber}</span>}
                        </p>
                      </div>
                      <span className={`font-bold ${isDarkMode ? "text-white" : "text-neutral-800"}`}>{fmt(t.total)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <p className={`text-center text-xs pb-2 ${isDarkMode ? "text-neutral-600" : "text-neutral-400"}`}>
            Generated on {generatedAt}
          </p>
        </div>
      </div>
    </div>
  );
}

/* ── Transaction Receipt Modal ─────────────────────────────── */
function TransactionReceiptModal({ transaction: t, isDarkMode, onClose }) {
  const type      = t.transactionType; // 'creditPayment' | 'cash' | 'credit'
  const isPayment = type === "creditPayment";
  const isCash    = type === "cash";

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
      <div className={`w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 ${isDarkMode ? "bg-neutral-800" : "bg-neutral-50"}`}>

        {/* Header */}
        <div className={`px-6 py-5 flex items-center justify-between border-b ${isDarkMode ? "border-neutral-700" : "border-neutral-200"}`}>
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl ${isPayment ? "bg-violet-100 dark:bg-violet-900/30" : isCash ? "bg-emerald-100 dark:bg-emerald-900/30" : "bg-blue-100 dark:bg-blue-900/30"}`}>
              {isPayment
                ? <Wallet className="w-5 h-5 text-violet-600" />
                : isCash
                ? <Wallet className="w-5 h-5 text-emerald-600" />
                : <CreditCard className="w-5 h-5 text-blue-600" />
              }
            </div>
            <div>
              <p className={`font-bold text-base ${isDarkMode ? "text-white" : "text-neutral-900"}`}>
                {isPayment ? "Credit Payment" : isCash ? "Cash Sale" : "Credit Sale"}
              </p>
              <p className={`text-xs font-mono ${isDarkMode ? "text-neutral-500" : "text-neutral-400"}`}>
                {t.receiptNumber}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`p-2 rounded-xl transition-colors ${isDarkMode ? "text-neutral-400 hover:text-white hover:bg-neutral-700" : "text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100"}`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Meta row */}
        <div className={`px-6 py-4 flex items-center justify-between text-sm border-b ${isDarkMode ? "border-neutral-700" : "border-neutral-200"}`}>
          <span className={isDarkMode ? "text-neutral-400" : "text-neutral-500"}>
            {new Date(t.createdAt).toLocaleString("en-US", {
              month: "short", day: "numeric", year: "numeric",
              hour: "2-digit", minute: "2-digit",
            })}
          </span>

          {/* Customer badge */}
          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
            isPayment
              ? isDarkMode ? "bg-violet-900/30 text-violet-400" : "bg-violet-100 text-violet-700"
              : isCash
              ? isDarkMode ? "bg-emerald-900/30 text-emerald-400" : "bg-emerald-100 text-emerald-700"
              : isDarkMode ? "bg-blue-900/30 text-blue-400" : "bg-blue-100 text-blue-700"
          }`}>
            <User className="w-3 h-3" />
            {isCash
              ? (t.cashCustomerName || "Walk-in")
              : (t.customer?.name || "Unknown")}
          </div>
        </div>

        {/* Items / Payment Detail */}
        <div className="px-6 py-4 max-h-64 overflow-y-auto space-y-3">
          {isPayment ? (
            /* Credit payment — show payment summary */
            <div className={`rounded-xl p-4 flex flex-col gap-3 ${isDarkMode ? "bg-violet-900/20 border border-violet-800/40" : "bg-violet-50 border border-violet-100"}`}>
              <div className="flex items-center gap-2">
                <Wallet className="w-4 h-4 text-violet-500 flex-shrink-0" />
                <p className={`text-sm font-semibold ${isDarkMode ? "text-violet-300" : "text-violet-700"}`}>
                  Credit Balance Payment
                </p>
              </div>
              {t.customer?.name && (
                <div className="flex justify-between text-sm">
                  <span className={isDarkMode ? "text-neutral-400" : "text-neutral-500"}>Customer</span>
                  <span className={`font-semibold ${isDarkMode ? "text-white" : "text-neutral-800"}`}>{t.customer.name}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className={isDarkMode ? "text-neutral-400" : "text-neutral-500"}>Amount Paid</span>
                <span className="font-bold text-violet-500">{fmt(t.total)}</span>
              </div>
            </div>
          ) : t.items?.length ? (
            t.items.map((item, i) => (
              <div key={i} className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className={`font-semibold text-sm truncate ${isDarkMode ? "text-white" : "text-neutral-800"}`}>
                    {item.name}
                  </p>
                  <p className={`text-xs mt-0.5 ${isDarkMode ? "text-neutral-500" : "text-neutral-400"}`}>
                    {fmt(item.price)} × {item.quantity}
                  </p>
                </div>
                <p className={`font-bold text-sm flex-shrink-0 ${isDarkMode ? "text-white" : "text-neutral-800"}`}>
                  {fmt(item.subtotal)}
                </p>
              </div>
            ))
          ) : (
            <p className={`text-sm text-center py-4 ${isDarkMode ? "text-neutral-500" : "text-neutral-400"}`}>No item details</p>
          )}
        </div>

        {/* Total */}
        <div className={`px-6 py-4 border-t ${isDarkMode ? "border-neutral-700 bg-neutral-900/40" : "border-neutral-200 bg-neutral-100"}`}>
          <div className="flex items-center justify-between">
            <span className={`text-sm font-semibold uppercase tracking-wide ${isDarkMode ? "text-neutral-400" : "text-neutral-500"}`}>
              Total
            </span>
            <span className="text-2xl font-black text-orange-600">{fmt(t.total)}</span>
          </div>
          {!isCash && t.customer?.customerId && (
            <p className={`text-xs mt-1 text-right font-mono ${isDarkMode ? "text-neutral-600" : "text-neutral-400"}`}>
              {t.customer.customerId}
            </p>
          )}
        </div>

      </div>
    </div>
  );
}
