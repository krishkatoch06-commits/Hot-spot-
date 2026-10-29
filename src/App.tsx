/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  RestaurantSettings,
  RestaurantTable,
  MenuCategory,
  MenuItem,
  CartItem,
  Order,
  OrderStatus,
  PaymentStatus,
  PaymentMethod,
  UserRole,
} from './types';
import {
  INITIAL_RESTAURANT_SETTINGS,
  INITIAL_TABLES,
  INITIAL_CATEGORIES,
  INITIAL_MENU_ITEMS,
} from './data/defaultMenu';
import {
  fetchSettings,
  updateSettings,
  fetchTables,
  createTable,
  updateTable,
  deleteTable,
  fetchMenu,
  createMenuItem,
  updateMenuItem,
  deleteMenuItem,
  createCategory,
  updateCategory,
  deleteCategory,
  submitOrder,
  fetchOrders,
  fetchOrderById,
  updateOrderStatus,
  updateOrderPayment,
  subscribeToOrders,
} from './lib/api';
import { isSupabaseConfigured, testSupabaseConnection } from './lib/supabase';
import { CustomerMenu } from './components/CustomerMenu';
import { KitchenDashboard } from './components/KitchenDashboard';
import { AdminPanel } from './components/AdminPanel';
import { AuthModal } from './components/AuthModal';
import {
  Utensils,
  ChefHat,
  Shield,
  QrCode,
  LogOut,
  Database,
  CheckCircle,
  AlertCircle,
  ExternalLink,
  Download,
  Printer,
  Copy,
  X,
  Share2,
} from 'lucide-react';
import { generateQrDataUrl, downloadQrCode, printTableStandee } from './lib/qr';

