import { useState, useEffect, useRef } from "react";
import { useDarkMode } from "./contexts/DarkModeContext";
import { useAuth } from "./contexts/AuthContext";
import {
  ShoppingCart,
  Scan,
  Trash2,
  Plus,
  Minus,
  CreditCard,
  Banknote,
  X,
  Search,
  User,
  Package,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  Zap,
  Receipt,
} from "lucide-react";
import axios from "axios";
import { API_BASE_URL } from "./config/api";

const API_URL = API_BASE_URL;

function OrderTransaction() {
  const { isDarkMode } = useDarkMode();
  const { user } = useAuth();
  const [cart, setCart] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [barcodeInput, setBarcodeInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [paymentType, setPaymentType] = useState("cash");
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [lastTransaction, setLastTransaction] = useState(null);
  const [lastCashTendered, setLastCashTendered] = useState("");
  const [loading, setLoading] = useState(false);
  const [inventoryLoading, setInventoryLoading] = useState(true);
  const [recentlyAdded, setRecentlyAdded] = useState(new Set());
  const [removingFromCart, setRemovingFromCart] = useState(new Set());
  const barcodeInputRef = useRef(null);
  const [showClearCartModal, setShowClearCartModal] = useState(false);
  const [notification, setNotification] = useState(null);
  const [customerSearch, setCustomerSearch] = useState("");
  const [cashCustomerName, setCashCustomerName] = useState("");
  const [cashTendered, setCashTendered] = useState("");
  const [showMobileCart, setShowMobileCart] = useState(false);

  useEffect(() => {
    fetchInventory();
    fetchCustomers();
  }, []);

  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.key === 'F2') {
        e.preventDefault();
        barcodeInputRef.current?.focus();
      }
      if (e.key === 'F4' && cart.length > 0) {
        e.preventDefault();
        setShowClearCartModal(true);
      }
      if (e.key === 'F8') {
        e.preventDefault();
        setPaymentType(prev => prev === 'cash' ? 'credit' : 'cash');
      }
      if (e.key === 'F12' && cart.length > 0) {
        e.preventDefault();
        handleCheckout();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [cart]);

  const showNotification = (message, type = "error") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const fetchInventory = async () => {
    setInventoryLoading(true);
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(`${API_URL}/inventory`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setInventory(response.data);
    } catch (error) {
      console.error("Error fetching inventory:", error);
    } finally {
      setInventoryLoading(false);
    }
  };

  const fetchCustomers = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(`${API_URL}/customers`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setCustomers(response.data);
    } catch (error) {
      console.error("Error fetching customers:", error);
    }
  };

  const handleBarcodeSubmit = (e) => {
    e.preventDefault();
    if (!barcodeInput.trim()) return;

    const item = inventory.find(
      (inv) => inv.barcode && inv.barcode.toLowerCase() === barcodeInput.toLowerCase()
    );

    if (item) {
      addToCart(item);
      setBarcodeInput("");
      barcodeInputRef.current?.focus();
    } else {
      showNotification(`Item not found with barcode: ${barcodeInput}`);
      setBarcodeInput("");
    }
  };

  const flashAdded = (itemId) => {
    setRecentlyAdded(prev => new Set([...prev, itemId]));
    setTimeout(() => {
      setRecentlyAdded(prev => { const next = new Set(prev); next.delete(itemId); return next; });
    }, 350);
  };

  const addToCart = (item) => {
    const existingItem = cart.find((cartItem) => cartItem._id === item._id);

    if (existingItem) {
      if (existingItem.quantity >= item.stock) {
        showNotification(`Cannot add more. Only ${item.stock} items available.`);
        return;
      }
      setCart(
        cart.map((cartItem) =>
          cartItem._id === item._id
            ? { ...cartItem, quantity: cartItem.quantity + 1 }
            : cartItem
        )
      );
    } else {
      if (item.stock === 0) {
        showNotification(`${item.name} is out of stock`);
        return;
      }
      setCart([...cart, { ...item, quantity: 1 }]);
    }
    flashAdded(item._id);
  };

  const removeFromCart = (itemId) => {
    setRemovingFromCart(prev => new Set([...prev, itemId]));
    setTimeout(() => {
      setCart(prev => prev.filter(item => item._id !== itemId));
      setRemovingFromCart(prev => { const next = new Set(prev); next.delete(itemId); return next; });
    }, 250);
  };

  const updateQuantity = (itemId, change) => {
    setCart(
      cart
        .map((item) => {
          if (item._id === itemId) {
            const newQuantity = item.quantity + change;

            if (newQuantity <= 0) {
              return null;
            }

            const inventoryItem = inventory.find(inv => inv._id === itemId);
            if (newQuantity > inventoryItem.stock) {
              showNotification(`Only ${inventoryItem.stock} items available`);
              return item;
            }

            return { ...item, quantity: newQuantity };
          }
          return item;
        })
        .filter(Boolean)
    );
  };

  const setQuantityDirectly = (itemId, rawValue) => {
    const parsed = parseInt(rawValue, 10);
    if (isNaN(parsed) || parsed <= 0) {
      // Remove item if cleared or zero
      setCart(cart.filter((item) => item._id !== itemId));
      return;
    }
    const inventoryItem = inventory.find((inv) => inv._id === itemId);
    const clamped = inventoryItem ? Math.min(parsed, inventoryItem.stock) : parsed;
    if (inventoryItem && parsed > inventoryItem.stock) {
      showNotification(`Only ${inventoryItem.stock} items available`);
    }
    setCart(cart.map((item) =>
      item._id === itemId ? { ...item, quantity: clamped } : item
    ));
  };

  const calculateTotal = () => {
    return cart.reduce((total, item) => total + item.price * item.quantity, 0);
  };

  const handleCheckout = async () => {
    if (cart.length === 0) {
      showNotification("Cart is empty");
      return;
    }

    if (paymentType === "credit" && !selectedCustomer) {
      showNotification("Please select a customer for credit payment");
      return;
    }

    const total = calculateTotal();

    if (paymentType === "cash") {
      const tendered = parseFloat(cashTendered);
      if (!cashTendered || isNaN(tendered) || tendered < total) {
        showNotification(`Cash tendered must be at least ₱${total.toFixed(2)}`);
        return;
      }
    }
    const creditLimit = Number(selectedCustomer?.creditLimit) || 0;
    const currentCredit = Number(selectedCustomer?.balance) || 0;
    const remainingCredit = Math.max(creditLimit - currentCredit, 0);

    if (paymentType === "credit" && selectedCustomer && creditLimit > 0 && total > remainingCredit) {
      showNotification(`Credit limit exceeded by \u20B1${(total - remainingCredit).toFixed(2)}`);
      return;
    }

    setLoading(true);

    try {
      const token = localStorage.getItem("token");

      const transactionData = {
        items: cart.map((item) => ({
          inventoryId: item._id,
          quantity: item.quantity,
        })),
        paymentType: paymentType,
      };

      if (paymentType === "credit" && selectedCustomer) {
        transactionData.customerId = selectedCustomer._id;
      }

      // Add cash customer name if provided
      if (paymentType === "cash" && cashCustomerName.trim()) {
        transactionData.cashCustomerName = cashCustomerName.trim();
      }

      const response = await axios.post(
        `${API_URL}/transactions`,
        transactionData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      const transaction = response.data.transaction;
      setLastTransaction(transaction);
      setLastCashTendered(cashTendered);
      setCart([]);
      setSelectedCustomer(null);
      setCashCustomerName("");
      setCashTendered("");
      setShowReceiptModal(true);

      fetchInventory();

      setTimeout(() => {
        barcodeInputRef.current?.focus();
      }, 100);

      showNotification("Transaction completed!", "success");

    } catch (error) {
      console.error("Checkout error:", error);

      const errorMessage = 
        error.response?.data?.message ||
        error.response?.data?.error ||
        error.message ||
        "Transaction failed";

      showNotification(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const openClearCartModal = () => {
    if (cart.length > 0) {
      setShowClearCartModal(true);
    }
  };

  const clearCart = () => {
    setCart([]);
    setShowClearCartModal(false);
  };

  const filteredInventory = inventory.filter((item) =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (item.barcode && item.barcode.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const quickAdd = (item, quantity) => {
    const existingItem = cart.find((cartItem) => cartItem._id === item._id);
    const currentQty = existingItem ? existingItem.quantity : 0;
    
    if (currentQty + quantity > item.stock) {
      showNotification(`Only ${item.stock} items available`);
      return;
    }

    if (existingItem) {
      setCart(cart.map(cartItem =>
        cartItem._id === item._id
          ? { ...cartItem, quantity: currentQty + quantity }
          : cartItem
      ));
    } else {
      setCart([...cart, { ...item, quantity }]);
    }
    flashAdded(item._id);
  };

  const cartTotal = calculateTotal();
  const selectedCreditLimit = Number(selectedCustomer?.creditLimit) || 0;
  const selectedCurrentCredit = Number(selectedCustomer?.balance) || 0;
  const remainingCredit =
    selectedCreditLimit > 0 ? Math.max(selectedCreditLimit - selectedCurrentCredit, 0) : 0;
  const isCreditLimitExceeded =
    paymentType === "credit" &&
    selectedCustomer &&
    selectedCreditLimit > 0 &&
    cartTotal > remainingCredit;
  const creditOverAmount = isCreditLimitExceeded ? cartTotal - remainingCredit : 0;

  return (
    <div className={`h-screen flex flex-col transition-colors duration-200 ${
      isDarkMode ? "bg-neutral-900" : "bg-gradient-to-br from-orange-50 via-white to-orange-50"
    }`}>
      {/* Header */}
      <div className={`flex-shrink-0 border-b shadow-sm ${
        isDarkMode ? "bg-neutral-800 border-neutral-700" : "bg-white border-neutral-200"
      }`}>
        <div className="px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between pl-14 lg:pl-0">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className={`p-3 rounded-xl ${isDarkMode ? "bg-orange-900/30" : "bg-orange-100"}`}>
                <ShoppingCart className="w-6 h-6 sm:w-8 sm:h-8 text-orange-600" />
              </div>
              <div>
                <h1 className={`text-xl sm:text-2xl font-bold ${isDarkMode ? "text-white" : "text-neutral-800"}`}>
                  Point of Sale
                </h1>
                <p className={`text-xs sm:text-sm ${isDarkMode ? "text-neutral-400" : "text-neutral-600"}`}>
                  {user?.name}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2 sm:gap-4">
              <div className={`px-3 sm:px-5 py-2 sm:py-3 rounded-xl shadow-lg ${
                isDarkMode ? "bg-neutral-700" : "bg-white border-2 border-neutral-200"
              }`}>
                <p className={`text-xs ${isDarkMode ? "text-neutral-400" : "text-neutral-600"}`}>Items</p>
                <p className="text-lg sm:text-xl font-bold text-orange-600">{cart.length}</p>
              </div>
              <div className={`px-3 sm:px-5 py-2 sm:py-3 rounded-xl shadow-lg ${
                isDarkMode ? "bg-neutral-700" : "bg-white border-2 border-neutral-200"
              }`}>
                <p className={`text-xs ${isDarkMode ? "text-neutral-400" : "text-neutral-600"}`}>Total</p>
                <p className="text-lg sm:text-xl font-bold text-orange-600">₱{cartTotal.toFixed(2)}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden flex flex-col lg:flex-row">
        {/* LEFT SIDE: Products */}
        <div className="flex-1 flex flex-col">
          {/* Search Bar */}
          <div className={`flex-shrink-0 p-4 border-b ${isDarkMode ? "border-neutral-700" : "border-neutral-200"}`}>
            <div className="max-w-4xl space-y-3">
              <form onSubmit={handleBarcodeSubmit}>
                <div className="relative">
                  <Scan className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 ${
                    isDarkMode ? "text-neutral-500" : "text-neutral-400"
                  }`} />
                  <input
                    ref={barcodeInputRef}
                    type="text"
                    value={barcodeInput}
                    onChange={(e) => setBarcodeInput(e.target.value)}
                    placeholder="Scan barcode or type to search... (Press F2)"
                    className={`w-full pl-12 pr-24 py-3 rounded-xl border-2 focus:outline-none focus:border-orange-500 transition-all shadow-md ${
                      isDarkMode
                        ? "bg-neutral-800 border-neutral-700 text-white placeholder-neutral-500"
                        : "bg-white border-neutral-200 placeholder-neutral-400"
                    }`}
                    autoFocus
                  />
                  <button
                    type="submit"
                    className="absolute right-2 top-1/2 -translate-y-1/2 px-5 py-2 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-lg text-sm font-semibold hover:from-orange-600 hover:to-orange-700 transition-all shadow-lg transform hover:scale-105 active:scale-95"
                  >
                    Add
                  </button>
                </div>
              </form>
              
              <div className="relative">
                <Search className={`absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 ${
                  isDarkMode ? "text-neutral-500" : "text-neutral-400"
                }`} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter products..."
                  className={`w-full pl-11 pr-4 py-2.5 rounded-xl border-2 focus:outline-none focus:border-orange-500 text-sm transition-all shadow-md ${
                    isDarkMode
                      ? "bg-neutral-800 border-neutral-700 text-white placeholder-neutral-500"
                      : "bg-white border-neutral-200 placeholder-neutral-400"
                  }`}
                />
              </div>
            </div>
          </div>

          {/* Product Grid */}
          <div className="flex-1 overflow-y-auto p-4">
            <div className="max-w-7xl mx-auto">
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-3 gap-3 sm:gap-4">

                {/* Skeleton loading */}
                {inventoryLoading ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <div
                      key={i}
                      className={`rounded-2xl border-2 overflow-hidden animate-pulse ${isDarkMode ? "bg-neutral-800 border-neutral-700" : "bg-white border-neutral-200"}`}
                      style={{ animationDelay: `${i * 60}ms` }}
                    >
                      <div className={`h-32 sm:h-36 ${isDarkMode ? "bg-neutral-700" : "bg-neutral-200"}`} />
                      <div className="p-3 space-y-2">
                        <div className={`h-3 rounded-full ${isDarkMode ? "bg-neutral-700" : "bg-neutral-200"}`} />
                        <div className={`h-3 w-2/3 rounded-full ${isDarkMode ? "bg-neutral-700" : "bg-neutral-200"}`} />
                        <div className={`h-5 w-1/2 rounded-full mt-1 ${isDarkMode ? "bg-neutral-700" : "bg-neutral-200"}`} />
                      </div>
                    </div>
                  ))
                ) : filteredInventory.length === 0 ? (
                  <div className="col-span-full flex flex-col items-center justify-center py-20">
                    <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-4 ${isDarkMode ? "bg-neutral-800" : "bg-neutral-100"}`}>
                      <Package className={`w-10 h-10 ${isDarkMode ? "text-neutral-600" : "text-neutral-400"}`} />
                    </div>
                    <p className={`text-lg font-medium ${isDarkMode ? "text-neutral-400" : "text-neutral-600"}`}>
                      {searchQuery ? "No products found" : "No products available"}
                    </p>
                  </div>
                ) : (
                  filteredInventory.map((item, idx) => {
                    const inCart = cart.find(c => c._id === item._id);
                    const cartQuantity = inCart?.quantity || 0;
                    const isFlashing = recentlyAdded.has(item._id);
                    const isOutOfStock = item.stock === 0;
                    const isLowStock = item.stock > 0 && item.stock <= 5;

                    return (
                      <button
                        key={item._id}
                        onClick={() => addToCart(item)}
                        disabled={isOutOfStock}
                        style={{ animationDelay: `${Math.min(idx * 30, 300)}ms` }}
                        className={`group relative rounded-2xl overflow-hidden text-left animate-in fade-in zoom-in-95 duration-300 transition-all duration-200 flex flex-col ${
                          isOutOfStock
                            ? "opacity-50 cursor-not-allowed shadow-sm"
                            : "cursor-pointer hover:shadow-xl active:scale-[0.97] shadow-sm"
                        } ${
                          isFlashing
                            ? "ring-4 ring-orange-400 shadow-orange-200/50"
                            : cartQuantity > 0
                            ? isDarkMode
                              ? "ring-2 ring-orange-500 shadow-orange-900/20"
                              : "ring-2 ring-orange-500 shadow-orange-100"
                            : isDarkMode
                            ? "ring-1 ring-neutral-700 hover:ring-orange-500/50"
                            : "ring-1 ring-neutral-200 hover:ring-orange-300"
                        } ${isDarkMode ? "bg-neutral-800" : "bg-white"}`}
                      >
                        {/* ── Image / Placeholder ── */}
                        <div className={`relative h-28 sm:h-32 overflow-hidden flex-shrink-0 ${
                          isDarkMode ? "bg-neutral-700" : "bg-neutral-100"
                        }`}>
                          {item.image ? (
                            <img
                              src={item.image}
                              alt={item.name}
                              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                            />
                          ) : (
                            <div className={`h-full flex flex-col items-center justify-center gap-1.5 ${
                              isDarkMode
                                ? "bg-gradient-to-br from-neutral-700 to-neutral-750"
                                : "bg-gradient-to-br from-orange-50 to-neutral-100"
                            }`}>
                              <Package className={`w-9 h-9 ${isDarkMode ? "text-neutral-600" : "text-neutral-300"}`} />
                            </div>
                          )}

                          {/* Gradient fade at bottom of image */}
                          <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-black/30 to-transparent pointer-events-none" />

                          {/* Flash overlay */}
                          {isFlashing && (
                            <div className="absolute inset-0 bg-orange-400/25 flex items-center justify-center">
                              <div className="w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center shadow-xl">
                                <Plus className="w-5 h-5 text-white" />
                              </div>
                            </div>
                          )}

                          {/* Top-left: cart quantity pill */}
                          {cartQuantity > 0 && (
                            <div className="absolute top-2 left-2 min-w-[1.75rem] h-7 px-2 bg-orange-600 text-white text-xs font-black rounded-full flex items-center justify-center shadow-lg ring-2 ring-white/80 transition-all">
                              {cartQuantity}
                            </div>
                          )}

                          {/* Top-right: stock status badge */}
                          {isOutOfStock ? (
                            <span className="absolute top-2 right-2 px-2 py-0.5 bg-red-600 text-white text-xs font-bold rounded-full shadow-lg">
                              OUT
                            </span>
                          ) : isLowStock && (
                            <span className="absolute top-2 right-2 px-2 py-0.5 bg-amber-500 text-white text-xs font-bold rounded-full shadow-lg flex items-center gap-1">
                              <AlertTriangle className="w-2.5 h-2.5" />
                              {item.stock}
                            </span>
                          )}
                        </div>

                        {/* ── Info ── */}
                        <div className="flex flex-col flex-1 p-3 pb-2">
                          <h3 className={`font-bold text-xs sm:text-sm leading-snug line-clamp-2 mb-auto ${
                            isDarkMode ? "text-white" : "text-neutral-800"
                          }`}>
                            {item.name}
                          </h3>

                          <div className="flex items-center justify-between mt-2 gap-1">
                            <p className="text-base sm:text-lg font-black text-orange-600 leading-none">
                              ₱{item.price.toFixed(2)}
                            </p>
                            {/* Stock dot indicator */}
                            {!isOutOfStock && !isLowStock && (
                              <div className={`flex items-center gap-1 text-xs ${isDarkMode ? "text-neutral-500" : "text-neutral-400"}`}>
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0" />
                                {item.stock}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* ── Quick-add strip ── */}
                        {!isOutOfStock && (
                          <div className={`flex items-center justify-between px-3 pb-3 pt-1.5 border-t ${
                            isDarkMode ? "border-neutral-700/60" : "border-neutral-100"
                          }`}>
                            <span className={`text-xs font-medium ${
                              cartQuantity > 0
                                ? "text-orange-500"
                                : isDarkMode ? "text-neutral-600" : "text-neutral-300"
                            }`}>
                              {cartQuantity > 0 ? `${cartQuantity} in cart` : "tap to add"}
                            </span>
                            <div className="flex gap-1">
                              <button
                                onClick={(e) => { e.stopPropagation(); quickAdd(item, 1); }}
                                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all active:scale-95 ${
                                  isDarkMode
                                    ? "bg-neutral-700 hover:bg-orange-500 text-neutral-300 hover:text-white"
                                    : "bg-neutral-100 hover:bg-orange-500 text-neutral-500 hover:text-white"
                                }`}
                              >
                                +1
                              </button>
                              {item.stock >= 5 && (
                                <button
                                  onClick={(e) => { e.stopPropagation(); quickAdd(item, 5); }}
                                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all active:scale-95 ${
                                    isDarkMode
                                      ? "bg-neutral-700 hover:bg-orange-500 text-neutral-300 hover:text-white"
                                      : "bg-neutral-100 hover:bg-orange-500 text-neutral-500 hover:text-white"
                                  }`}
                                >
                                  +5
                                </button>
                              )}
                            </div>
                          </div>
                        )}
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT SIDE: Cart — side panel on lg+, bottom drawer on mobile */}
        <div className={`
          lg:w-[380px] xl:w-[420px] lg:flex-shrink-0 lg:border-l lg:shadow-xl flex flex-col
          ${showMobileCart
            ? "fixed inset-x-0 bottom-0 z-40 flex flex-col rounded-t-2xl shadow-2xl max-h-[85vh]"
            : "hidden lg:flex"}
          ${isDarkMode ? "bg-neutral-800 border-neutral-700" : "bg-white border-neutral-200"}
        `}>
          {/* Mobile drag handle */}
          <div className="lg:hidden flex-shrink-0 flex justify-center pt-3 pb-1">
            <div className={`w-10 h-1 rounded-full ${isDarkMode ? "bg-neutral-600" : "bg-neutral-300"}`} />
          </div>

          {/* Cart Header */}
          <div className={`flex-shrink-0 px-4 py-3 border-b flex items-center justify-between ${
            isDarkMode ? "border-neutral-700" : "border-neutral-200"
          }`}>
            <h2 className={`text-lg font-bold flex items-center gap-2 ${
              isDarkMode ? "text-white" : "text-neutral-800"
            }`}>
              <ShoppingCart className="w-5 h-5 text-orange-600" />
              Cart ({cart.length})
            </h2>
            <div className="flex items-center gap-2">
              {cart.length > 0 && (
                <button
                  onClick={openClearCartModal}
                  className="text-sm text-red-500 hover:text-red-600 font-semibold px-3 py-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
                >
                  Clear
                </button>
              )}
              {/* Close button — mobile only */}
              <button
                onClick={() => setShowMobileCart(false)}
                className={`lg:hidden p-1.5 rounded-xl transition-colors ${isDarkMode ? "text-neutral-400 hover:bg-neutral-700" : "text-neutral-500 hover:bg-neutral-100"}`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Cart Items */}
          <div className={`flex-[1_1_auto] max-h-[30vh] lg:flex-[0_0_260px] min-h-[120px] overflow-y-auto p-4 border-b ${
            isDarkMode ? "border-neutral-700" : "border-neutral-200"
          }`}>
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-4 ${
                  isDarkMode ? "bg-neutral-700" : "bg-neutral-100"
                }`}>
                  <ShoppingCart className={`w-10 h-10 ${isDarkMode ? "text-neutral-600" : "text-neutral-400"}`} />
                </div>
                <p className={`text-sm font-medium ${isDarkMode ? "text-neutral-400" : "text-neutral-600"}`}>
                  Cart is empty
                </p>
                <p className={`text-xs mt-1 ${isDarkMode ? "text-neutral-500" : "text-neutral-500"}`}>
                  Scan or click items to add
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {cart.map((item) => (
                  <div
                    key={item._id}
                    className={`p-3 rounded-xl border-2 shadow-sm transition-all duration-250 ${
                      removingFromCart.has(item._id)
                        ? "opacity-0 scale-95 translate-x-4"
                        : "opacity-100 scale-100 translate-x-0 animate-in slide-in-from-right-4 duration-300"
                    } ${
                      isDarkMode
                        ? "bg-neutral-700 border-neutral-600"
                        : "bg-neutral-50 border-neutral-200"
                    }`}
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1 pr-2">
                        <div className={`font-semibold text-sm line-clamp-1 mb-1 ${
                          isDarkMode ? "text-white" : "text-neutral-800"
                        }`}>
                          {item.name}
                        </div>
                        <div className="text-sm text-orange-600 font-semibold">
                          ₱{item.price.toFixed(2)} × {item.quantity}
                        </div>
                      </div>
                      <button
                        onClick={() => removeFromCart(item._id)}
                        className="text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 p-2 rounded-lg transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => updateQuantity(item._id, -1)}
                          className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold transition-all shadow-md ${
                            isDarkMode
                              ? "bg-neutral-600 hover:bg-neutral-500 active:bg-neutral-400 text-white"
                              : "bg-neutral-200 hover:bg-neutral-300 active:bg-neutral-400 text-neutral-800"
                          }`}
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <input
                          type="number"
                          min="1"
                          max="999"
                          value={item.quantity}
                          onChange={(e) => {
                            const val = e.target.value.slice(0, 3);
                            setCart(cart.map((c) =>
                              c._id === item._id ? { ...c, quantity: val === "" ? "" : Number(val) } : c
                            ));
                          }}
                          onBlur={(e) => setQuantityDirectly(item._id, e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") e.target.blur();
                          }}
                          className={`w-14 text-center font-bold text-lg rounded-lg border-2 focus:outline-none focus:border-orange-500 transition-all ${
                            isDarkMode
                              ? "bg-neutral-700 border-neutral-600 text-white"
                              : "bg-white border-neutral-300 text-neutral-800"
                          }`}
                        />
                        <button
                          onClick={() => updateQuantity(item._id, 1)}
                          className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold transition-all shadow-md ${
                            isDarkMode
                              ? "bg-neutral-600 hover:bg-neutral-500 active:bg-neutral-400 text-white"
                              : "bg-neutral-200 hover:bg-neutral-300 active:bg-neutral-400 text-neutral-800"
                          }`}
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="text-right">
                        <div className="text-xl font-bold text-orange-600">
                          ₱{(item.price * item.quantity).toFixed(2)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Checkout Section */}
          <div className={`flex-1 min-h-0 overflow-y-auto p-4 border-t space-y-3 ${
            isDarkMode ? "border-neutral-700" : "border-neutral-200"
          }`}>
            {/* Customer Name for Cash */}
            {paymentType === "cash" && (
              <div>
                <label className={`block text-xs font-bold mb-2 uppercase tracking-wider ${
                  isDarkMode ? "text-neutral-300" : "text-neutral-700"
                }`}>
                  Customer Name (Optional)
                </label>
                <input
                  type="text"
                  value={cashCustomerName}
                  onChange={(e) => setCashCustomerName(e.target.value)}
                  placeholder="Enter customer name..."
                  className={`w-full border-2 px-4 py-3 rounded-xl focus:outline-none focus:border-orange-500 transition-all ${
                    isDarkMode 
                      ? "bg-neutral-700 border-neutral-600 text-white placeholder-neutral-400" 
                      : "bg-white border-neutral-200 text-neutral-800 placeholder-neutral-500"
                  }`}
                />
              </div>
            )}

            {/* Payment Method */}
            <div>
              <label className={`block text-xs font-bold mb-2 uppercase tracking-wider ${
                isDarkMode ? "text-neutral-300" : "text-neutral-700"
              }`}>
                Payment Method
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => {
                    setPaymentType("cash");
                    setSelectedCustomer(null);
                    setCashTendered("");
                  }}
                  className={`p-3 rounded-xl border-2 flex items-center justify-center gap-2 font-semibold transition-all shadow-lg transform hover:scale-105 active:scale-95 ${
                    paymentType === "cash"
                      ? "border-orange-500 bg-orange-500 text-white"
                      : isDarkMode
                      ? "border-neutral-600 hover:border-neutral-500 text-neutral-200"
                      : "border-neutral-300 hover:border-neutral-400 text-neutral-700"
                  }`}
                >
                  <Banknote className="w-5 h-5" />
                  Cash
                </button>
                <button
                  onClick={() => {
                    setPaymentType("credit");
                    setCashCustomerName("");
                  }}
                  className={`p-3 rounded-xl border-2 flex items-center justify-center gap-2 font-semibold transition-all shadow-lg transform hover:scale-105 active:scale-95 ${
                    paymentType === "credit"
                      ? "border-orange-500 bg-orange-500 text-white"
                      : isDarkMode
                      ? "border-neutral-600 hover:border-neutral-500 text-neutral-200"
                      : "border-neutral-300 hover:border-neutral-400 text-neutral-700"
                  }`}
                >
                  <CreditCard className="w-5 h-5" />
                  Credit
                </button>
              </div>
            </div>

            {/* Customer Selection */}
            {paymentType === "credit" && (
              <div>
                <label className={`block text-xs font-bold mb-2 uppercase tracking-wider ${
                  isDarkMode ? "text-neutral-300" : "text-neutral-700"
                }`}>
                  Customer {selectedCustomer && <span className="text-green-500 ml-1">✓</span>}
                </label>
                {selectedCustomer ? (
                  <div className={`p-3 rounded-xl border-2 flex items-center justify-between shadow-lg ${
                    isCreditLimitExceeded
                      ? isDarkMode
                        ? "bg-rose-950/30 border-rose-500 ring-2 ring-rose-500/30"
                        : "bg-rose-50 border-rose-500 ring-2 ring-rose-200"
                      : isDarkMode
                      ? "bg-neutral-700 border-green-500"
                      : "bg-green-50 border-green-500"
                  }`}>
                    <div className="flex items-center gap-3 flex-1">
                      <div className="w-10 h-10 rounded-full bg-orange-600 flex items-center justify-center text-white font-bold shadow-lg flex-shrink-0">
                        {selectedCustomer.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className={`font-semibold text-sm block truncate ${
                          isDarkMode ? "text-white" : "text-neutral-800"
                        }`}>
                          {selectedCustomer.name}
                        </span>
                        <span className={`text-xs ${isDarkMode ? "text-neutral-400" : "text-neutral-600"}`}>
                          {selectedCustomer.customerId || "N/A"}
                        </span>
                        <span className={`text-xs font-semibold block mt-0.5 ${
                          isCreditLimitExceeded
                            ? "text-rose-500"
                            : selectedCustomer.creditLimit > 0
                            ? "text-orange-500"
                            : isDarkMode ? "text-neutral-500" : "text-neutral-400"
                        }`}>
                          {selectedCustomer.creditLimit > 0
                            ? `Limit: ₱${selectedCustomer.creditLimit.toLocaleString(undefined, { minimumFractionDigits: 2 })}`
                            : "No credit limit"}
                        </span>
                        <div className="mt-1 space-y-0.5">
                          <span className={`text-xs font-semibold block ${
                            isCreditLimitExceeded ? "text-rose-500" : isDarkMode ? "text-neutral-300" : "text-neutral-700"
                          }`}>
                            Used credit: {"\u20B1"}{selectedCurrentCredit.toFixed(2)}
                          </span>
                          {selectedCreditLimit > 0 && (
                            <span className={`text-xs font-semibold block ${
                              isCreditLimitExceeded ? "text-rose-500" : "text-emerald-600"
                            }`}>
                              Available: {"\u20B1"}{remainingCredit.toFixed(2)}
                            </span>
                          )}
                        </div>
                        {isCreditLimitExceeded && (
                          <span className="text-xs font-bold text-rose-500 block mt-1">
                            Over limit by {"\u20B1"}{creditOverAmount.toFixed(2)}
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => setSelectedCustomer(null)}
                      className="text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 p-2 rounded-lg transition-all ml-2"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowCustomerModal(true)}
                    className={`w-full p-3 rounded-xl border-2 border-dashed text-center font-semibold text-sm transition-all shadow-lg transform hover:scale-105 active:scale-95 ${
                      isDarkMode
                        ? "border-neutral-600 hover:bg-neutral-700 hover:border-orange-500 text-neutral-300"
                        : "border-neutral-300 hover:bg-neutral-100 hover:border-orange-500 text-neutral-600"
                    }`}
                  >
                    + Select Customer
                  </button>
                )}
              </div>
            )}

            {isCreditLimitExceeded && (
              <div className={`p-3 rounded-xl border-2 ${
                isDarkMode
                  ? "bg-rose-950/30 border-rose-500/70 text-rose-300"
                  : "bg-rose-50 border-rose-300 text-rose-700"
              }`}>
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-bold">Credit limit exceeded</p>
                    <p className="mt-0.5">
                      Sale total {"\u20B1"}{cartTotal.toFixed(2)} is higher than available credit {"\u20B1"}{remainingCredit.toFixed(2)}.
                    </p>
                    <p className="mt-1 text-xs font-semibold opacity-90">
                      Limit {"\u20B1"}{selectedCreditLimit.toFixed(2)} - used {"\u20B1"}{selectedCurrentCredit.toFixed(2)} = available {"\u20B1"}{remainingCredit.toFixed(2)}.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Cash Tendered */}
            {paymentType === "cash" && (
              <div>
                <label className={`block text-xs font-bold mb-2 uppercase tracking-wider ${
                  isDarkMode ? "text-neutral-300" : "text-neutral-700"
                }`}>
                  Cash Tendered
                </label>
                <div className="relative">
                  <span className={`absolute left-3 top-1/2 -translate-y-1/2 font-bold text-sm ${
                    isDarkMode ? "text-neutral-400" : "text-neutral-500"
                  }`}>₱</span>
                  <input
                    type="number"
                    min="0"
                    max="99999"
                    step="0.01"
                    value={cashTendered}
                    onChange={(e) => {
                      const raw = e.target.value;
                      // block if integer part exceeds 5 digits
                      if (raw === "" || /^\d{0,5}(\.\d{0,2})?$/.test(raw)) {
                        setCashTendered(raw);
                      }
                    }}
                    placeholder="0.00"
                    className={`w-full border-2 pl-7 pr-4 py-3 rounded-xl focus:outline-none focus:border-orange-500 transition-all font-semibold text-sm [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none ${
                      cashTendered && parseFloat(cashTendered) < cartTotal
                        ? isDarkMode
                          ? "bg-rose-950/30 border-rose-500 text-rose-300"
                          : "bg-rose-50 border-rose-400 text-rose-700"
                        : isDarkMode
                        ? "bg-neutral-700 border-neutral-600 text-white placeholder-neutral-400"
                        : "bg-white border-neutral-200 text-neutral-800 placeholder-neutral-500"
                    }`}
                  />
                </div>
                {/* Change */}
                {cashTendered !== "" && !isNaN(parseFloat(cashTendered)) && (
                  <div className={`mt-2 p-3 rounded-xl flex justify-between items-center ${
                    parseFloat(cashTendered) >= cartTotal
                      ? isDarkMode ? "bg-emerald-900/30 border border-emerald-700" : "bg-emerald-50 border border-emerald-200"
                      : isDarkMode ? "bg-rose-900/30 border border-rose-700" : "bg-rose-50 border border-rose-200"
                  }`}>
                    <span className={`text-xs font-bold uppercase tracking-wide ${
                      parseFloat(cashTendered) >= cartTotal
                        ? isDarkMode ? "text-emerald-400" : "text-emerald-700"
                        : isDarkMode ? "text-rose-400" : "text-rose-600"
                    }`}>
                      {parseFloat(cashTendered) >= cartTotal ? "Change" : "Short by"}
                    </span>
                    <span className={`text-lg font-black ${
                      parseFloat(cashTendered) >= cartTotal
                        ? isDarkMode ? "text-emerald-400" : "text-emerald-700"
                        : isDarkMode ? "text-rose-400" : "text-rose-600"
                    }`}>
                      ₱{Math.abs(parseFloat(cashTendered) - cartTotal).toFixed(2)}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Total */}
            <div className={`p-4 rounded-xl shadow-lg ${
              isDarkMode
                ? "bg-gradient-to-br from-neutral-700 to-neutral-600"
                : "bg-gradient-to-br from-neutral-100 to-neutral-200"
            }`}>
              <div className="flex justify-between items-center">
                <span className={`text-sm font-bold uppercase tracking-wider ${
                  isDarkMode ? "text-neutral-300" : "text-neutral-700"
                }`}>
                  Total
                </span>
                <span className="text-3xl font-bold text-orange-600">
                  ₱{cartTotal.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Checkout Button */}
            {paymentType === "credit" && !selectedCustomer ? (
              <div className={`p-4 rounded-xl border-2 border-dashed text-center ${
                isDarkMode 
                  ? "border-orange-500/50 bg-orange-500/10 text-orange-400" 
                  : "border-orange-500/50 bg-orange-50 text-orange-600"
              }`}>
                <AlertCircle className="w-5 h-5 mx-auto mb-2" />
                <p className="text-sm font-semibold">Select a customer for credit payment</p>
              </div>
            ) : (
              <button
                onClick={handleCheckout}
                disabled={
                  cart.length === 0 || loading || isCreditLimitExceeded ||
                  (paymentType === "cash" && (!cashTendered || parseFloat(cashTendered) < cartTotal))
                }
                className="w-full py-4 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-xl font-bold text-base hover:from-orange-600 hover:to-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95 flex items-center justify-center gap-2 shadow-xl hover:shadow-orange-500/30"
              >
                {cart.length === 0 ? (
                  <>
                    <ShoppingCart className="w-5 h-5" />
                    Add Items to Cart
                  </>
                ) : (
                  <>
                    <Zap className="w-5 h-5" />
                    Complete Transaction
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Mobile cart overlay */}
      {showMobileCart && (
        <div
          className="fixed inset-0 bg-black/40 z-30 lg:hidden"
          onClick={() => setShowMobileCart(false)}
        />
      )}

      {/* Floating Cart Button — mobile only */}
      <button
        onClick={() => setShowMobileCart(v => !v)}
        className="fixed bottom-6 right-6 z-40 lg:hidden w-16 h-16 bg-orange-500 hover:bg-orange-600 active:scale-95 text-white rounded-full shadow-2xl flex items-center justify-center transition-all"
      >
        <ShoppingCart className="w-7 h-7" />
        {cart.length > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[1.5rem] h-6 px-1.5 bg-rose-500 text-white text-xs font-black rounded-full flex items-center justify-center shadow-lg ring-2 ring-white">
            {cart.length}
          </span>
        )}
      </button>

      {/* Checkout Processing Overlay */}
      {loading && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-200">
          <div className={`rounded-2xl p-8 flex flex-col items-center gap-5 shadow-2xl animate-in zoom-in-95 duration-300 ${isDarkMode ? "bg-neutral-800" : "bg-white"}`}>
            <div className="relative w-20 h-20">
              <div className="absolute inset-0 w-20 h-20 border-4 border-orange-200 dark:border-orange-900/40 rounded-full" />
              <div className="absolute inset-0 w-20 h-20 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center">
                <ShoppingCart className="w-7 h-7 text-orange-500" />
              </div>
            </div>
            <div className="text-center">
              <p className={`text-lg font-bold ${isDarkMode ? "text-white" : "text-neutral-800"}`}>Processing Transaction</p>
              <p className={`text-sm mt-1 ${isDarkMode ? "text-neutral-400" : "text-neutral-500"}`}>Please wait a moment…</p>
            </div>
            <div className="flex gap-1.5">
              {[0, 1, 2].map(i => (
                <div key={i} className="w-2 h-2 bg-orange-500 rounded-full animate-bounce" style={{ animationDelay: `${i * 150}ms` }} />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Clear Cart Modal */}
      {showClearCartModal && (
        <ClearCartModal
          isDarkMode={isDarkMode}
          cartLength={cart.length}
          onConfirm={clearCart}
          onCancel={() => setShowClearCartModal(false)}
        />
      )}

      {/* Customer Modal */}
      {showCustomerModal && (
        <CustomerModal
          isDarkMode={isDarkMode}
          customers={customers}
          onSelectCustomer={(customer) => {
            setSelectedCustomer(customer);
            setShowCustomerModal(false);
          }}
          onClose={() => setShowCustomerModal(false)}
        />
      )}

      {/* Receipt Modal */}
      {showReceiptModal && lastTransaction && (
        <ReceiptModal
          isDarkMode={isDarkMode}
          transaction={lastTransaction}
          cashTendered={lastCashTendered}
          onClose={() => setShowReceiptModal(false)}
        />
      )}

      {/* Notification Toast */}
      {notification && (
        <div className="fixed bottom-24 right-4 lg:bottom-6 lg:right-6 z-50 animate-in slide-in-from-bottom-4 duration-300">
          <div className={`px-5 py-3.5 rounded-xl shadow-2xl flex items-center gap-3 max-w-sm ${
            notification.type === "error" ? "bg-rose-600 text-white" : "bg-emerald-600 text-white"
          }`}>
            {notification.type === "error"
              ? <AlertCircle className="w-5 h-5 flex-shrink-0" />
              : <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
            }
            <span className="flex-1 text-sm font-medium">{notification.message}</span>
            <button onClick={() => setNotification(null)} className="opacity-75 hover:opacity-100 transition-opacity ml-1">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Clear Cart Modal Component
function ClearCartModal({ isDarkMode, cartLength, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-300">
      <div className={`rounded-2xl shadow-2xl max-w-md w-full p-6 animate-in zoom-in duration-300 ${
        isDarkMode ? "bg-neutral-800" : "bg-white"
      }`}>
        <div className="mb-6">
          <div className="w-16 h-16 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-8 h-8 text-orange-600" />
          </div>
          <h3 className={`text-2xl font-bold mb-2 text-center ${isDarkMode ? "text-white" : "text-neutral-800"}`}>
            Clear Cart?
          </h3>
          <p className={`text-center ${isDarkMode ? "text-neutral-400" : "text-neutral-600"}`}>
            Remove all <span className="font-semibold">{cartLength} items</span> from cart?
          </p>
          <p className={`text-sm text-center mt-2 ${isDarkMode ? "text-neutral-500" : "text-neutral-500"}`}>
            This action cannot be undone.
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
            className="flex-1 px-6 py-3 bg-orange-600 text-white rounded-xl font-semibold hover:bg-orange-700 transition-all shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95"
          >
            Clear Cart
          </button>
        </div>
      </div>
    </div>
  );
}

// Customer Modal Component
function CustomerModal({ isDarkMode, customers, onSelectCustomer, onClose }) {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredCustomers = customers.filter((customer) =>
    customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.customerId?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-300">
      <div className={`w-full max-w-md rounded-2xl shadow-2xl animate-in zoom-in duration-300 ${
        isDarkMode ? "bg-neutral-800" : "bg-white"
      }`}>
        <div className={`p-6 border-b ${isDarkMode ? "border-neutral-700" : "border-neutral-200"}`}>
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-xl ${isDarkMode ? "bg-orange-900/30" : "bg-orange-100"}`}>
                <User className="w-6 h-6 text-orange-600" />
              </div>
              <h2 className={`text-xl font-bold ${isDarkMode ? "text-white" : "text-neutral-800"}`}>
                Select Customer
              </h2>
            </div>
            <button
              onClick={onClose}
              className={`p-2 rounded-xl transition-colors ${
                isDarkMode ? "text-neutral-400 hover:text-white hover:bg-neutral-700" : "text-neutral-600 hover:text-neutral-800 hover:bg-neutral-100"
              }`}
            >
              <X className="w-6 h-6" />
            </button>
          </div>
          
          {/* Search Input */}
          <div className="relative">
            <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${
              isDarkMode ? "text-neutral-500" : "text-neutral-400"
            }`} />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search customers..."
              autoFocus
              className={`w-full pl-10 pr-4 py-2.5 rounded-xl border-2 focus:outline-none focus:border-orange-500 transition-all ${
                isDarkMode 
                  ? "bg-neutral-700 border-neutral-600 text-white placeholder-neutral-400" 
                  : "bg-white border-neutral-200 text-neutral-800 placeholder-neutral-500"
              }`}
            />
          </div>
        </div>
        
        <div className="p-4 max-h-[50vh] overflow-y-auto">
          {filteredCustomers.length === 0 ? (
            <div className="text-center py-12">
              <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${
                isDarkMode ? "bg-neutral-700" : "bg-neutral-100"
              }`}>
                <User className={`w-8 h-8 ${isDarkMode ? "text-neutral-500" : "text-neutral-400"}`} />
              </div>
              <p className={`font-medium ${isDarkMode ? "text-neutral-400" : "text-neutral-600"}`}>
                {searchTerm ? "No customers found" : "No customers available"}
              </p>
              {searchTerm && (
                <p className={`text-sm mt-2 ${isDarkMode ? "text-neutral-500" : "text-neutral-500"}`}>
                  Try a different search term
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredCustomers.map((customer) => (
                <button
                  key={customer._id}
                  onClick={() => onSelectCustomer(customer)}
                  className={`w-full p-4 rounded-xl border-2 text-left transition-all hover:scale-[1.02] shadow-lg ${
                    isDarkMode
                      ? "bg-neutral-700 border-neutral-600 hover:border-orange-500"
                      : "bg-neutral-50 border-neutral-200 hover:border-orange-500"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-orange-600 flex items-center justify-center text-white font-bold shadow-lg">
                      {customer.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className={`font-semibold ${isDarkMode ? "text-white" : "text-neutral-800"}`}>
                        {customer.name}
                      </div>
                      <div className={`text-xs truncate ${isDarkMode ? "text-neutral-400" : "text-neutral-600"}`}>
                        {customer.fullName || customer.customerId || "N/A"}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Receipt Modal Component
function ReceiptModal({ isDarkMode, transaction, onClose, cashTendered }) {
  const tendered = parseFloat(cashTendered) || 0;
  const change = tendered - (transaction?.total || 0);
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-300">
      <div className={`w-full max-w-md rounded-2xl shadow-2xl animate-in zoom-in-95 duration-300 ${isDarkMode ? "bg-neutral-800" : "bg-white"}`}>

        {/* Success header */}
        <div className={`p-6 border-b text-center relative ${isDarkMode ? "border-neutral-700" : "border-neutral-200"}`}>
          <button
            onClick={onClose}
            className={`absolute top-4 right-4 p-2 rounded-xl transition-colors ${isDarkMode ? "text-neutral-400 hover:text-white hover:bg-neutral-700" : "text-neutral-600 hover:text-neutral-800 hover:bg-neutral-100"}`}
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center justify-center mb-3">
            <div className="relative">
              <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center animate-in zoom-in duration-500">
                <CheckCircle2 className="w-9 h-9 text-emerald-600" />
              </div>
              <div className="absolute inset-0 w-16 h-16 bg-emerald-400/20 rounded-full animate-ping" />
            </div>
          </div>
          <h2 className={`text-xl font-bold ${isDarkMode ? "text-white" : "text-neutral-800"}`}>Transaction Complete!</h2>
          <p className={`text-sm mt-1 ${isDarkMode ? "text-neutral-400" : "text-neutral-500"}`}>Receipt generated successfully</p>
        </div>

        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          <div className={`text-center border-b pb-4 ${isDarkMode ? "border-neutral-700" : "border-neutral-200"}`}>
            <div className="flex items-center justify-center gap-2 mb-2">
              <Receipt className={`w-5 h-5 ${isDarkMode ? "text-neutral-400" : "text-neutral-600"}`} />
              <h3 className={`text-2xl font-bold ${isDarkMode ? "text-white" : "text-neutral-800"}`}>
                RECEIPT
              </h3>
            </div>
            <p className={`text-sm font-mono ${isDarkMode ? "text-neutral-400" : "text-neutral-600"}`}>
              {transaction.receiptNumber}
            </p>
            <p className={`text-xs ${isDarkMode ? "text-neutral-500" : "text-neutral-500"}`}>
              {new Date(transaction.createdAt).toLocaleString()}
            </p>
            
            {/* Customer Name - Show for both cash and credit */}
            {(transaction.cashCustomerName || transaction.customer) && (
              <div className={`mt-3 pt-3 border-t ${isDarkMode ? "border-neutral-700" : "border-neutral-200"}`}>
                <p className={`text-xs mb-1 ${isDarkMode ? "text-neutral-500" : "text-neutral-500"}`}>
                  Customer
                </p>
                <p className={`font-semibold ${isDarkMode ? "text-white" : "text-neutral-800"}`}>
                  {transaction.cashCustomerName || transaction.customer?.name || "N/A"}
                </p>
                {transaction.customer?.customerId && (
                  <p className={`text-xs ${isDarkMode ? "text-neutral-500" : "text-neutral-500"}`}>
                    {transaction.customer.customerId}
                  </p>
                )}
              </div>
            )}
            
            {/* Payment Type */}
            <div className="mt-3">
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
                transaction.paymentType === "cash"
                  ? isDarkMode
                    ? "bg-emerald-900/30 text-emerald-400"
                    : "bg-emerald-100 text-emerald-700"
                  : isDarkMode
                  ? "bg-orange-900/30 text-orange-400"
                  : "bg-orange-100 text-orange-700"
              }`}>
                {transaction.paymentType === "cash" ? (
                  <>
                    <Banknote className="w-3.5 h-3.5" />
                    CASH PAYMENT
                  </>
                ) : (
                  <>
                    <CreditCard className="w-3.5 h-3.5" />
                    CREDIT PAYMENT
                  </>
                )}
              </span>
            </div>
          </div>

          <div className="space-y-2">
            {transaction.items.map((item, index) => (
              <div 
                key={index} 
                className={`flex justify-between text-sm pb-2 border-b ${
                  isDarkMode ? "border-neutral-700" : "border-neutral-200"
                }`}
              >
                <div className="flex-1">
                  <div className={`font-medium ${isDarkMode ? "text-white" : "text-neutral-800"}`}>
                    {item.name}
                  </div>
                  <div className={`text-xs ${isDarkMode ? "text-neutral-500" : "text-neutral-500"}`}>
                    {item.quantity} × ₱{item.price.toFixed(2)}
                  </div>
                </div>
                <div className={`font-semibold ${isDarkMode ? "text-white" : "text-neutral-800"}`}>
                  ₱{item.subtotal.toFixed(2)}
                </div>
              </div>
            ))}
          </div>

          <div className={`rounded-xl overflow-hidden ${isDarkMode ? "bg-neutral-700" : "bg-neutral-100"}`}>
            {/* Total row */}
            <div className="flex justify-between items-center px-4 pt-4 pb-2">
              <span className={`font-semibold ${isDarkMode ? "text-neutral-300" : "text-neutral-700"}`}>
                TOTAL
              </span>
              <span className="text-3xl font-bold text-orange-600">
                ₱{transaction.total.toFixed(2)}
              </span>
            </div>
            {/* Cash Tendered + Change — only for cash payments */}
            {transaction.paymentType === "cash" && tendered > 0 && (
              <>
                <div className={`mx-4 border-t ${isDarkMode ? "border-neutral-600" : "border-neutral-200"}`} />
                <div className="flex justify-between items-center px-4 py-2">
                  <span className={`text-sm font-medium ${isDarkMode ? "text-neutral-400" : "text-neutral-500"}`}>
                    Cash Tendered
                  </span>
                  <span className={`text-sm font-semibold ${isDarkMode ? "text-white" : "text-neutral-800"}`}>
                    ₱{tendered.toFixed(2)}
                  </span>
                </div>
                <div className={`mx-4 border-t ${isDarkMode ? "border-neutral-600" : "border-neutral-200"}`} />
                <div className={`flex justify-between items-center px-4 py-3 rounded-b-xl ${
                  isDarkMode ? "bg-emerald-900/30" : "bg-emerald-50"
                }`}>
                  <span className={`text-sm font-bold uppercase tracking-wide ${
                    isDarkMode ? "text-emerald-400" : "text-emerald-700"
                  }`}>
                    Change
                  </span>
                  <span className={`text-xl font-black ${
                    isDarkMode ? "text-emerald-400" : "text-emerald-700"
                  }`}>
                    ₱{change.toFixed(2)}
                  </span>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="p-6 pt-0 flex justify-center">
          <button
            onClick={onClose}
            className={`w-full py-3 rounded-xl font-semibold transition-all transform hover:scale-105 active:scale-95 ${
              isDarkMode ? "bg-neutral-700 hover:bg-neutral-600 text-white" : "bg-neutral-200 hover:bg-neutral-300 text-neutral-800"
            }`}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

export default OrderTransaction;
