import { useEffect, useState, useRef } from "react";
import { X, Plus, Package, Search, AlertTriangle, Edit2, Archive, Save, Image as ImageIcon, XCircle, TrendingUp, PhilippinePeso, Scan, Tag, SlidersHorizontal, CheckCircle2, Barcode, RotateCcw, Trash2 } from "lucide-react";

import { useDarkMode } from "./contexts/DarkModeContext";
import { useAuth } from "./contexts/AuthContext";
import { apiUrl } from "./config/api";

const INVENTORY_API = apiUrl("/inventory");
const LOW_STOCK_THRESHOLD = 5;

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

const normalizeCategory = (value) => (typeof value === "string" ? value.trim() : "");
const getCategoryLabel = (value) => normalizeCategory(value) || "Uncategorized";

function Inventory({ setToken }) {
  const { isDarkMode } = useDarkMode();
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [stock, setStock] = useState("");
  const [category, setCategory] = useState("");
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [stockFilter, setStockFilter] = useState("all");
  const [sortBy, setSortBy] = useState("name");
  const [notification, setNotification] = useState(null);
  const [editingItem, setEditingItem] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [animateCards, setAnimateCards] = useState(false);

  // Archived items
  const [showArchived, setShowArchived] = useState(false);
  const [archivedProducts, setArchivedProducts] = useState([]);
  const [archivedLoading, setArchivedLoading] = useState(false);
  const [archivedSearch, setArchivedSearch] = useState("");
  const [confirmDeleteArchived, setConfirmDeleteArchived] = useState(null);
  const [confirmRestoreArchived, setConfirmRestoreArchived] = useState(null);

  const [isScanning, setIsScanning] = useState(false);
  const barcodeScanBuffer = useRef("");
  const barcodeScanTimeout = useRef(null);
    
  // Barcode scanner detection
  useEffect(() => {
    const handleKeyPress = (e) => {
      // Ignore if user is typing in an input/textarea (unless it's our search input)
      const isInput = e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA";
      const isSearchInput = e.target.id === "inventory-search";
      
      if (isInput && !isSearchInput) return;

      if (barcodeScanTimeout.current) clearTimeout(barcodeScanTimeout.current);

      if (e.key === "Enter" && barcodeScanBuffer.current.length > 0) {
        e.preventDefault();
        setSearchTerm(barcodeScanBuffer.current);
        barcodeScanBuffer.current = "";
        setIsScanning(false);
        // Focus the search input after scan
        document.getElementById("inventory-search")?.focus();
        return;
      }

      if (e.key.length === 1) {
        barcodeScanBuffer.current += e.key;
        setIsScanning(true);
      }

      barcodeScanTimeout.current = setTimeout(() => {
        barcodeScanBuffer.current = "";
        setIsScanning(false);
      }, 100); // Shorter timeout for faster scanners
    };

    window.addEventListener("keypress", handleKeyPress);

    const focusSearch = setTimeout(() => {
      document.getElementById("inventory-search")?.focus();
    }, 100);

    return () => {
      window.removeEventListener("keypress", handleKeyPress);
      clearTimeout(focusSearch);
      if (barcodeScanTimeout.current) clearTimeout(barcodeScanTimeout.current);
    };
  }, []);
  
    // ========== KEYBOARD SHORTCUTS ==========
    useEffect(() => {
      const handleKeyDown = (e) => {
        // Ctrl+N / Cmd+N → Add new item (manager only)
        if ((e.ctrlKey || e.metaKey) && e.key === "n" && user?.role === "manager") {
          e.preventDefault();
          setShowAddModal(true);
        }
        // Ctrl+K / Cmd+K → Focus search
        if ((e.ctrlKey || e.metaKey) && e.key === "k") {
          e.preventDefault();
          document.getElementById("inventory-search")?.focus();
        }
      };
      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }, [user]);

  const loadItems = async () => {
    try {
      setLoading(true);
      const res = await fetch(INVENTORY_API, {
        headers: {
          Authorization: localStorage.getItem("token"),
        },
      });

      if (res.status === 403) {
        const data = await res.json();
        showNotification(data.message || "You need to be assigned to a manager. Please contact your administrator.", "error");
        setItems([]);
        setLoading(false);
        return;
      }

      const data = await res.json();
      setItems(Array.isArray(data) ? data : []);
      setTimeout(() => setAnimateCards(true), 100);
    } catch (err) {
      console.error("Inventory error:", err);
      showNotification("Failed to load inventory", "error");
    } finally {
      setLoading(false);
    }
  };

  const showNotification = (message, type = "success") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        showNotification("Image size must be less than 5MB", "error");
        return;
      }
      setImage(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const removeImage = () => {
    setImage(null);
    setImagePreview(null);
  };

  const handleEditImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        showNotification("Image size must be less than 5MB", "error");
        return;
      }
      setEditingItem({ ...editingItem, newImage: file, imagePreview: URL.createObjectURL(file) });
    }
  };

  const removeEditImage = () => {
    setEditingItem({ 
      ...editingItem, 
      newImage: null, 
      imagePreview: null,
      image: null  // Also clear existing image
    });
  };

  const addItem = async (e) => {
    e.preventDefault();

    if (!name || !price || !image) return;

    try {
      const formData = new FormData();
      formData.append("name", name);
      formData.append("price", Number(price));
      formData.append("stock", Number(stock) || 0);
      const cleanCategory = normalizeCategory(category);
      if (cleanCategory) formData.append("category", cleanCategory);
      formData.append("image", image);

      const res = await fetch(INVENTORY_API, {
        method: "POST",
        headers: {
          Authorization: localStorage.getItem("token"),
        },
        body: formData,
      });

      if (!res.ok) {
        throw new Error("Failed to add item");
      }

      setName("");
      setPrice("");
      setStock("");
      setCategory("");
      setImage(null);
      setImagePreview(null);
      setShowAddModal(false);
      loadItems();
      showNotification("Item added successfully!");
    } catch (err) {
      console.error("Add item error:", err);
      showNotification("Failed to add item", "error");
    }
  };

  const updateItem = async (id, updatedData) => {
    try {
      const formData = new FormData();
      formData.append("name", updatedData.name);
      formData.append("price", Number(updatedData.price));
      formData.append("stock", Number(updatedData.stock));
      if (updatedData.barcode) formData.append("barcode", updatedData.barcode);
      formData.append("category", normalizeCategory(updatedData.category));
      
      // Handle image updates
      if (updatedData.newImage) {
        // New image uploaded
        formData.append("image", updatedData.newImage);
      } else if (updatedData.image === null && !updatedData.imagePreview) {
        // User explicitly removed the image
        formData.append("deleteImage", "true");
      }

      const res = await fetch(`${INVENTORY_API}/${id}`, {
        method: "PUT",
        headers: {
          Authorization: localStorage.getItem("token"),
        },
        body: formData,
      });

      if (!res.ok) {
        throw new Error("Failed to update item");
      }

      setEditingItem(null);
      setShowEditModal(false);
      loadItems();
      showNotification("Item updated successfully!");
    } catch (err) {
      console.error("Update item error:", err);
      showNotification("Failed to update item", "error");
    }
  };

  const openEditModal = (item) => {
    setEditingItem({ ...item });
    setShowEditModal(true);
  };

  const closeEditModal = () => {
    setEditingItem(null);
    setShowEditModal(false);
  };

  const openDeleteModal = (item) => {
    setItemToDelete(item);
    setShowDeleteModal(true);
  };

  const deleteItem = async () => {
    if (!itemToDelete) return;

    try {
      const res = await fetch(`${INVENTORY_API}/${itemToDelete._id}`, {
        method: "DELETE",
        headers: {
          Authorization: localStorage.getItem("token"),
        },
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Failed to archive item");
      }

      setShowDeleteModal(false);
      setItemToDelete(null);
      loadItems();
      showNotification("Item archived successfully!");
    } catch (err) {
      console.error("Delete item error:", err);
      showNotification(err.message || "Failed to archive item", "error");
      setShowDeleteModal(false);
      setItemToDelete(null);
    }
  };

  const loadArchivedProducts = async () => {
    setArchivedLoading(true);
    try {
      const res = await fetch(`${INVENTORY_API}/archived`, {
        headers: { Authorization: localStorage.getItem("token") },
      });
      if (!res.ok) throw new Error("Failed to load archived items");
      const data = await res.json();
      setArchivedProducts(Array.isArray(data) ? data : []);
    } catch {
      showNotification("Failed to load archived items", "error");
      setArchivedProducts([]);
    } finally {
      setArchivedLoading(false);
    }
  };

  const restoreArchivedProduct = async (product) => {
    try {
      const res = await fetch(`${INVENTORY_API}/${product._id}/restore`, {
        method: "PUT",
        headers: { Authorization: localStorage.getItem("token") },
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to restore");
      }
      setArchivedProducts((prev) => prev.filter((p) => p._id !== product._id));
      showNotification(`"${product.name}" restored successfully`);
    } catch (err) {
      showNotification(err.message, "error");
    }
  };

  const permanentDeleteArchivedProduct = async (product) => {
    try {
      const res = await fetch(`${INVENTORY_API}/${product._id}/permanent`, {
        method: "DELETE",
        headers: { Authorization: localStorage.getItem("token") },
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to delete");
      }
      setArchivedProducts((prev) => prev.filter((p) => p._id !== product._id));
      setConfirmDeleteArchived(null);
      showNotification(`"${product.name}" permanently deleted`);
    } catch (err) {
      showNotification(err.message, "error");
    }
  };

  useEffect(() => {
    loadItems();
  }, []);

  useEffect(() => {
    if (showArchived) loadArchivedProducts();
  }, [showArchived]);

  const activeCategories = [
    "All",
    ...Array.from(new Set(items.map((i) => normalizeCategory(i.category)).filter(Boolean))).sort((a, b) =>
      a.localeCompare(b, undefined, { sensitivity: "base" })
    ),
  ];

  const filteredItems = items
    .filter((item) => {
      const searchLower = searchTerm.trim().toLowerCase();
      const itemCategory = normalizeCategory(item.category);
      const stockCount = Number(item.stock) || 0;
      const matchesName = item.name?.toLowerCase().includes(searchLower);
      const matchesBarcode = item.barcode && item.barcode.toLowerCase().includes(searchLower);
      const matchesCategorySearch = itemCategory.toLowerCase().includes(searchLower);
      const matchesCategory = selectedCategory === "All" || itemCategory === selectedCategory;
      const matchesStock =
        stockFilter === "all" ||
        (stockFilter === "available" && stockCount >= LOW_STOCK_THRESHOLD) ||
        (stockFilter === "low" && stockCount > 0 && stockCount < LOW_STOCK_THRESHOLD) ||
        (stockFilter === "out" && stockCount === 0);

      return (!searchLower || matchesName || matchesBarcode || matchesCategorySearch) && matchesCategory && matchesStock;
    })
    .sort((a, b) => {
      if (sortBy === "price-desc") return (Number(b.price) || 0) - (Number(a.price) || 0);
      if (sortBy === "stock-asc") return (Number(a.stock) || 0) - (Number(b.stock) || 0);
      if (sortBy === "stock-desc") return (Number(b.stock) || 0) - (Number(a.stock) || 0);
      if (sortBy === "category") return getCategoryLabel(a.category).localeCompare(getCategoryLabel(b.category));
      return (a.name || "").localeCompare(b.name || "");
    });

  const totalItems = items.length;
  const totalValue = items.reduce((sum, item) => sum + (Number(item.price) || 0) * (Number(item.stock) || 0), 0);
  const lowStockItems = items.filter((item) => Number(item.stock) > 0 && Number(item.stock) < LOW_STOCK_THRESHOLD).length;
  const outOfStockItems = items.filter((item) => Number(item.stock) === 0).length;

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${
        isDarkMode ? "bg-neutral-900" : "bg-gradient-to-br from-orange-50 via-white to-orange-50"
      }`}>
        <div className="text-center">
          <div className="relative mb-6">
            <div className="w-20 h-20 border-4 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <Package className="w-10 h-10 text-primary-600 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
          </div>
          <p className={`text-lg font-medium ${isDarkMode ? "text-neutral-300" : "text-neutral-600"}`}>
            Loading inventory...
          </p>
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
                <Package className="w-8 h-8 text-orange-600" />
              </div>
              <div>
                <h1 className={`text-3xl sm:text-4xl font-black tracking-tight ${isDarkMode ? "text-white" : "text-neutral-900"}`}>
                  Inventory <span className="text-orange-600">Management</span>
                </h1>
                <p className={`text-base sm:text-lg font-medium mt-1 ${isDarkMode ? "text-neutral-400" : "text-neutral-600"}`}>
                  Track stock levels, item values, categories, and scanner-ready barcodes.
                </p>
              </div>
            </div>
            {user?.role === "manager" && (
              <button
                onClick={() => setShowAddModal(true)}
                className="flex items-center justify-center gap-2 bg-gradient-to-r from-orange-500 to-orange-600 text-white px-6 py-3 rounded-2xl font-bold shadow-lg hover:shadow-orange-500/25 hover:from-orange-600 hover:to-orange-700 active:scale-95 transition-all"
              >
                <Plus className="w-5 h-5" />
                Add Item
              </button>
            )}
          </div>

          {/* ── View Toggle ─────────────────────────────────────── */}
          <div className={`flex items-center gap-1 p-1 rounded-xl border mt-6 w-fit ${isDarkMode ? "bg-neutral-900/60 border-neutral-700" : "bg-neutral-100 border-neutral-200"}`}>
            <button
              onClick={() => setShowArchived(false)}
              className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold transition-all ${!showArchived ? "bg-orange-500 text-white shadow-sm" : isDarkMode ? "text-neutral-400 hover:text-white" : "text-neutral-600 hover:text-neutral-800"}`}
            >
              <Package className="w-4 h-4" />
              Active Items
            </button>
            <button
              onClick={() => setShowArchived(true)}
              className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold transition-all ${showArchived ? "bg-orange-500 text-white shadow-sm" : isDarkMode ? "text-neutral-400 hover:text-white" : "text-neutral-600 hover:text-neutral-800"}`}
            >
              <Archive className="w-4 h-4" />
              Archived
            </button>
          </div>

          {!showArchived && <div className={`grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mt-8 ${
          animateCards ? "opacity-100" : "opacity-0"
        } transition-opacity duration-500`}>
          <StatCard
            icon={<Package className="w-5 h-5" />}
            title="Total items"
            value={totalItems}
            color="orange"
            isDarkMode={isDarkMode}
            delay="0"
            animate={animateCards}
          />
          <StatCard
            icon={<PhilippinePeso className="w-5 h-5" />}
            title="Inventory value"
            value={formatCurrency(totalValue)}
            color="emerald"
            isDarkMode={isDarkMode}
            delay="100"
            animate={animateCards}
            isAmount
          />
          <StatCard
            icon={<AlertTriangle className="w-5 h-5" />}
            title="Low stock"
            value={lowStockItems}
            color="amber"
            isDarkMode={isDarkMode}
            delay="200"
            animate={animateCards}
          />
          <StatCard
            icon={<XCircle className="w-5 h-5" />}
            title="Out of stock"
            value={outOfStockItems}
            color="rose"
            isDarkMode={isDarkMode}
            delay="300"
            animate={animateCards}
          />
        </div>}

        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">

      {/* ── Archived Items View ──────────────────────────────── */}
      {showArchived && (
        <div>
          {/* Search */}
          <div className={`rounded-2xl border p-4 mb-8 shadow-sm ${isDarkMode ? "bg-neutral-800 border-neutral-700" : "bg-white border-neutral-200"}`}>
            <div className="relative group">
              <Search className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 transition-colors ${isDarkMode ? "text-neutral-500 group-focus-within:text-orange-500" : "text-neutral-400 group-focus-within:text-orange-500"}`} />
              <input
                type="text"
                placeholder="Search archived items by name, category, or barcode..."
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
                <p className={`font-medium ${isDarkMode ? "text-neutral-400" : "text-neutral-600"}`}>Loading archived items...</p>
              </div>
            </div>
          ) : (() => {
            const filtered = archivedProducts.filter((p) => {
              const q = archivedSearch.trim().toLowerCase();
              return (
                !q ||
                p.name?.toLowerCase().includes(q) ||
                normalizeCategory(p.category).toLowerCase().includes(q) ||
                p.barcode?.toLowerCase().includes(q)
              );
            });
            return filtered.length === 0 ? (
              <div className={`text-center py-20 rounded-3xl border-2 border-dashed ${isDarkMode ? "border-neutral-800 bg-neutral-800/30" : "border-neutral-200 bg-white"}`}>
                <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 ${isDarkMode ? "bg-neutral-700" : "bg-neutral-100"}`}>
                  <Archive className="w-10 h-10 text-neutral-400" />
                </div>
                <h3 className={`text-2xl font-bold mb-2 ${isDarkMode ? "text-white" : "text-neutral-800"}`}>
                  {archivedProducts.length === 0 ? "No archived items" : "No results found"}
                </h3>
                <p className={isDarkMode ? "text-neutral-400" : "text-neutral-600"}>
                  {archivedProducts.length === 0 ? "Items you archive will appear here." : "Try a different search term."}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 pb-6">
                {filtered.map((product) => (
                  <ArchivedInventoryCard
                    key={product._id}
                    product={product}
                    isDarkMode={isDarkMode}
                    onRestore={() => setConfirmRestoreArchived(product)}
                    onDelete={() => setConfirmDeleteArchived(product)}
                  />
                ))}
              </div>
            );
          })()}
        </div>
      )}

      {/* ── Active Items View ──────────────────────────────────── */}
      {!showArchived && (<><div className={`rounded-2xl border p-4 mb-6 shadow-sm ${isDarkMode ? "bg-neutral-800 border-neutral-700" : "bg-white border-neutral-200"}`}>
          <div className="flex flex-col xl:flex-row gap-4">
          <div className="relative group flex-1">
            <Search className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 transition-colors ${isDarkMode ? "text-neutral-500 group-focus-within:text-orange-500" : "text-neutral-400 group-focus-within:text-orange-500"}`} />
            <input
              type="text"
              id="inventory-search"
              placeholder="Search by item name, category, or barcode..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onFocus={(e) => e.target.select()}
              autoComplete="off"
              className={`w-full pl-12 pr-12 py-3.5 rounded-xl border-2 focus:outline-none focus:border-orange-500 transition-all text-base ${isDarkMode ? "bg-neutral-900/60 border-neutral-700 text-white placeholder-neutral-500" : "bg-neutral-50 border-neutral-200 text-neutral-800 placeholder-neutral-400"}`}
            />
            {searchTerm ? (
              <button
                onClick={() => setSearchTerm("")}
                className={`absolute right-4 top-1/2 -translate-y-1/2 transition-colors ${isDarkMode ? "text-neutral-500 hover:text-neutral-300" : "text-neutral-400 hover:text-neutral-600"}`}
                title="Clear search"
              >
                <XCircle className="w-5 h-5" />
              </button>
            ) : (
              <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2 pointer-events-none">
                <span className="hidden sm:inline text-xs font-bold text-orange-500 uppercase tracking-wider">
                  Scanner ready
                </span>
                <Scan className={`w-5 h-5 ${isScanning ? "text-emerald-500 animate-pulse" : "text-orange-500"}`} />
              </div>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <SegmentedControl
              value={stockFilter}
              onChange={setStockFilter}
              options={[
                ["all", "All"],
                ["available", "Available"],
                ["low", "Low"],
                ["out", "Out"],
              ]}
              isDarkMode={isDarkMode}
            />

            <label className={`flex items-center gap-2 px-3 py-2 rounded-xl border ${isDarkMode ? "bg-neutral-900/60 border-neutral-700 text-neutral-400" : "bg-neutral-50 border-neutral-200 text-neutral-500"}`}>
              <SlidersHorizontal className="w-4 h-4 flex-shrink-0" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className={`bg-transparent text-sm font-semibold focus:outline-none ${isDarkMode ? "text-neutral-200" : "text-neutral-700"}`}
              >
                <option value="name">Name A-Z</option>
                <option value="category">Category</option>
                <option value="stock-asc">Lowest stock</option>
                <option value="stock-desc">Highest stock</option>
                <option value="price-desc">Highest price</option>
              </select>
            </label>
          </div>
        </div>

        {activeCategories.length > 1 && (
          <div className={`mt-4 pt-4 border-t ${isDarkMode ? "border-neutral-700" : "border-neutral-100"}`}>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {activeCategories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold border transition-all whitespace-nowrap ${
                  selectedCategory === cat
                    ? "bg-orange-500 text-white border-orange-500 shadow-md"
                    : isDarkMode
                    ? "bg-neutral-900/60 border-neutral-700 text-neutral-300 hover:border-orange-500 hover:text-orange-400"
                    : "bg-neutral-50 border-neutral-200 text-neutral-600 hover:border-orange-400 hover:text-orange-600"
                }`}
              >
                {cat !== "All" && <Tag className="w-3.5 h-3.5" />}
                {cat}
                <span className={`text-xs px-1.5 py-0.5 rounded-full ml-0.5 ${
                  selectedCategory === cat
                    ? "bg-white/20 text-white"
                    : isDarkMode ? "bg-neutral-700 text-neutral-400" : "bg-neutral-100 text-neutral-500"
                }`}>
                  {cat === "All" ? items.length : items.filter((i) => normalizeCategory(i.category) === cat).length}
                </span>
              </button>
            ))}
          </div>
          </div>
        )}

        {(searchTerm || selectedCategory !== "All" || stockFilter !== "all") && (
          <div className={`mt-4 pt-4 border-t text-sm font-medium flex items-center justify-between gap-3 ${isDarkMode ? "border-neutral-700 text-neutral-400" : "border-neutral-100 text-neutral-500"}`}>
            <span>Showing {filteredItems.length} of {items.length} items</span>
            <button
              onClick={() => {
                setSearchTerm("");
                setSelectedCategory("All");
                setStockFilter("all");
              }}
              className={isDarkMode ? "text-orange-400 hover:text-orange-300" : "text-orange-600 hover:text-orange-700"}
            >
              Clear filters
            </button>
          </div>
        )}
        </div>

        {filteredItems.length === 0 ? (
          <div className={`text-center py-20 rounded-3xl border-2 border-dashed ${isDarkMode ? "border-neutral-800 bg-neutral-800/30" : "border-neutral-200 bg-white"}`}>
            <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 ${isDarkMode ? "bg-neutral-700" : "bg-neutral-100"}`}>
              {items.length === 0 ? (
                <Package className="w-10 h-10 text-neutral-400" />
              ) : (
                <Search className="w-10 h-10 text-neutral-400" />
              )}
            </div>
            <h3 className={`text-2xl font-bold mb-2 ${isDarkMode ? "text-white" : "text-neutral-800"}`}>
              {items.length === 0 ? "No inventory items" : "No items found"}
            </h3>
            <p className={isDarkMode ? "text-neutral-400" : "text-neutral-600"}>
              {items.length === 0 ? "Add your first item to start tracking stock." : "Try a different search term, category, or stock filter."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 pb-6">
            {filteredItems.map((item, index) => (
              <ItemCard
                key={item._id}
                item={item}
                isDarkMode={isDarkMode}
                isManager={user?.role === "manager"}
                onEdit={() => openEditModal(item)}
                onDelete={() => openDeleteModal(item)}
                animate={animateCards}
                delay={400 + (index * 35)}
              />
            ))}
          </div>
        )}</> )}
      </div>

      {/* Add Item Modal */}
      {showAddModal && (
        <AddItemModal
          isDarkMode={isDarkMode}
          name={name}
          price={price}
          stock={stock}
          category={category}
          existingCategories={activeCategories.filter(c => c !== "All")}
          imagePreview={imagePreview}
          onNameChange={(e) => setName(e.target.value)}
          onPriceChange={(e) => setPrice(e.target.value)}
          onStockChange={(e) => setStock(Math.max(0, e.target.value))}
          onCategoryChange={(e) => setCategory(e.target.value)}
          onImageChange={handleImageChange}
          onRemoveImage={removeImage}
          onSubmit={addItem}
          onClose={() => {
            setShowAddModal(false);
            setName("");
            setPrice("");
            setStock("");
            setCategory("");
            setImage(null);
            setImagePreview(null);
          }}
        />
      )}

      {/* Edit Item Modal */}
      {showEditModal && editingItem && (
        <EditItemModal
          isDarkMode={isDarkMode}
          item={editingItem}
          existingCategories={activeCategories.filter(c => c !== "All")}
          onItemChange={setEditingItem}
          onImageChange={handleEditImageChange}
          onRemoveImage={removeEditImage}
          onSubmit={(e) => {
            e.preventDefault();
            updateItem(editingItem._id, editingItem);
          }}
          onClose={closeEditModal}
        />
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && itemToDelete && (
        <DeleteConfirmationModal
          item={itemToDelete}
          isDarkMode={isDarkMode}
          onConfirm={deleteItem}
          onCancel={() => {
            setShowDeleteModal(false);
            setItemToDelete(null);
          }}
        />
      )}

      {/* Restore Confirmation Modal */}
      {confirmRestoreArchived && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className={`rounded-2xl shadow-2xl max-w-md w-full p-6 animate-in zoom-in duration-300 ${isDarkMode ? "bg-neutral-800" : "bg-white"}`}>
            <div className="mb-6 text-center">
              <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${isDarkMode ? "bg-orange-900/30" : "bg-orange-100"}`}>
                <RotateCcw className="w-8 h-8 text-orange-600" />
              </div>
              <h3 className={`text-xl font-bold mb-2 ${isDarkMode ? "text-white" : "text-neutral-800"}`}>
                Restore Item?
              </h3>
              <p className={isDarkMode ? "text-neutral-400" : "text-neutral-600"}>
                <span className="font-semibold">"{confirmRestoreArchived.name}"</span> will be moved back to active inventory.
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
                onClick={() => { restoreArchivedProduct(confirmRestoreArchived); setConfirmRestoreArchived(null); }}
                className="flex-1 px-5 py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-xl font-semibold hover:from-orange-600 hover:to-orange-700 transition-all shadow-md active:scale-95 flex items-center justify-center gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                Restore
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Permanent Delete Confirmation Modal */}
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
                This will permanently delete <span className="font-semibold">"{confirmDeleteArchived.name}"</span>. This cannot be undone.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDeleteArchived(null)}
                className={`flex-1 px-5 py-3 border-2 rounded-xl font-semibold transition-all ${isDarkMode ? "border-neutral-600 text-neutral-300 hover:bg-neutral-700" : "border-neutral-300 text-neutral-700 hover:bg-neutral-50"}`}
              >
                Cancel
              </button>
              <button
                onClick={() => permanentDeleteArchivedProduct(confirmDeleteArchived)}
                className="flex-1 px-5 py-3 bg-rose-600 text-white rounded-xl font-semibold hover:bg-rose-700 transition-all"
              >
                Delete Forever
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Notification Toast */}
      {notification && (
        <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom duration-300">
          <div
            className={`px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3 ${
              notification.type === "error"
                ? "bg-rose-600 text-white"
                : "bg-emerald-600 text-white"
            }`}
          >
            <div className="flex-1 font-medium">{notification.message}</div>
            <button
              onClick={() => setNotification(null)}
              className="text-white opacity-75 hover:opacity-100 transition-opacity"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
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

// Stat Card Component
function StatCard({ icon, title, value, color, isDarkMode, delay, animate, isAmount }) {
  const colorClasses = {
    orange: {
      bg: isDarkMode ? "bg-orange-900/30" : "bg-orange-100",
      text: "text-orange-600",
    },
    emerald: {
      bg: isDarkMode ? "bg-emerald-900/30" : "bg-emerald-100",
      text: "text-emerald-600",
    },
    amber: {
      bg: isDarkMode ? "bg-amber-900/30" : "bg-amber-100",
      text: "text-amber-600",
    },
    rose: {
      bg: isDarkMode ? "bg-rose-900/30" : "bg-rose-100",
      text: "text-rose-600",
    },
  };

  return (
    <div
      className={`rounded-2xl border p-5 shadow-sm transition-all ${
        isDarkMode ? "bg-neutral-900/40 border-neutral-700" : "bg-neutral-50 border-neutral-100"
      } ${animate ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      <div className="flex items-center gap-3">
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${colorClasses[color].bg}`}>
          <div className={colorClasses[color].text}>
            {icon}
          </div>
        </div>
        <div className="min-w-0">
          <p className={`text-xs font-bold uppercase tracking-wide ${isDarkMode ? "text-neutral-500" : "text-neutral-500"}`}>
            {title}
          </p>
          <p className={`font-black truncate ${isAmount ? "text-xl" : "text-2xl"} ${isAmount ? colorClasses[color].text : isDarkMode ? "text-white" : "text-neutral-900"}`}>
            {value}
          </p>
        </div>
      </div>
    </div>
  );
}

// Item Card Component
function ItemCard({ item, isDarkMode, isManager, onEdit, onDelete, animate, delay }) {
  const stock = Number(item.stock) || 0;
  const price = Number(item.price) || 0;
  const itemValue = price * stock;
  const status =
    stock === 0
      ? {
          label: "Out",
          icon: <XCircle className="w-3 h-3" />,
          className: isDarkMode
            ? "bg-rose-950/80 text-rose-200 border border-rose-700/60"
            : "bg-rose-50 text-rose-700 border border-rose-200",
          accent: "bg-rose-500",
        }
      : stock < LOW_STOCK_THRESHOLD
      ? {
          label: "Low",
          icon: <AlertTriangle className="w-3 h-3" />,
          className: isDarkMode
            ? "bg-amber-950/80 text-amber-200 border border-amber-700/60"
            : "bg-amber-50 text-amber-700 border border-amber-200",
          accent: "bg-amber-500",
        }
      : {
          label: "Available",
          icon: <CheckCircle2 className="w-3 h-3" />,
          className: isDarkMode
            ? "bg-emerald-950/80 text-emerald-200 border border-emerald-700/60"
            : "bg-emerald-50 text-emerald-700 border border-emerald-200",
          accent: "bg-emerald-500",
        };

  return (
    <div
      className={`rounded-2xl overflow-hidden shadow-md border transition-all hover:shadow-xl hover:-translate-y-0.5 ${
        isDarkMode ? "bg-neutral-800/90 border-neutral-700/80 hover:border-neutral-500" : "bg-white border-neutral-200 hover:border-orange-200"
      } ${animate ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      <div className={`h-1 ${status.accent}`} />

      <div className={`relative aspect-[4/3] ${isDarkMode ? "bg-neutral-900/50" : "bg-neutral-50"}`}>
        {item.image ? (
          <img
            src={item.image}
            alt={item.name}
            className="w-full h-full object-cover"
            onError={(e) => {
              e.target.style.display = "none";
            }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ImageIcon className={`w-12 h-12 ${isDarkMode ? "text-neutral-700" : "text-neutral-300"}`} />
          </div>
        )}
        <div className={`absolute top-3 right-3 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold shadow-sm backdrop-blur-sm ${status.className}`}>
          {status.icon}
          {status.label}
        </div>
      </div>

      <div className="p-5">
        <div className="min-h-[5.75rem]">
          <h3 className={`font-black text-lg leading-tight line-clamp-2 ${isDarkMode ? "text-white" : "text-neutral-900"}`}>
            {item.name}
          </h3>
          {/* Tags — single row, barcode truncates to avoid wrapping */}
          <div className="flex items-center gap-2 mt-3 min-w-0 overflow-hidden">
            <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full border flex-shrink-0 max-w-[45%] ${
              isDarkMode ? "bg-amber-500/10 text-amber-300 border-amber-500/20" : "bg-amber-50 text-amber-700 border-amber-200"
            }`}>
              <Tag className="w-3 h-3 flex-shrink-0" />
              <span className="truncate">{getCategoryLabel(item.category)}</span>
            </span>
            {item.barcode && (
              <span
                title={item.barcode}
                className={`flex items-center gap-1 text-xs font-mono px-2.5 py-1 rounded-full border min-w-0 flex-1 ${
                  isDarkMode ? "bg-neutral-700/70 text-neutral-300 border-neutral-600/70" : "bg-neutral-100 text-neutral-600 border-neutral-200"
                }`}
              >
                <Barcode className="w-3 h-3 flex-shrink-0" />
                <span className="truncate">{item.barcode}</span>
              </span>
            )}
          </div>
        </div>

        <div className={`rounded-xl border divide-y text-sm mt-4 ${isDarkMode ? "bg-neutral-900/45 border-neutral-700/80 divide-neutral-700/80" : "bg-neutral-50 border-neutral-100 divide-neutral-200"}`}>
          <div className="flex items-center justify-between gap-4 px-4 py-3">
            <span className={isDarkMode ? "text-neutral-400" : "text-neutral-500"}>Price</span>
            <span className={`font-black ${isDarkMode ? "text-orange-400" : "text-orange-600"}`}>{formatCurrency(price)}</span>
          </div>
          <div className="flex items-center justify-between gap-4 px-4 py-3">
            <span className={isDarkMode ? "text-neutral-400" : "text-neutral-500"}>Stock</span>
            <span className={`font-black ${stock === 0 ? "text-rose-500" : stock < LOW_STOCK_THRESHOLD ? "text-amber-600" : isDarkMode ? "text-white" : "text-neutral-900"}`}>
              {stock}
            </span>
          </div>
          <div className="flex items-center justify-between gap-4 px-4 py-3">
            <span className={isDarkMode ? "text-neutral-400" : "text-neutral-500"}>Stock value</span>
            <span className={`font-semibold ${isDarkMode ? "text-neutral-300" : "text-neutral-700"}`}>{formatCurrency(itemValue)}</span>
          </div>
        </div>
      </div>

      {isManager && (
        <div className={`px-5 py-4 flex gap-2 border-t ${isDarkMode ? "border-neutral-700/80 bg-neutral-900/30" : "border-neutral-100 bg-neutral-50/70"}`}>
          <button
            onClick={onEdit}
            className={`flex-1 px-3 py-2.5 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 active:scale-95 ${
              isDarkMode
                ? "bg-neutral-700/80 text-neutral-100 hover:bg-neutral-600"
                : "bg-neutral-100 text-neutral-700 hover:bg-neutral-200"
            }`}
          >
            <Edit2 className="w-4 h-4" />
            Edit
          </button>
          <button
            onClick={onDelete}
            className={`w-11 h-11 rounded-xl font-semibold transition-all flex items-center justify-center active:scale-95 ${
              isDarkMode
                ? "bg-rose-500/15 text-rose-300 hover:bg-rose-500/25"
                : "bg-rose-50 text-rose-600 hover:bg-rose-100"
            }`}
            aria-label={`Archive ${item.name}`}
          >
            <Archive className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}

// Add Item Modal Component
function AddItemModal({
  isDarkMode,
  name,
  price,
  stock,
  category,
  existingCategories = [],
  imagePreview,
  onNameChange,
  onPriceChange,
  onStockChange,
  onCategoryChange,
  onImageChange,
  onRemoveImage,
  onSubmit,
  onClose
}) {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-300">
      <div className={`rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-hidden flex flex-col animate-in zoom-in duration-300 ${
        isDarkMode ? "bg-neutral-800" : "bg-white"
      }`}>
        <div className={`p-6 border-b ${isDarkMode ? "border-neutral-700" : "border-neutral-200"}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-xl ${isDarkMode ? "bg-orange-900/30" : "bg-orange-100"}`}>
                <Plus className="w-6 h-6 text-orange-600" />
              </div>
              <div>
                <h3 className={`text-xl font-bold ${isDarkMode ? "text-white" : "text-neutral-800"}`}>
                  Add New Item
                </h3>
                <p className={`text-sm ${isDarkMode ? "text-neutral-400" : "text-neutral-600"}`}>
                  Enter the item details
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className={`p-2 rounded-xl transition-colors ${isDarkMode ? "text-neutral-400 hover:text-white hover:bg-neutral-700" : "text-neutral-600 hover:text-neutral-800 hover:bg-neutral-100"}`}
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <form onSubmit={onSubmit} className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
            <div>
              <label className={`block text-sm font-medium mb-2 ${isDarkMode ? "text-neutral-300" : "text-neutral-700"}`}>
                Item Name
              </label>
              <input
                className={`w-full border-2 px-4 py-3 rounded-xl focus:outline-none focus:border-orange-500 transition-all ${
                  isDarkMode ? "bg-neutral-700 border-neutral-600 text-white placeholder-neutral-400" : "bg-white border-neutral-200 text-neutral-800 placeholder-neutral-500"
                }`}
                value={name}
                onChange={onNameChange}
                required
              />
            </div>

            <div>
              <label className={`block text-sm font-medium mb-2 ${isDarkMode ? "text-neutral-300" : "text-neutral-700"}`}>
                Price (PHP)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                max="99999"
                placeholder="0.00"
                className={`w-full border-2 px-4 py-3 rounded-xl focus:outline-none focus:border-orange-500 transition-all [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none ${
                  isDarkMode ? "bg-neutral-700 border-neutral-600 text-white placeholder-neutral-400" : "bg-white border-neutral-200 text-neutral-800 placeholder-neutral-500"
                }`}
                value={price}
                onChange={(e) => { if (e.target.value === "" || /^\d{0,5}(\.\d{0,2})?$/.test(e.target.value)) onPriceChange(e); }}
                required
              />
            </div>

            <div>
              <label className={`block text-sm font-medium mb-2 ${isDarkMode ? "text-neutral-300" : "text-neutral-700"}`}>
                Initial Stock
              </label>
              <input
                type="number"
                min="0"
                max="99999"
                placeholder="0"
                className={`w-full border-2 px-4 py-3 rounded-xl focus:outline-none focus:border-orange-500 transition-all [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none ${
                  isDarkMode ? "bg-neutral-700 border-neutral-600 text-white placeholder-neutral-400" : "bg-white border-neutral-200 text-neutral-800 placeholder-neutral-500"
                }`}
                value={stock}
                onChange={(e) => { if (e.target.value === "" || /^\d{0,5}$/.test(e.target.value)) onStockChange(e); }}
              />
            </div>

            <div>
              <label className={`block text-sm font-medium mb-2 ${isDarkMode ? "text-neutral-300" : "text-neutral-700"}`}>
                Category (Optional)
              </label>
              <CategoryChooser
                value={category}
                categories={existingCategories}
                isDarkMode={isDarkMode}
                onChange={onCategoryChange}
                inputId="add-category"
              />
            </div>

            <div>
              <label className={`block text-sm font-medium mb-2 ${isDarkMode ? "text-neutral-300" : "text-neutral-700"}`}>
                Product Image <span className="text-rose-500">*</span>
              </label>
              <div className={`border-2 border-dashed rounded-xl p-3 transition-colors ${
                imagePreview
                  ? isDarkMode ? "border-orange-500/50" : "border-orange-400"
                  : isDarkMode ? "border-neutral-600 hover:border-orange-500/50" : "border-neutral-300 hover:border-orange-400"
              }`}>
                {imagePreview ? (
                  <div className="relative">
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="w-full max-h-40 object-contain rounded-lg"
                    />
                    <button
                      type="button"
                      onClick={onRemoveImage}
                      className="absolute top-2 right-2 bg-rose-600 text-white p-2 rounded-full hover:bg-rose-700 transition-colors shadow-lg"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <label className="cursor-pointer flex flex-col items-center justify-center py-8">
                    <ImageIcon className={`w-12 h-12 mb-2 ${isDarkMode ? "text-neutral-500" : "text-neutral-400"}`} />
                    <span className={`text-sm font-medium ${isDarkMode ? "text-neutral-400" : "text-neutral-600"}`}>
                      Click to upload image
                    </span>
                    <span className={`text-xs mt-1 ${isDarkMode ? "text-neutral-500" : "text-neutral-500"}`}>
                      PNG, JPG, GIF up to 5MB
                    </span>
                    <input
                      type="file"
                      className="hidden"
                      accept="image/*"
                      required
                      onChange={onImageChange}
                    />
                  </label>
                )}
              </div>
            </div>
          </div>

          <div className={`p-6 border-t ${isDarkMode ? "border-neutral-700" : "border-neutral-200"}`}>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className={`flex-1 px-6 py-3 border-2 rounded-xl font-semibold transition-all transform hover:scale-105 active:scale-95 ${
                  isDarkMode 
                    ? "border-neutral-600 text-neutral-300 hover:bg-neutral-700" 
                    : "border-neutral-300 text-neutral-700 hover:bg-neutral-50"
                }`}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 px-6 py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-xl font-semibold hover:from-orange-600 hover:to-orange-700 transition-all flex items-center justify-center gap-2 shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95"
              >
                <Plus className="w-5 h-5" />
                Add Item
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

// Edit Item Modal Component
function EditItemModal({ isDarkMode, item, existingCategories = [], onItemChange, onImageChange, onRemoveImage, onSubmit, onClose }) {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-300">
      <div className={`rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-hidden flex flex-col animate-in zoom-in duration-300 ${
        isDarkMode ? "bg-neutral-800" : "bg-white"
      }`}>
        <div className={`p-6 border-b ${isDarkMode ? "border-neutral-700" : "border-neutral-200"}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-xl ${isDarkMode ? "bg-orange-900/30" : "bg-orange-100"}`}>
                <Edit2 className="w-6 h-6 text-orange-600" />
              </div>
              <div>
                <h3 className={`text-xl font-bold ${isDarkMode ? "text-white" : "text-neutral-800"}`}>
                  Edit Item
                </h3>
                <p className={`text-sm ${isDarkMode ? "text-neutral-400" : "text-neutral-600"}`}>
                  Update item details
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className={`p-2 rounded-xl transition-colors ${isDarkMode ? "text-neutral-400 hover:text-white hover:bg-neutral-700" : "text-neutral-600 hover:text-neutral-800 hover:bg-neutral-100"}`}
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <form onSubmit={onSubmit} className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
            <div>
              <label className={`block text-sm font-medium mb-2 ${isDarkMode ? "text-neutral-300" : "text-neutral-700"}`}>
                Item Name
              </label>
              <input
                placeholder="e.g., Laptop, Mouse, Keyboard"
                className={`w-full border-2 px-4 py-3 rounded-xl focus:outline-none focus:border-orange-500 transition-all ${
                  isDarkMode ? "bg-neutral-700 border-neutral-600 text-white placeholder-neutral-400" : "bg-white border-neutral-200 text-neutral-800 placeholder-neutral-500"
                }`}
                value={item.name}
                onChange={(e) => onItemChange({ ...item, name: e.target.value })}
                required
              />
            </div>

            <div>
              <label className={`block text-sm font-medium mb-2 ${isDarkMode ? "text-neutral-300" : "text-neutral-700"}`}>
                Price (PHP)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                max="99999"
                placeholder="0.00"
                className={`w-full border-2 px-4 py-3 rounded-xl focus:outline-none focus:border-orange-500 transition-all [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none ${
                  isDarkMode ? "bg-neutral-700 border-neutral-600 text-white placeholder-neutral-400" : "bg-white border-neutral-200 text-neutral-800 placeholder-neutral-500"
                }`}
                value={item.price}
                onChange={(e) => { if (e.target.value === "" || /^\d{0,5}(\.\d{0,2})?$/.test(e.target.value)) onItemChange({ ...item, price: e.target.value }); }}
                required
              />
            </div>

            <div>
              <label className={`block text-sm font-medium mb-2 ${isDarkMode ? "text-neutral-300" : "text-neutral-700"}`}>
                Stock
              </label>
              <input
                type="number"
                min="0"
                max="99999"
                placeholder="0"
                className={`w-full border-2 px-4 py-3 rounded-xl focus:outline-none focus:border-orange-500 transition-all [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none ${
                  isDarkMode ? "bg-neutral-700 border-neutral-600 text-white placeholder-neutral-400" : "bg-white border-neutral-200 text-neutral-800 placeholder-neutral-500"
                }`}
                value={item.stock}
                onChange={(e) => { if (e.target.value === "" || /^\d{0,5}$/.test(e.target.value)) onItemChange({ ...item, stock: e.target.value }); }}
                required
              />
            </div>

            <div>
              <label className={`block text-sm font-medium mb-2 ${isDarkMode ? "text-neutral-300" : "text-neutral-700"}`}>
                Barcode (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g., 1234567890123"
                className={`w-full border-2 px-4 py-3 rounded-xl focus:outline-none focus:border-orange-500 transition-all ${
                  isDarkMode ? "bg-neutral-700 border-neutral-600 text-white placeholder-neutral-400" : "bg-white border-neutral-200 text-neutral-800 placeholder-neutral-500"
                }`}
                value={item.barcode || ''}
                onChange={(e) => onItemChange({ ...item, barcode: e.target.value })}
                onKeyDown={(e) => { if (e.key === "Enter") e.preventDefault(); }}
              />
            </div>

            <div>
              <label className={`block text-sm font-medium mb-2 ${isDarkMode ? "text-neutral-300" : "text-neutral-700"}`}>
                Category (Optional)
              </label>
              <CategoryChooser
                value={item.category || ""}
                categories={existingCategories}
                isDarkMode={isDarkMode}
                onChange={(e) => onItemChange({ ...item, category: e.target.value })}
                inputId="edit-category"
              />
            </div>

            <div>
              <label className={`block text-sm font-medium mb-2 ${isDarkMode ? "text-neutral-300" : "text-neutral-700"}`}>
                Product Image (Optional)
              </label>
              <div className={`border-2 border-dashed rounded-xl p-3 transition-colors ${
                isDarkMode ? "border-neutral-600 hover:border-neutral-500" : "border-neutral-300 hover:border-neutral-400"
              }`}>
                {item.imagePreview || item.image ? (
                  <div className="relative">
                    <img 
                      src={item.imagePreview || item.image}
                      alt="Preview" 
                      className="w-full h-48 object-cover rounded-lg"
                    />
                    <button
                      type="button"
                      onClick={onRemoveImage}
                      className="absolute top-2 right-2 bg-rose-600 text-white p-2 rounded-full hover:bg-rose-700 transition-colors shadow-lg"
                      title="Remove image"
                    >
                      <X className="w-4 h-4" />
                    </button>
                    <label 
                      className="absolute bottom-2 right-2 bg-orange-600 text-white p-2 rounded-full hover:bg-orange-700 transition-colors cursor-pointer shadow-lg"
                      title="Change image"
                    >
                      <Edit2 className="w-4 h-4" />
                      <input
                        type="file"
                        className="hidden"
                        accept="image/*"
                        onChange={onImageChange}
                      />
                    </label>
                  </div>
                ) : (
                  <label className="cursor-pointer flex flex-col items-center justify-center py-8">
                    <ImageIcon className={`w-12 h-12 mb-2 ${isDarkMode ? "text-neutral-500" : "text-neutral-400"}`} />
                    <span className={`text-sm ${isDarkMode ? "text-neutral-400" : "text-neutral-600"}`}>
                      Click to upload image
                    </span>
                    <span className={`text-xs mt-1 ${isDarkMode ? "text-neutral-500" : "text-neutral-500"}`}>
                      PNG, JPG, GIF up to 5MB
                    </span>
                    <input
                      type="file"
                      className="hidden"
                      accept="image/*"
                      onChange={onImageChange}
                    />
                  </label>
                )}
              </div>
            </div>
          </div>

          <div className={`p-6 border-t ${isDarkMode ? "border-neutral-700" : "border-neutral-200"}`}>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className={`flex-1 px-6 py-3 border-2 rounded-xl font-semibold transition-all transform hover:scale-105 active:scale-95 ${
                  isDarkMode 
                    ? "border-neutral-600 text-neutral-300 hover:bg-neutral-700" 
                    : "border-neutral-300 text-neutral-700 hover:bg-neutral-50"
                }`}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 px-6 py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-xl font-semibold hover:from-orange-600 hover:to-orange-700 transition-all flex items-center justify-center gap-2 shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95"
              >
                <Save className="w-5 h-5" />
                Update Item
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

// Delete Confirmation Modal Component
function DeleteConfirmationModal({ item, isDarkMode, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-300">
      <div className={`rounded-2xl shadow-2xl max-w-md w-full p-6 animate-in zoom-in duration-300 ${isDarkMode ? "bg-neutral-800" : "bg-white"}`}>
        <div className="mb-6">
          <div className="w-16 h-16 bg-rose-100 dark:bg-rose-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-8 h-8 text-rose-600" />
          </div>
          <h3 className={`text-2xl font-bold mb-2 text-center ${isDarkMode ? "text-white" : "text-neutral-800"}`}>
            Archive Item
          </h3>
          <p className={`text-center ${isDarkMode ? "text-neutral-400" : "text-neutral-600"}`}>
            Are you sure you want to archive <span className="font-semibold">"{item.name}"</span>?
          </p>
          <p className={`text-sm text-center mt-2 ${isDarkMode ? "text-neutral-500" : "text-neutral-500"}`}>
            The item will move to the Archive where it can be restored or permanently deleted.
          </p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className={`flex-1 px-6 py-3 border-2 rounded-xl font-semibold transition-all transform hover:scale-105 active:scale-95 ${
              isDarkMode 
                ? "border-neutral-600 text-neutral-300 hover:bg-neutral-700" 
                : "border-neutral-300 text-neutral-700 hover:bg-neutral-50"
            }`}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 px-6 py-3 bg-rose-600 text-white rounded-xl font-semibold hover:bg-rose-700 transition-all shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95"
          >
            Archive
          </button>
        </div>
      </div>
    </div>
  );
}

// Archived Inventory Card Component
function ArchivedInventoryCard({ product, isDarkMode, onRestore, onDelete }) {
  const stock = Number(product.stock) || 0;
  const price = Number(product.price) || 0;
  const stockValue = stock * price;

  return (
    <div className={`rounded-2xl overflow-hidden shadow-lg border transition-all hover:shadow-xl hover:-translate-y-0.5 ${isDarkMode ? "bg-neutral-800 border-neutral-700" : "bg-white border-neutral-200"}`}>
      <div className="h-1.5 bg-orange-500" />

      <div className={`relative aspect-[4/3] ${isDarkMode ? "bg-neutral-900/50" : "bg-neutral-50"}`}>
        {product.image ? (
          <img
            src={product.image}
            alt={product.name}
            className="w-full h-full object-cover"
            onError={(e) => { e.target.style.display = "none"; }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ImageIcon className={`w-12 h-12 ${isDarkMode ? "text-neutral-700" : "text-neutral-300"}`} />
          </div>
        )}
        <div className={`absolute top-3 right-3 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold shadow-sm ${isDarkMode ? "bg-neutral-800 text-orange-300" : "bg-orange-100 text-orange-700"}`}>
          <Archive className="w-3 h-3" />
          Archived
        </div>
      </div>

      <div className="p-5">
        <h3 className={`text-lg font-black leading-tight line-clamp-2 mb-3 ${isDarkMode ? "text-white" : "text-neutral-900"}`}>
          {product.name || "Unnamed product"}
        </h3>
        {/* Tags — single row, barcode truncates */}
        <div className="flex items-center gap-2 mb-4 min-w-0 overflow-hidden">
          <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full flex-shrink-0 max-w-[45%] ${isDarkMode ? "bg-orange-900/30 text-orange-400" : "bg-orange-100 text-orange-700"}`}>
            <Tag className="w-3 h-3 flex-shrink-0" />
            <span className="truncate">{getCategoryLabel(product.category)}</span>
          </span>
          {product.barcode && (
            <span
              title={product.barcode}
              className={`flex items-center gap-1 text-xs font-mono px-2.5 py-1 rounded-full min-w-0 flex-1 ${isDarkMode ? "bg-neutral-700 text-neutral-300" : "bg-neutral-100 text-neutral-600"}`}
            >
              <Barcode className="w-3 h-3 flex-shrink-0" />
              <span className="truncate">{product.barcode}</span>
            </span>
          )}
        </div>

        <div className={`rounded-xl border divide-y text-sm ${isDarkMode ? "bg-neutral-900/35 border-neutral-700 divide-neutral-700" : "bg-neutral-50 border-neutral-100 divide-neutral-200"}`}>
          <div className="flex items-center justify-between gap-4 px-4 py-3">
            <span className={isDarkMode ? "text-neutral-400" : "text-neutral-500"}>Price</span>
            <span className="font-black text-orange-600">{formatCurrency(price)}</span>
          </div>
          <div className="flex items-center justify-between gap-4 px-4 py-3">
            <span className={isDarkMode ? "text-neutral-400" : "text-neutral-500"}>Stock</span>
            <span className={`font-black ${stock === 0 ? "text-rose-500" : isDarkMode ? "text-white" : "text-neutral-900"}`}>{stock}</span>
          </div>
          <div className="flex items-center justify-between gap-4 px-4 py-3">
            <span className={isDarkMode ? "text-neutral-400" : "text-neutral-500"}>Stock value</span>
            <span className={`font-semibold ${isDarkMode ? "text-neutral-300" : "text-neutral-700"}`}>{formatCurrency(stockValue)}</span>
          </div>
          <div className="flex items-center justify-between gap-4 px-4 py-3">
            <span className={isDarkMode ? "text-neutral-400" : "text-neutral-500"}>Archived on</span>
            <span className={isDarkMode ? "text-neutral-300" : "text-neutral-700"}>{formatDate(product.archivedAt)}</span>
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
          aria-label={`Permanently delete ${product.name || "item"}`}
          className={`w-11 h-11 rounded-xl font-semibold transition-all flex items-center justify-center active:scale-95 ${isDarkMode ? "bg-rose-900/20 text-rose-500 hover:bg-rose-900/40" : "bg-rose-50 text-rose-600 hover:bg-rose-100"}`}
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

function CategoryChooser({ value, categories = [], isDarkMode, onChange, inputId }) {
  const cleanValue = normalizeCategory(value);
  const hasCategories = categories.length > 0;
  const valueMatchesCategory = categories.some((category) => category === cleanValue);
  const [mode, setMode] = useState(hasCategories && (!cleanValue || valueMatchesCategory) ? "existing" : "new");

  useEffect(() => {
    if (!hasCategories) setMode("new");
  }, [hasCategories]);

  const updateCategory = (nextValue) => {
    onChange({ target: { value: nextValue } });
  };

  const selectMode = (nextMode) => {
    setMode(nextMode);
    if (nextMode === "existing" && !valueMatchesCategory) updateCategory("");
    if (nextMode === "new" && valueMatchesCategory) updateCategory("");
  };

  return (
    <div className="space-y-3">
      {hasCategories && (
        <div className={`grid grid-cols-2 gap-1 p-1 rounded-xl border ${
          isDarkMode ? "bg-neutral-900/40 border-neutral-700" : "bg-neutral-100 border-neutral-200"
        }`}>
          <button
            type="button"
            onClick={() => selectMode("existing")}
            className={`flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold transition-all ${
              mode === "existing"
                ? "bg-orange-500 text-white shadow-sm"
                : isDarkMode
                ? "text-neutral-400 hover:text-white"
                : "text-neutral-600 hover:text-neutral-800"
            }`}
          >
            <Tag className="w-4 h-4" />
            Existing
          </button>
          <button
            type="button"
            onClick={() => selectMode("new")}
            className={`flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold transition-all ${
              mode === "new"
                ? "bg-orange-500 text-white shadow-sm"
                : isDarkMode
                ? "text-neutral-400 hover:text-white"
                : "text-neutral-600 hover:text-neutral-800"
            }`}
          >
            <Plus className="w-4 h-4" />
            New
          </button>
        </div>
      )}

      {mode === "existing" && hasCategories ? (
        <select
          id={inputId}
          value={valueMatchesCategory ? cleanValue : ""}
          onChange={(e) => updateCategory(e.target.value)}
          className={`w-full border-2 px-4 py-3 rounded-xl focus:outline-none focus:border-orange-500 transition-all ${
            isDarkMode ? "bg-neutral-700 border-neutral-600 text-white" : "bg-white border-neutral-200 text-neutral-800"
          }`}
        >
          <option value="">No category</option>
          {categories.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>
      ) : (
        <input
          id={inputId}
          type="text"
          placeholder="Enter new category name"
          value={value}
          onChange={onChange}
          className={`w-full border-2 px-4 py-3 rounded-xl focus:outline-none focus:border-orange-500 transition-all ${
            isDarkMode ? "bg-neutral-700 border-neutral-600 text-white placeholder-neutral-400" : "bg-white border-neutral-200 text-neutral-800 placeholder-neutral-500"
          }`}
        />
      )}
    </div>
  );
}

export default Inventory;