export default function App() {
  // Current active view: 'customer' | 'kitchen' | 'admin'
  const [currentView, setCurrentView] = useState<'customer' | 'kitchen' | 'admin'>('customer');

  // Core Data States
  const [settings, setSettings] = useState<RestaurantSettings>(INITIAL_RESTAURANT_SETTINGS);
  const [tables, setTables] = useState<RestaurantTable[]>(INITIAL_TABLES);
  const [categories, setCategories] = useState<MenuCategory[]>(INITIAL_CATEGORIES);
  const [menuItems, setMenuItems] = useState<MenuItem[]>(INITIAL_MENU_ITEMS);
  const [orders, setOrders] = useState<Order[]>([]);

  // Customer session states
  const [selectedTable, setSelectedTable] = useState<RestaurantTable | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [activeCustomerOrder, setActiveCustomerOrder] = useState<Order | null>(null);

  // Auth states
  const [authRole, setAuthRole] = useState<UserRole | null>(null);
  const [authUserEmail, setAuthUserEmail] = useState<string | null>(null);
  const [authModalTarget, setAuthModalTarget] = useState<'kitchen' | 'admin' | null>(null);

  // Status & loading
  const [isLoading, setIsLoading] = useState(true);
  const [supabaseConnected, setSupabaseConnected] = useState(false);
  const [showDbInfo, setShowDbInfo] = useState(false);
  const [showCommonQrModal, setShowCommonQrModal] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [qrTargetUrl, setQrTargetUrl] = useState<string>(
    'https://certainly-practitioner-assets-earl.trycloudflare.com'
  );
  const [dynamicQrDataUrl, setDynamicQrDataUrl] = useState<string>('/hotspot-menu-qr.png');

  useEffect(() => {
    if (qrTargetUrl) {
      generateQrDataUrl(qrTargetUrl).then(setDynamicQrDataUrl);
    }
  }, [qrTargetUrl]);

  // 1. Initial Load of Server Data
  const loadAllData = async () => {
    try {
      setIsLoading(true);
      const [fetchedSettings, fetchedTables, fetchedMenu, fetchedOrders] = await Promise.all([
        fetchSettings().catch(() => INITIAL_RESTAURANT_SETTINGS),
        fetchTables().catch(() => INITIAL_TABLES),
        fetchMenu().catch(() => ({ categories: INITIAL_CATEGORIES, menuItems: INITIAL_MENU_ITEMS })),
        fetchOrders().catch(() => []),
      ]);

      setSettings(fetchedSettings);
      setTables(fetchedTables);
      setCategories(fetchedMenu.categories);
      setMenuItems(fetchedMenu.menuItems);
      setOrders(fetchedOrders);

      // Check URL query param for table (e.g. /menu?table=3)
      const urlParams = new URLSearchParams(window.location.search);
      const tableParam = urlParams.get('table');
      if (tableParam) {
        const found = fetchedTables.find(
          (t) => t.tableNumber === tableParam || t.qrSlug === `t-${tableParam}`
        );
        if (found) setSelectedTable(found);
      } else if (!selectedTable && fetchedTables.length > 0) {
        // Default to Table 1 for seamless first customer preview
        setSelectedTable(fetchedTables[0]);
      }

      // Check URL path for direct view navigation
      if (window.location.pathname.includes('/kitchen')) {
        setCurrentView('kitchen');
      } else if (window.location.pathname.includes('/admin')) {
        setCurrentView('admin');
      }
    } catch (err) {
      console.warn('Initial data load error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();

    // Check Supabase status
    if (isSupabaseConfigured()) {
      testSupabaseConnection().then((res) => {
        setSupabaseConnected(res.success);
      });
    }
  }, []);

  // 2. Realtime Order Subscription (SSE + Supabase Realtime)
  useEffect(() => {
    const unsubscribe = subscribeToOrders((event, data) => {
      if (event === 'new_order') {
        const newOrder = data as Order;
        setOrders((prev) => {
          if (prev.some((o) => o.id === newOrder.id)) return prev;
          return [newOrder, ...prev];
        });
      } else if (event === 'order_status_updated') {
        const { order } = data;
        if (order) {
          setOrders((prev) => prev.map((o) => (o.id === order.id ? order : o)));
          if (activeCustomerOrder?.id === order.id) {
            setActiveCustomerOrder(order);
          }
        }
      } else if (event === 'order_payment_updated') {
        const updatedOrder = data as Order;
        setOrders((prev) => prev.map((o) => (o.id === updatedOrder.id ? updatedOrder : o)));
      }
    });

    return () => unsubscribe();
  }, [activeCustomerOrder]);

  // Cart operations
  const handleAddToCart = (newItem: CartItem) => {
    setCart((prev) => {
      // Check if item with same variant, addons and instructions already in cart
      const existingIdx = prev.findIndex(
        (i) =>
          i.menuItem.id === newItem.menuItem.id &&
          i.selectedVariant?.id === newItem.selectedVariant?.id &&
          i.specialInstructions === newItem.specialInstructions &&
          JSON.stringify(i.selectedAddons) === JSON.stringify(newItem.selectedAddons)
      );

      if (existingIdx !== -1) {
        const updated = [...prev];
        const exist = updated[existingIdx];
        const newQty = exist.quantity + newItem.quantity;
        updated[existingIdx] = {
          ...exist,
          quantity: newQty,
          itemTotal: (exist.unitPrice + exist.selectedAddons.reduce((s, a) => s + a.price, 0)) * newQty,
        };
        return updated;
      }
      return [...prev, newItem];
    });
  };

  const handleUpdateCartQty = (cartItemId: string, newQty: number) => {
    if (newQty <= 0) {
      handleRemoveCartItem(cartItemId);
      return;
    }
    setCart((prev) =>
      prev.map((item) => {
        if (item.cartItemId !== cartItemId) return item;
        const addonsTotal = item.selectedAddons.reduce((s, a) => s + a.price, 0);
        return {
          ...item,
          quantity: newQty,
          itemTotal: (item.unitPrice + addonsTotal) * newQty,
        };
      })
    );
  };

  const handleRemoveCartItem = (cartItemId: string) => {
    setCart((prev) => prev.filter((i) => i.cartItemId !== cartItemId));
  };

  const handleClearCart = () => {
    setCart([]);
  };

  // Submit Order flow (Server Authoritative)
  const handleSubmitOrder = async (details: {
    customerName: string;
    customerPhone?: string;
    specialInstructions?: string;
    paymentMethod: PaymentMethod;
  }): Promise<Order> => {
    if (!selectedTable) {
      throw new Error('Please select your dining table before submitting.');
    }

    const placedOrder = await submitOrder({
      tableNumber: selectedTable.tableNumber,
      customerName: details.customerName,
      customerPhone: details.customerPhone,
      cartItems: cart,
      specialInstructions: details.specialInstructions,
      paymentMethod: details.paymentMethod,
    });

    setActiveCustomerOrder(placedOrder);
    setCart([]);
    // Update local orders list immediately
    setOrders((prev) => [placedOrder, ...prev]);
    return placedOrder;
  };

  // View Switching with Role Check
  const handleSwitchView = (view: 'customer' | 'kitchen' | 'admin') => {
    if (view === 'kitchen') {
      if (!authRole) {
        setAuthModalTarget('kitchen');
        return;
      }
    } else if (view === 'admin') {
      if (authRole !== 'admin') {
        setAuthModalTarget('admin');
        return;
      }
    }
    setCurrentView(view);
  };

  const handleLogout = () => {
    setAuthRole(null);
    setAuthUserEmail(null);
    setCurrentView('customer');
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF7F2] text-[#1E1E24]">
      {/* GLOBAL SYSTEM HEADER / VIEW SWITCHER BAR */}
      <nav className="bg-[#19191D] text-white border-b border-white/10 px-4 py-2.5 z-40 sticky top-0">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          {/* Logo & Info */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-[#C85A32] text-white flex items-center justify-center font-bold text-sm shadow-sm">
              HS
            </div>
            <div>
              <div className="text-xs font-bold text-white flex items-center gap-2">
                <span>Hot Spot Hamirpur</span>
                <span className="text-[10px] px-2 py-0.2 rounded-full bg-[#C85A32]/20 text-amber-300 font-semibold border border-amber-500/30">
                  QR System
                </span>
              </div>
              <div className="text-[10px] text-white/50">
                Contactless Dining • Kitchen Display • Cloud Admin
              </div>
            </div>
          </div>

          {/* View Toggles */}
          <div className="flex items-center gap-1.5 bg-white/10 p-1 rounded-2xl border border-white/10">
            <button
              onClick={() => handleSwitchView('customer')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                currentView === 'customer'
                  ? 'bg-[#C85A32] text-white shadow-sm'
                  : 'text-white/70 hover:text-white'
              }`}
            >
              <Utensils className="w-3.5 h-3.5" />
              <span>Customer Menu</span>
            </button>

            <button
              onClick={() => handleSwitchView('kitchen')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                currentView === 'kitchen'
                  ? 'bg-[#C85A32] text-white shadow-sm'
                  : 'text-white/70 hover:text-white'
              }`}
            >
              <ChefHat className="w-3.5 h-3.5" />
              <span>Kitchen (KDS)</span>
              {orders.filter((o) => o.status === 'new').length > 0 && (
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
              )}
            </button>

            <button
              onClick={() => handleSwitchView('admin')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                currentView === 'admin'
                  ? 'bg-[#C85A32] text-white shadow-sm'
                  : 'text-white/70 hover:text-white'
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              <span>Admin Panel</span>
            </button>

            <button
              onClick={() => setShowCommonQrModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-[#C85A32]/25 hover:bg-[#C85A32]/40 text-amber-300 border border-amber-500/40 transition-all shadow-xs"
              title="View and download common restaurant QR code"
            >
              <QrCode className="w-3.5 h-3.5 text-amber-300" />
              <span>Get Menu QR</span>
            </button>
          </div>

          {/* Database & Auth status badges */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowDbInfo(!showDbInfo)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-[11px] font-semibold text-white/80"
            >
              <Database className="w-3 h-3 text-[#C85A32]" />
              <span>{supabaseConnected ? 'Supabase Cloud' : 'Server Engine'}</span>
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  supabaseConnected ? 'bg-emerald-400' : 'bg-amber-400'
                }`}
              />
            </button>

            {authRole ? (
              <div className="flex items-center gap-2 pl-1 border-l border-white/20">
                <span className="text-[11px] font-bold text-amber-300 capitalize">
                  {authRole}
                </span>
                <button
                  onClick={handleLogout}
                  title="Logout"
                  className="p-1 text-white/60 hover:text-white hover:bg-white/10 rounded-lg"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </nav>

      {/* Supabase Connection Details Dropdown Banner */}
      {showDbInfo && (
        <div className="bg-[#FAF1EC] border-b border-[#F3D5C6] px-4 py-3 text-xs text-[#9B3C1B]">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-[#C85A32] shrink-0" />
              <span>
                {supabaseConnected ? (
                  <strong>Connected to Supabase PostgreSQL database! Tables and Realtime active.</strong>
                ) : (
                  <span>
                    Running in <strong>Persistent Server-Backed Engine</strong>. To connect your Supabase PostgreSQL cloud project, open <strong>Admin Panel &gt; Restaurant & Supabase</strong>.
                  </span>
                )}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setShowDbInfo(false);
                  handleSwitchView('admin');
                }}
                className="font-bold underline text-[#C85A32]"
              >
                Open Database Settings
              </button>
              <button
                onClick={() => setShowDbInfo(false)}
                className="text-gray-500 hover:text-gray-800 ml-2"
              >
                ✕
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MAIN VIEW CONTENT */}
      <div className="flex-1">
        {currentView === 'customer' && (
          <CustomerMenu
            settings={settings}
            tables={tables}
            categories={categories}
            menuItems={menuItems}
            selectedTable={selectedTable}
            onSelectTable={setSelectedTable}
            cart={cart}
            onAddToCart={handleAddToCart}
            onUpdateCartQty={handleUpdateCartQty}
            onRemoveCartItem={handleRemoveCartItem}
            onClearCart={handleClearCart}
            onSubmitOrder={handleSubmitOrder}
            activeOrder={activeCustomerOrder}
            onRefreshActiveOrder={() => {
              if (activeCustomerOrder) {
                fetchOrderById(activeCustomerOrder.id).then(setActiveCustomerOrder);
              }
            }}
          />
        )}

        {currentView === 'kitchen' && (
          <KitchenDashboard
            orders={orders}
            onUpdateOrderStatus={async (id, status, notes, cancelReason) => {
              const updated = await updateOrderStatus(id, status, notes, cancelReason);
              setOrders((prev) => prev.map((o) => (o.id === updated.id ? updated : o)));
            }}
            onRefreshOrders={async () => {
              const fresh = await fetchOrders();
              setOrders(fresh);
            }}
            currencySymbol={settings.currencySymbol}
          />
        )}

        {currentView === 'admin' && (
          <AdminPanel
            settings={settings}
            onUpdateSettings={async (newSet) => {
              const updated = await updateSettings(newSet);
              setSettings(updated);
            }}
            tables={tables}
            onAddTable={async (tbl) => {
              const created = await createTable(tbl);
              setTables((prev) => [...prev, created]);
            }}
            onUpdateTable={async (id, tbl) => {
              const updated = await updateTable(id, tbl);
              setTables((prev) => prev.map((t) => (t.id === id ? updated : t)));
            }}
            onDeleteTable={async (id) => {
              await deleteTable(id);
              setTables((prev) => prev.filter((t) => t.id !== id));
            }}
            categories={categories}
            onAddCategory={async (cat) => {
              const created = await createCategory(cat);
              setCategories((prev) => [...prev, created]);
            }}
            onUpdateCategory={async (id, cat) => {
              const updated = await updateCategory(id, cat);
              setCategories((prev) => prev.map((c) => (c.id === id ? updated : c)));
            }}
            onDeleteCategory={async (id) => {
              await deleteCategory(id);
              setCategories((prev) => prev.filter((c) => c.id !== id));
            }}
            menuItems={menuItems}
            onAddMenuItem={async (item) => {
              const created = await createMenuItem(item);
              setMenuItems((prev) => [created, ...prev]);
            }}
            onUpdateMenuItem={async (id, item) => {
              const updated = await updateMenuItem(id, item);
              setMenuItems((prev) => prev.map((m) => (m.id === id ? updated : m)));
            }}
            onDeleteMenuItem={async (id) => {
              await deleteMenuItem(id);
              setMenuItems((prev) => prev.filter((m) => m.id !== id));
            }}
            orders={orders}
            onUpdateOrderStatus={async (id, status, notes, cancelReason) => {
              const updated = await updateOrderStatus(id, status, notes, cancelReason);
              setOrders((prev) => prev.map((o) => (o.id === updated.id ? updated : o)));
            }}
            onUpdateOrderPayment={async (id, paymentStatus) => {
              const updated = await updateOrderPayment(id, paymentStatus);
              setOrders((prev) => prev.map((o) => (o.id === updated.id ? updated : o)));
            }}
            onRefreshData={loadAllData}
          />
        )}
      </div>

      {/* AUTH MODAL FOR PROTECTED ACCESS */}
      <AuthModal
        isOpen={Boolean(authModalTarget)}
        onClose={() => setAuthModalTarget(null)}
        targetRole={authModalTarget || 'admin'}
        onAuthenticated={(role, userEmail) => {
          setAuthRole(role);
          setAuthUserEmail(userEmail);
          if (authModalTarget) {
            setCurrentView(authModalTarget);
          }
          setAuthModalTarget(null);
        }}
      />

      {/* COMMON RESTAURANT QR CODE MODAL */}
      {showCommonQrModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
          <div className="relative w-full max-w-md bg-[#FAF7F2] rounded-3xl p-6 sm:p-8 shadow-2xl border border-[#EADBCE] text-[#1E1E24]">
            <button
              onClick={() => setShowCommonQrModal(false)}
              className="absolute top-4 right-4 p-2 text-[#6B696F] hover:text-[#1E1E24] hover:bg-[#F3ECE1] rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center mb-4">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#C85A32] bg-[#FBEFE9] px-3 py-1 rounded-full border border-[#F3D5C6]">
                One Common Restaurant QR
              </span>
              <h2 className="text-2xl font-serif font-black text-[#1E1E24] mt-2">
                Hot Spot Digital Menu
              </h2>
              <p className="text-xs text-[#6B696F] mt-1 max-w-xs mx-auto">
                Scan with any iPhone or Android camera to access the full digital menu and select your table.
              </p>
            </div>

            {/* QR Code Graphic Frame */}
            <div className="bg-white p-4 rounded-2xl border-2 border-dashed border-[#C85A32] text-center max-w-[240px] mx-auto shadow-sm">
              <img
                src={dynamicQrDataUrl || '/hotspot-menu-qr.png'}
                alt="Hot Spot Restaurant Menu QR"
                className="w-full h-auto aspect-square object-contain mx-auto rounded-lg"
              />
              <div className="text-[11px] font-bold text-[#C85A32] mt-2 tracking-wide uppercase">
                Scan to Open Menu
              </div>
            </div>

            {/* Target URL Selector / Presets */}
            <div className="mt-4 space-y-2">
              <div className="flex items-center justify-between text-[11px] font-bold text-[#6B696F]">
                <span>QR Destination URL:</span>
                <span className="text-[#C85A32]">Updates QR instantly</span>
              </div>

              <div className="flex flex-wrap gap-1.5 text-[11px]">
                <button
                  type="button"
                  onClick={() => setQrTargetUrl('https://certainly-practitioner-assets-earl.trycloudflare.com')}
                  className={`flex-1 min-w-[130px] py-1.5 px-2 rounded-lg font-bold border transition-colors ${
                    qrTargetUrl.includes('trycloudflare')
                      ? 'bg-emerald-700 text-white border-emerald-700'
                      : 'bg-white text-[#1E1E24] border-[#EADBCE] hover:border-emerald-600'
                  }`}
                >
                  ● Direct Public URL (No Login)
                </button>
                <button
                  type="button"
                  onClick={() => setQrTargetUrl(window.location.origin)}
                  className={`py-1.5 px-2.5 rounded-lg font-semibold border transition-colors ${
                    qrTargetUrl === window.location.origin
                      ? 'bg-[#C85A32] text-white border-[#C85A32]'
                      : 'bg-white text-[#1E1E24] border-[#EADBCE]'
                  }`}
                >
                  AI Studio Dev
                </button>
                <button
                  type="button"
                  onClick={() => setQrTargetUrl('https://ais-pre-5ljgi7iftlfvkcmjl7wwkm-26547333946.asia-southeast1.run.app')}
                  className={`py-1.5 px-2.5 rounded-lg font-semibold border transition-colors ${
                    qrTargetUrl.includes('ais-pre')
                      ? 'bg-[#C85A32] text-white border-[#C85A32]'
                      : 'bg-white text-[#1E1E24] border-[#EADBCE]'
                  }`}
                >
                  Published URL
                </button>
              </div>

              {/* Editable Input Box */}
              <div className="p-2.5 bg-white border border-[#EADBCE] rounded-xl flex items-center justify-between gap-2 shadow-2xs">
                <input
                  type="text"
                  value={qrTargetUrl}
                  onChange={(e) => setQrTargetUrl(e.target.value)}
                  className="w-full text-xs font-mono text-[#1E1E24] bg-transparent focus:outline-none"
                  placeholder="https://..."
                />
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(qrTargetUrl);
                    setCopiedUrl(true);
                    setTimeout(() => setCopiedUrl(false), 2500);
                  }}
                  className="flex items-center gap-1 px-2 py-1 bg-[#FAF7F2] hover:bg-[#F3ECE1] text-[11px] font-bold text-[#1E1E24] rounded-lg border border-[#EADBCE] shrink-0 transition-colors"
                >
                  {copiedUrl ? <CheckCircle className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedUrl ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            </div>

            {/* Deployment note */}
            <div className="mt-3 p-2.5 bg-[#FAF1EC] border border-[#F3D5C6] rounded-xl text-[11px] text-[#9B3C1B] leading-relaxed">
              💡 <strong>To allow all customers to scan without logging into Google:</strong> Click <strong>Publish</strong> or <strong>Share</strong> in the top-right AI Studio toolbar. Once published, anyone scanning can access immediately.
            </div>

            {/* Actions */}
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => downloadQrCode(dynamicQrDataUrl, 'hotspot-restaurant-menu-qr.png')}
                className="flex items-center justify-center gap-1.5 py-3 px-3 bg-[#C85A32] hover:bg-[#B04B26] text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
              >
                <Download className="w-4 h-4" />
                <span>Download PNG</span>
              </button>

              <button
                type="button"
                onClick={() =>
                  printTableStandee({
                    restaurantName: settings.name,
                    tagline: settings.tagline,
                    qrDataUrl: dynamicQrDataUrl,
                    menuUrl: qrTargetUrl,
                  })
                }
                className="flex items-center justify-center gap-1.5 py-3 px-3 bg-white hover:bg-[#FAF7F2] border border-[#EADBCE] text-[#1E1E24] rounded-xl text-xs font-bold shadow-xs transition-colors"
              >
                <Printer className="w-4 h-4" />
                <span>Print Standee</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
