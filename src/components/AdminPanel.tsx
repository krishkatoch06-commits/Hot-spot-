import React, { useState, useEffect } from 'react';
import {
  RestaurantSettings,
  RestaurantTable,
  MenuCategory,
  MenuItem,
  Order,
  OrderStatus,
  PaymentStatus,
  StaffUser,
} from '../types';
import {
  LayoutDashboard,
  UtensilsCrossed,
  QrCode,
  ClipboardList,
  Settings,
  Users,
  Plus,
  Trash2,
  Edit2,
  Download,
  Upload,
  Sparkles,
  Search,
  CheckCircle2,
  Database,
  ExternalLink,
  Printer,
  Copy,
  DollarSign,
  TrendingUp,
  AlertTriangle,
} from 'lucide-react';
import { generateQrDataUrl, downloadQrCode, printTableStandee } from '../lib/qr';
import {
  testSupabaseConnection,
  saveSupabaseCredentials,
  isSupabaseConfigured,
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
} from '../lib/supabase';
import { extractMenuWithAI, bulkImportMenu } from '../lib/api';

interface AdminPanelProps {
  settings: RestaurantSettings;
  onUpdateSettings: (settings: Partial<RestaurantSettings>) => Promise<void>;
  tables: RestaurantTable[];
  onAddTable: (table: Partial<RestaurantTable>) => Promise<void>;
  onUpdateTable: (id: string, table: Partial<RestaurantTable>) => Promise<void>;
  onDeleteTable: (id: string) => Promise<void>;
  categories: MenuCategory[];
  onAddCategory: (cat: Partial<MenuCategory>) => Promise<void>;
  onUpdateCategory: (id: string, cat: Partial<MenuCategory>) => Promise<void>;
  onDeleteCategory: (id: string) => Promise<void>;
  menuItems: MenuItem[];
  onAddMenuItem: (item: Partial<MenuItem>) => Promise<void>;
  onUpdateMenuItem: (id: string, item: Partial<MenuItem>) => Promise<void>;
  onDeleteMenuItem: (id: string) => Promise<void>;
  orders: Order[];
  onUpdateOrderStatus: (id: string, status: OrderStatus, notes?: string, cancelReason?: string) => Promise<void>;
  onUpdateOrderPayment: (id: string, status: PaymentStatus) => Promise<void>;
  onRefreshData: () => void;
}

type AdminTab = 'dashboard' | 'menu' | 'tables' | 'orders' | 'settings' | 'staff';

export const AdminPanel: React.FC<AdminPanelProps> = ({
  settings,
  onUpdateSettings,
  tables,
  onAddTable,
  onUpdateTable,
  onDeleteTable,
  categories,
  onAddCategory,
  onUpdateCategory,
  onDeleteCategory,
  menuItems,
  onAddMenuItem,
  onUpdateMenuItem,
  onDeleteMenuItem,
  orders,
  onUpdateOrderStatus,
  onUpdateOrderPayment,
  onRefreshData,
}) => {
  const [activeTab, setActiveTab] = useState<AdminTab>('dashboard');
  const [saveLoading, setSaveLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // QR Generation state
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [permanentMenuUrl, setPermanentMenuUrl] = useState<string>(
    typeof window !== 'undefined' ? `${window.location.origin}/menu` : 'https://hotspot-hamirpur.com/menu'
  );

  useEffect(() => {
    generateQrDataUrl(permanentMenuUrl).then(setQrDataUrl);
  }, [permanentMenuUrl]);

  // Temporary item form modal
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Partial<MenuItem> | null>(null);

  // AI Extraction state
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiTextInput, setAiTextInput] = useState('');
  const [aiPreviewData, setAiPreviewData] = useState<any>(null);

  // Supabase settings state
  const [supabaseUrlInput, setSupabaseUrlInput] = useState(SUPABASE_URL);
  const [supabaseKeyInput, setSupabaseKeyInput] = useState(SUPABASE_ANON_KEY);
  const [supabaseTestStatus, setSupabaseTestStatus] = useState<string | null>(null);

  // Staff users list (default initial owner + demo staff)
  const [staffUsers, setStaffUsers] = useState<StaffUser[]>([
    {
      id: 'staff-1',
      fullName: 'Head Chef & Owner',
      email: 'owner@hotspot.com',
      role: 'admin',
      isActive: true,
      createdAt: '2026-01-01T00:00:00Z',
    },
    {
      id: 'staff-2',
      fullName: 'Floor Manager / Counter',
      email: 'manager@hotspot.com',
      role: 'staff',
      isActive: true,
      createdAt: '2026-01-10T00:00:00Z',
    },
    {
      id: 'staff-3',
      fullName: 'Lead Line Expediter',
      email: 'kitchen@hotspot.com',
      role: 'kitchen',
      isActive: true,
      createdAt: '2026-01-15T00:00:00Z',
    },
  ]);

  // Order filters
  const [orderSearchQuery, setOrderSearchQuery] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState('all');

  // Stats calculation
  const totalSales = orders
    .filter((o) => o.status !== 'cancelled')
    .reduce((sum, o) => sum + o.totalAmount, 0);

  const pendingCount = orders.filter((o) => o.status === 'new' || o.status === 'accepted').length;
  const preparingCount = orders.filter((o) => o.status === 'preparing').length;
  const readyCount = orders.filter((o) => o.status === 'ready').length;
  const servedCount = orders.filter((o) => o.status === 'served').length;

  const showFeedback = (text: string, type: 'success' | 'error' = 'success') => {
    setStatusMsg({ text, type });
    setTimeout(() => setStatusMsg(null), 4000);
  };

  // ---------------------------------------------------------------------------
  // CSV EXPORT / IMPORT
  // ---------------------------------------------------------------------------
  const exportMenuCsv = () => {
    const headers = ['Category', 'Name', 'Description', 'Price', 'IsVeg', 'IsAvailable', 'PrepTimeMinutes'];
    const rows = menuItems.map((item) => {
      const cat = categories.find((c) => c.id === item.categoryId)?.name || 'General';
      return [
        `"${cat.replace(/"/g, '""')}"`,
        `"${item.name.replace(/"/g, '""')}"`,
        `"${(item.description || '').replace(/"/g, '""')}"`,
        item.basePrice,
        item.isVeg ? 'true' : 'false',
        item.isAvailable ? 'true' : 'false',
        item.preparationTimeMinutes,
      ].join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `hotspot_menu_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showFeedback('Menu exported to CSV successfully!');
  };

  const exportOrdersCsv = () => {
    const headers = ['OrderNumber', 'Table', 'Customer', 'Status', 'PaymentStatus', 'Total', 'Date'];
    const rows = orders.map((o) => [
      o.orderNumber,
      `Table ${o.tableNumber}`,
      `"${o.customerName.replace(/"/g, '""')}"`,
      o.status,
      o.paymentStatus,
      o.totalAmount,
      new Date(o.createdAt).toLocaleString(),
    ].join(','));

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `hotspot_orders_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showFeedback('Orders exported to CSV!');
  };

  const handleCsvFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        const lines = text.split('\n').filter((l) => l.trim().length > 0);
        if (lines.length < 2) throw new Error('CSV is empty');

        const parsedItems: any[] = [];
        for (let i = 1; i < lines.length; i++) {
          const parts = lines[i].split(',').map((p) => p.trim().replace(/^"|"$/g, ''));
          if (parts.length >= 4) {
            parsedItems.push({
              categoryName: parts[0] || 'Gourmet Bites',
              name: parts[1],
              description: parts[2] || '',
              basePrice: Number(parts[3]) || 120,
              isVeg: parts[4] !== 'false',
              isAvailable: parts[5] !== 'false',
              preparationTimeMinutes: Number(parts[6]) || 15,
            });
          }
        }

        const res = await bulkImportMenu(parsedItems);
        showFeedback(res.message);
        onRefreshData();
      } catch (err: any) {
        showFeedback(`Failed to parse CSV: ${err.message}`, 'error');
      }
    };
    reader.readAsText(file);
  };

  // ---------------------------------------------------------------------------
  // AI OCR / IMAGE & TEXT EXTRACTION
  // ---------------------------------------------------------------------------
  const handleAiPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setAiLoading(true);
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const base64 = reader.result as string;
        const result = await extractMenuWithAI({
          imageBase64: base64,
          mimeType: file.type || 'image/jpeg',
        });
        setAiPreviewData(result);
      } catch (err: any) {
        showFeedback(err.message || 'AI extraction failed', 'error');
      } finally {
        setAiLoading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleAiTextExtract = async () => {
    if (!aiTextInput.trim()) return;
    setAiLoading(true);
    try {
      const result = await extractMenuWithAI({ textInput: aiTextInput });
      setAiPreviewData(result);
    } catch (err: any) {
      showFeedback(err.message || 'AI extraction failed', 'error');
    } finally {
      setAiLoading(false);
    }
  };

  const handleConfirmAiImport = async () => {
    if (!aiPreviewData?.items) return;
    try {
      const res = await bulkImportMenu(aiPreviewData.items, aiPreviewData.categories);
      showFeedback(res.message);
      setIsAiModalOpen(false);
      setAiPreviewData(null);
      setAiTextInput('');
      onRefreshData();
    } catch (err: any) {
      showFeedback(err.message, 'error');
    }
  };

  // ---------------------------------------------------------------------------
  // SUPABASE TEST CONNECTION
  // ---------------------------------------------------------------------------
  const handleTestSupabase = async () => {
    setSupabaseTestStatus('Testing connection to Supabase cloud...');
    saveSupabaseCredentials(supabaseUrlInput, supabaseKeyInput);
    const res = await testSupabaseConnection(supabaseUrlInput, supabaseKeyInput);
    setSupabaseTestStatus(res.message);
  };

  return (
    <div className="min-h-screen bg-[#FAF7F2] flex flex-col pb-20">
      {/* Top Navbar */}
      <header className="bg-white border-b border-[#EADBCE] sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#C85A32] text-white flex items-center justify-center font-bold">
              HS
            </div>
            <div>
              <h1 className="font-serif font-black text-xl text-[#1E1E24]">
                Hot Spot Admin Control
              </h1>
              <p className="text-xs text-[#6B696F]">
                Hamirpur, HP • Restaurant Management Suite
              </p>
            </div>
          </div>

          {/* Quick status feedback toast */}
          {statusMsg && (
            <div
              className={`px-4 py-2 rounded-xl text-xs font-bold shadow-md transition-all ${
                statusMsg.type === 'success'
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                  : 'bg-red-100 text-red-800 border border-red-300'
              }`}
            >
              {statusMsg.text}
            </div>
          )}
        </div>

        {/* Tab navigation bar */}
        <div className="max-w-7xl mx-auto px-4 flex items-center gap-1 overflow-x-auto no-scrollbar border-t border-[#F3ECE1]">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'dashboard'
                ? 'border-[#C85A32] text-[#C85A32]'
                : 'border-transparent text-[#6B696F] hover:text-[#1E1E24]'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>Dashboard</span>
          </button>
          <button
            onClick={() => setActiveTab('menu')}
            className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'menu'
                ? 'border-[#C85A32] text-[#C85A32]'
                : 'border-transparent text-[#6B696F] hover:text-[#1E1E24]'
            }`}
          >
            <UtensilsCrossed className="w-4 h-4" />
            <span>Menu & Dishes ({menuItems.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('tables')}
            className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'tables'
                ? 'border-[#C85A32] text-[#C85A32]'
                : 'border-transparent text-[#6B696F] hover:text-[#1E1E24]'
            }`}
          >
            <QrCode className="w-4 h-4" />
            <span>Tables & QR Standee</span>
          </button>
          <button
            onClick={() => setActiveTab('orders')}
            className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'orders'
                ? 'border-[#C85A32] text-[#C85A32]'
                : 'border-transparent text-[#6B696F] hover:text-[#1E1E24]'
            }`}
          >
            <ClipboardList className="w-4 h-4" />
            <span>All Orders ({orders.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'settings'
                ? 'border-[#C85A32] text-[#C85A32]'
                : 'border-transparent text-[#6B696F] hover:text-[#1E1E24]'
            }`}
          >
            <Settings className="w-4 h-4" />
            <span>Restaurant & Supabase</span>
          </button>
          <button
            onClick={() => setActiveTab('staff')}
            className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'staff'
                ? 'border-[#C85A32] text-[#C85A32]'
                : 'border-transparent text-[#6B696F] hover:text-[#1E1E24]'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Staff & Roles</span>
          </button>
        </div>
      </header>

      {/* Main Tab Content */}
      <main className="max-w-7xl mx-auto px-4 py-6 flex-1 w-full">
        {/* ------------------------------------------------------------------ */}
        {/* TAB 1: DASHBOARD OVERVIEW */}
        {/* ------------------------------------------------------------------ */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            {/* Top KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white rounded-3xl p-5 border border-[#EADBCE] shadow-xs">
                <div className="flex items-center justify-between text-[#8C8A90] text-xs font-bold uppercase">
                  <span>Today's Total Sales</span>
                  <DollarSign className="w-4 h-4 text-[#C85A32]" />
                </div>
                <div className="text-2xl sm:text-3xl font-serif font-black text-[#1E1E24] mt-2">
                  {settings.currencySymbol}{totalSales.toFixed(2)}
                </div>
                <div className="text-xs text-emerald-700 font-semibold mt-1 flex items-center gap-1">
                  <TrendingUp className="w-3.5 h-3.5" />
                  <span>{orders.length} orders recorded</span>
                </div>
              </div>

              <div className="bg-white rounded-3xl p-5 border border-[#EADBCE] shadow-xs">
                <div className="flex items-center justify-between text-[#8C8A90] text-xs font-bold uppercase">
                  <span>Pending / In Queue</span>
                  <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                </div>
                <div className="text-2xl sm:text-3xl font-serif font-black text-[#1E1E24] mt-2">
                  {pendingCount}
                </div>
                <div className="text-xs text-[#6B696F] mt-1">Awaiting kitchen accept</div>
              </div>

              <div className="bg-white rounded-3xl p-5 border border-[#EADBCE] shadow-xs">
                <div className="flex items-center justify-between text-[#8C8A90] text-xs font-bold uppercase">
                  <span>Cooking / Preparing</span>
                  <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                </div>
                <div className="text-2xl sm:text-3xl font-serif font-black text-[#1E1E24] mt-2">
                  {preparingCount}
                </div>
                <div className="text-xs text-[#6B696F] mt-1">Active on chef stations</div>
              </div>

              <div className="bg-white rounded-3xl p-5 border border-[#EADBCE] shadow-xs">
                <div className="flex items-center justify-between text-[#8C8A90] text-xs font-bold uppercase">
                  <span>Ready or Served</span>
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                </div>
                <div className="text-2xl sm:text-3xl font-serif font-black text-[#1E1E24] mt-2">
                  {readyCount + servedCount}
                </div>
                <div className="text-xs text-emerald-700 mt-1">{servedCount} successfully served</div>
              </div>
            </div>

            {/* Quick Actions & Recent Orders */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Recent Orders List */}
              <div className="lg:col-span-2 bg-white rounded-3xl p-6 border border-[#EADBCE] shadow-xs">
                <div className="flex items-center justify-between pb-4 border-b border-[#F3ECE1]">
                  <div>
                    <h3 className="font-serif font-bold text-lg text-[#1E1E24]">Recent Orders</h3>
                    <p className="text-xs text-[#6B696F]">Live stream of restaurant floor activity</p>
                  </div>
                  <button
                    onClick={() => setActiveTab('orders')}
                    className="text-xs font-bold text-[#C85A32] hover:underline"
                  >
                    View All Orders &rarr;
                  </button>
                </div>

                <div className="divide-y divide-[#F3ECE1] mt-3">
                  {orders.slice(0, 5).map((o) => (
                    <div key={o.id} className="py-3 flex items-center justify-between text-xs">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-[#1E1E24] text-sm">#{o.orderNumber}</span>
                          <span className="px-2 py-0.5 rounded-md bg-[#FBEFE9] text-[#C85A32] font-semibold text-[11px]">
                            Table {o.tableNumber}
                          </span>
                        </div>
                        <div className="text-[#6B696F] mt-0.5">
                          {o.customerName} • {o.items.length} items • {new Date(o.createdAt).toLocaleTimeString()}
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="font-bold text-sm text-[#1E1E24]">
                          {settings.currencySymbol}{o.totalAmount}
                        </div>
                        <span
                          className={`capitalize px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            o.status === 'served'
                              ? 'bg-emerald-100 text-emerald-800'
                              : o.status === 'cancelled'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {o.status}
                        </span>
                      </div>
                    </div>
                  ))}
                  {orders.length === 0 && (
                    <div className="py-8 text-center text-[#6B696F] text-xs">
                      No orders placed yet today. Open the customer menu to submit a test order!
                    </div>
                  )}
                </div>
              </div>

              {/* Best-sellers / Menu Summary */}
              <div className="bg-white rounded-3xl p-6 border border-[#EADBCE] shadow-xs space-y-4">
                <h3 className="font-serif font-bold text-lg text-[#1E1E24]">
                  Top Menu Highlights
                </h3>
                <div className="space-y-3">
                  {menuItems.filter((m) => m.isBestseller).slice(0, 5).map((item) => (
                    <div key={item.id} className="flex items-center gap-3 p-2 rounded-xl bg-[#FAF7F2]">
                      <img
                        src={item.imageUrl}
                        alt={item.name}
                        className="w-10 h-10 rounded-lg object-cover"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-xs text-[#1E1E24] truncate">{item.name}</div>
                        <div className="text-[11px] text-[#6B696F]">
                          {settings.currencySymbol}{item.basePrice}
                        </div>
                      </div>
                      <span className="text-[10px] font-bold text-[#C85A32] bg-white px-2 py-1 rounded-md border border-[#EADBCE]">
                        Bestseller
                      </span>
                    </div>
                  ))}
                </div>

                <div className="pt-2">
                  <button
                    onClick={() => setActiveTab('menu')}
                    className="w-full py-2.5 bg-[#FAF1EC] text-[#C85A32] rounded-xl text-xs font-bold hover:bg-[#F3D5C6] transition-colors"
                  >
                    Manage Full Menu ({menuItems.length} items)
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------------ */}
        {/* TAB 2: MENU & DISHES MANAGEMENT */}
        {/* ------------------------------------------------------------------ */}
        {activeTab === 'menu' && (
          <div className="space-y-6">
            {/* Top Toolbar */}
            <div className="bg-white p-5 rounded-3xl border border-[#EADBCE] shadow-xs flex flex-wrap items-center justify-between gap-4">
              <div>
                <h3 className="font-serif font-bold text-xl text-[#1E1E24]">
                  Dishes & Categories
                </h3>
                <p className="text-xs text-[#6B696F] mt-0.5">
                  Live menu visible to customers scanning table QR codes.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {/* AI Menu Extractor Trigger */}
                <button
                  onClick={() => setIsAiModalOpen(true)}
                  className="flex items-center gap-1.5 px-3.5 py-2.5 bg-gradient-to-r from-purple-700 to-[#C85A32] text-white rounded-xl text-xs font-bold shadow-xs hover:opacity-95"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>AI Menu Photo / PDF Import</span>
                </button>

                {/* CSV Import */}
                <label className="flex items-center gap-1.5 px-3.5 py-2.5 bg-white border border-[#EADBCE] hover:border-[#1E1E24] text-[#1E1E24] rounded-xl text-xs font-bold cursor-pointer transition-colors">
                  <Upload className="w-3.5 h-3.5" />
                  <span>Import CSV</span>
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleCsvFileUpload}
                    className="hidden"
                  />
                </label>

                {/* CSV Export */}
                <button
                  onClick={exportMenuCsv}
                  className="flex items-center gap-1.5 px-3.5 py-2.5 bg-white border border-[#EADBCE] hover:border-[#1E1E24] text-[#1E1E24] rounded-xl text-xs font-bold transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export CSV</span>
                </button>

                {/* Add new dish */}
                <button
                  onClick={() => {
                    setEditingItem({
                      name: '',
                      description: '',
                      basePrice: 149,
                      categoryId: categories[0]?.id || '',
                      isVeg: true,
                      isAvailable: true,
                      preparationTimeMinutes: 15,
                    });
                    setIsItemModalOpen(true);
                  }}
                  className="flex items-center gap-1.5 px-4 py-2.5 bg-[#C85A32] text-white rounded-xl text-xs font-bold hover:bg-[#B04B26] transition-colors shadow-xs"
                >
                  <Plus className="w-4 h-4 stroke-[3]" />
                  <span>Add New Dish</span>
                </button>
              </div>
            </div>

            {/* Menu Items Table */}
            <div className="bg-white rounded-3xl border border-[#EADBCE] shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#FAF7F2] text-[#6B696F] font-bold uppercase tracking-wider border-b border-[#EADBCE]">
                    <tr>
                      <th className="py-3 px-4">Dish Details</th>
                      <th className="py-3 px-4">Category</th>
                      <th className="py-3 px-4">Price</th>
                      <th className="py-3 px-4">Dietary</th>
                      <th className="py-3 px-4">Availability</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F3ECE1]">
                    {menuItems.map((item) => {
                      const catName = categories.find((c) => c.id === item.categoryId)?.name || 'General';
                      return (
                        <tr key={item.id} className="hover:bg-[#FAF7F2]/60 transition-colors">
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3">
                              <img
                                src={item.imageUrl}
                                alt={item.name}
                                className="w-12 h-12 rounded-xl object-cover shrink-0"
                              />
                              <div>
                                <div className="font-bold text-sm text-[#1E1E24] flex items-center gap-2">
                                  <span>{item.name}</span>
                                  {item.isBestseller && (
                                    <span className="text-[10px] bg-[#C85A32] text-white px-2 py-0.5 rounded-full font-bold">
                                      Bestseller
                                    </span>
                                  )}
                                </div>
                                <div className="text-[#6B696F] line-clamp-1 max-w-sm">
                                  {item.description}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4 font-semibold text-[#1E1E24]">{catName}</td>
                          <td className="py-3 px-4 font-bold text-sm text-[#1E1E24]">
                            {settings.currencySymbol}{item.basePrice}
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md font-bold text-[10px] ${
                                item.isVeg
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-red-100 text-red-800'
                              }`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${
                                  item.isVeg ? 'bg-emerald-600' : 'bg-red-600'
                                }`}
                              />
                              {item.isVeg ? 'Veg' : 'Non-Veg'}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <button
                              onClick={async () => {
                                await onUpdateMenuItem(item.id, { isAvailable: !item.isAvailable });
                                showFeedback(`"${item.name}" availability updated!`);
                              }}
                              className={`px-3 py-1 rounded-xl text-xs font-bold transition-colors ${
                                item.isAvailable
                                  ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                                  : 'bg-red-100 text-red-800 hover:bg-red-200'
                              }`}
                            >
                              {item.isAvailable ? 'In Stock' : 'Sold Out'}
                            </button>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => {
                                  setEditingItem(item);
                                  setIsItemModalOpen(true);
                                }}
                                className="p-2 text-[#6B696F] hover:text-[#1E1E24] hover:bg-[#F3ECE1] rounded-lg transition-colors"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={async () => {
                                  if (confirm(`Delete "${item.name}"?`)) {
                                    await onDeleteMenuItem(item.id);
                                    showFeedback('Dish removed.');
                                  }
                                }}
                                className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------------ */}
        {/* TAB 3: TABLES & QR STANDEE */}
        {/* ------------------------------------------------------------------ */}
        {activeTab === 'tables' && (
          <div className="space-y-6">
            {/* Common QR Standee Generator Section */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#EADBCE] shadow-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                <div className="space-y-4">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#C85A32]">
                    One Common Restaurant QR Code
                  </span>
                  <h3 className="font-serif font-black text-2xl sm:text-3xl text-[#1E1E24]">
                    Printable QR Standee Generator
                  </h3>
                  <p className="text-sm text-[#6B696F] leading-relaxed">
                    Place this single, common QR code on all dining tables. When guests scan with their iPhone or Android camera, they access our live menu and pick their table number.
                  </p>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-[#1E1E24] uppercase tracking-wider">
                      Target Deployed Menu URL:
                    </label>
                    <input
                      type="text"
                      value={permanentMenuUrl}
                      onChange={(e) => setPermanentMenuUrl(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-[#FAF7F2] border border-[#EADBCE] rounded-xl text-xs font-mono focus:outline-none focus:border-[#C85A32]"
                    />
                    <p className="text-[11px] text-[#8C8A90]">
                      Points to the permanent public <code>/menu</code> endpoint.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 pt-2">
                    <button
                      onClick={() => downloadQrCode(qrDataUrl)}
                      className="flex items-center gap-2 px-5 py-3 bg-[#C85A32] text-white rounded-2xl text-xs font-bold hover:bg-[#B04B26] transition-colors shadow-sm"
                    >
                      <Download className="w-4 h-4" />
                      <span>Download High-Res PNG (800x800)</span>
                    </button>
                    <button
                      onClick={() =>
                        printTableStandee({
                          restaurantName: settings.name,
                          tagline: settings.tagline,
                          qrDataUrl,
                          menuUrl: permanentMenuUrl,
                        })
                      }
                      className="flex items-center gap-2 px-5 py-3 bg-white border border-[#EADBCE] hover:border-[#1E1E24] text-[#1E1E24] rounded-2xl text-xs font-bold transition-colors"
                    >
                      <Printer className="w-4 h-4" />
                      <span>Print Ready A4 Standee</span>
                    </button>
                  </div>
                </div>

                {/* QR Preview Card */}
                <div className="flex justify-center">
                  <div className="bg-[#FAF7F2] p-6 rounded-3xl border-2 border-dashed border-[#C85A32] text-center max-w-xs shadow-md">
                    <span className="text-[10px] font-bold text-[#C85A32] uppercase tracking-widest bg-[#FBEFE9] px-3 py-1 rounded-full">
                      Contactless Dining
                    </span>
                    <h4 className="font-serif font-bold text-xl text-[#1E1E24] mt-2">
                      {settings.name}
                    </h4>
                    <p className="text-xs text-[#6B696F] mb-4">{settings.tagline}</p>
                    
                    {qrDataUrl ? (
                      <img
                        src={qrDataUrl}
                        alt="Restaurant QR"
                        className="w-48 h-48 mx-auto rounded-xl shadow-xs bg-white p-2"
                      />
                    ) : (
                      <div className="w-48 h-48 mx-auto bg-gray-200 animate-pulse rounded-xl" />
                    )}

                    <div className="mt-4 text-[11px] text-[#6B696F]">
                      Scan to view live digital menu & order
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Tables Floor List */}
            <div className="bg-white rounded-3xl p-6 border border-[#EADBCE] shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-4 border-b border-[#F3ECE1]">
                <div>
                  <h3 className="font-serif font-bold text-lg text-[#1E1E24]">
                    Dining Floor Tables ({tables.length})
                  </h3>
                  <p className="text-xs text-[#6B696F]">
                    Active tables available for guest selection.
                  </p>
                </div>

                <button
                  onClick={async () => {
                    const tableNum = prompt('Enter new table number (e.g. 13):');
                    if (tableNum) {
                      await onAddTable({
                        tableNumber: tableNum,
                        displayName: `Table ${tableNum}`,
                        capacity: 4,
                        isActive: true,
                      });
                      showFeedback(`Table ${tableNum} added!`);
                    }
                  }}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-[#C85A32] text-white rounded-xl text-xs font-bold hover:bg-[#B04B26]"
                >
                  <Plus className="w-4 h-4" /> Add Table
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {tables.map((t) => (
                  <div
                    key={t.id}
                    className="p-4 rounded-2xl border border-[#EADBCE] bg-[#FAF7F2] text-center flex flex-col justify-between"
                  >
                    <div>
                      <div className="text-2xl font-serif font-black text-[#1E1E24]">
                        {t.tableNumber}
                      </div>
                      <div className="text-xs font-semibold text-[#1E1E24] mt-1 truncate">
                        {t.displayName}
                      </div>
                      <div className="text-[11px] text-[#8C8A90] mt-0.5">
                        {t.capacity} seats
                      </div>
                    </div>

                    <div className="mt-3 pt-2 border-t border-[#EADBCE] flex items-center justify-between">
                      <button
                        onClick={async () => {
                          await onUpdateTable(t.id, { isActive: !t.isActive });
                          showFeedback(`Table ${t.tableNumber} status updated.`);
                        }}
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          t.isActive
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {t.isActive ? 'Active' : 'Disabled'}
                      </button>

                      <button
                        onClick={async () => {
                          if (confirm(`Remove Table ${t.tableNumber}?`)) {
                            await onDeleteTable(t.id);
                            showFeedback('Table removed.');
                          }
                        }}
                        className="text-red-500 hover:text-red-700 p-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------------ */}
        {/* TAB 4: ALL ORDERS & PAYMENTS */}
        {/* ------------------------------------------------------------------ */}
        {activeTab === 'orders' && (
          <div className="space-y-6">
            <div className="bg-white p-5 rounded-3xl border border-[#EADBCE] shadow-xs flex flex-wrap items-center justify-between gap-4">
              <div>
                <h3 className="font-serif font-bold text-xl text-[#1E1E24]">
                  Orders & Counter Receipts
                </h3>
                <p className="text-xs text-[#6B696F]">
                  Authoritative order records, payment tracking, and audit trail.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={exportOrdersCsv}
                  className="flex items-center gap-1.5 px-4 py-2 bg-white border border-[#EADBCE] text-[#1E1E24] rounded-xl text-xs font-bold hover:border-[#1E1E24]"
                >
                  <Download className="w-4 h-4" /> Export CSV
                </button>
              </div>
            </div>

            {/* Filter controls */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="w-4 h-4 text-[#8C8A90] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search by order #, table, or guest..."
                  value={orderSearchQuery}
                  onChange={(e) => setOrderSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-white border border-[#EADBCE] rounded-xl text-xs focus:outline-none focus:border-[#C85A32]"
                />
              </div>

              <select
                value={orderStatusFilter}
                onChange={(e) => setOrderStatusFilter(e.target.value)}
                className="px-3 py-2 bg-white border border-[#EADBCE] rounded-xl text-xs text-[#1E1E24] font-semibold focus:outline-none focus:border-[#C85A32]"
              >
                <option value="all">All Statuses</option>
                <option value="new">New</option>
                <option value="accepted">Accepted</option>
                <option value="preparing">Preparing</option>
                <option value="ready">Ready</option>
                <option value="served">Served</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            {/* Orders List Table */}
            <div className="bg-white rounded-3xl border border-[#EADBCE] shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#FAF7F2] text-[#6B696F] font-bold uppercase tracking-wider border-b border-[#EADBCE]">
                    <tr>
                      <th className="py-3 px-4">Order #</th>
                      <th className="py-3 px-4">Table</th>
                      <th className="py-3 px-4">Guest</th>
                      <th className="py-3 px-4">Items Summary</th>
                      <th className="py-3 px-4">Total</th>
                      <th className="py-3 px-4">Kitchen Status</th>
                      <th className="py-3 px-4">Payment</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F3ECE1]">
                    {orders
                      .filter((o) => {
                        if (orderStatusFilter !== 'all' && o.status !== orderStatusFilter) return false;
                        if (orderSearchQuery.trim()) {
                          const q = orderSearchQuery.toLowerCase();
                          return (
                            o.orderNumber.toLowerCase().includes(q) ||
                            o.tableNumber.toLowerCase().includes(q) ||
                            o.customerName.toLowerCase().includes(q)
                          );
                        }
                        return true;
                      })
                      .map((o) => (
                        <tr key={o.id} className="hover:bg-[#FAF7F2]/50 transition-colors">
                          <td className="py-3 px-4 font-bold text-sm text-[#1E1E24]">
                            #{o.orderNumber}
                          </td>
                          <td className="py-3 px-4 font-bold text-[#C85A32]">
                            Table {o.tableNumber}
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-semibold text-[#1E1E24]">{o.customerName}</div>
                            {o.customerPhone && (
                              <div className="text-[11px] text-[#8C8A90]">{o.customerPhone}</div>
                            )}
                          </td>
                          <td className="py-3 px-4 text-[#6B696F]">
                            {o.items.map((i) => `${i.quantity}x ${i.itemName}`).join(', ')}
                          </td>
                          <td className="py-3 px-4 font-black text-sm text-[#1E1E24]">
                            {settings.currencySymbol}{o.totalAmount}
                          </td>
                          <td className="py-3 px-4">
                            <select
                              value={o.status}
                              onChange={async (e) => {
                                await onUpdateOrderStatus(o.id, e.target.value as OrderStatus);
                                showFeedback(`Order #${o.orderNumber} status updated to ${e.target.value}`);
                              }}
                              className="px-2 py-1 rounded-lg border border-[#EADBCE] text-xs font-bold capitalize bg-white"
                            >
                              <option value="new">New</option>
                              <option value="accepted">Accepted</option>
                              <option value="preparing">Preparing</option>
                              <option value="ready">Ready</option>
                              <option value="served">Served</option>
                              <option value="cancelled">Cancelled</option>
                            </select>
                          </td>
                          <td className="py-3 px-4">
                            <button
                              onClick={async () => {
                                const nextPayStatus = o.paymentStatus === 'paid' ? 'unpaid' : 'paid';
                                await onUpdateOrderPayment(o.id, nextPayStatus);
                                showFeedback(
                                  `Payment marked as ${nextPayStatus} for Order #${o.orderNumber}`
                                );
                              }}
                              className={`px-3 py-1 rounded-xl text-xs font-bold transition-colors ${
                                o.paymentStatus === 'paid'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {o.paymentStatus === 'paid' ? 'Paid (Counter)' : 'Collect Cash/UPI'}
                            </button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------------ */}
        {/* TAB 5: RESTAURANT SETTINGS & SUPABASE POSTGRESQL */}
        {/* ------------------------------------------------------------------ */}
        {activeTab === 'settings' && (
          <div className="space-y-6">
            {/* Restaurant Profile Settings */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#EADBCE] shadow-xs space-y-5">
              <h3 className="font-serif font-bold text-xl text-[#1E1E24]">
                Restaurant Branding & Operating Hours
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase tracking-wider text-[#1E1E24]">
                    Restaurant Name
                  </label>
                  <input
                    type="text"
                    defaultValue={settings.name}
                    id="set-name"
                    className="w-full px-3.5 py-2.5 bg-[#FAF7F2] border border-[#EADBCE] rounded-xl text-sm font-semibold"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase tracking-wider text-[#1E1E24]">
                    Tagline
                  </label>
                  <input
                    type="text"
                    defaultValue={settings.tagline}
                    id="set-tagline"
                    className="w-full px-3.5 py-2.5 bg-[#FAF7F2] border border-[#EADBCE] rounded-xl text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase tracking-wider text-[#1E1E24]">
                    Physical Address (Verified Maps Location)
                  </label>
                  <input
                    type="text"
                    defaultValue={settings.address}
                    id="set-address"
                    className="w-full px-3.5 py-2.5 bg-[#FAF7F2] border border-[#EADBCE] rounded-xl text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase tracking-wider text-[#1E1E24]">
                    Phone Number
                  </label>
                  <input
                    type="text"
                    defaultValue={settings.phone}
                    id="set-phone"
                    className="w-full px-3.5 py-2.5 bg-[#FAF7F2] border border-[#EADBCE] rounded-xl text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase tracking-wider text-[#1E1E24]">
                    Opening Time
                  </label>
                  <input
                    type="text"
                    defaultValue={settings.openingTime}
                    id="set-open"
                    className="w-full px-3.5 py-2.5 bg-[#FAF7F2] border border-[#EADBCE] rounded-xl text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase tracking-wider text-[#1E1E24]">
                    Closing Time
                  </label>
                  <input
                    type="text"
                    defaultValue={settings.closingTime}
                    id="set-close"
                    className="w-full px-3.5 py-2.5 bg-[#FAF7F2] border border-[#EADBCE] rounded-xl text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase tracking-wider text-[#1E1E24]">
                    GST / Tax Rate (%)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    defaultValue={settings.taxPercent}
                    id="set-tax"
                    className="w-full px-3.5 py-2.5 bg-[#FAF7F2] border border-[#EADBCE] rounded-xl text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase tracking-wider text-[#1E1E24]">
                    Currency Symbol
                  </label>
                  <input
                    type="text"
                    defaultValue={settings.currencySymbol}
                    id="set-curr"
                    className="w-full px-3.5 py-2.5 bg-[#FAF7F2] border border-[#EADBCE] rounded-xl text-sm"
                  />
                </div>
              </div>

              <button
                onClick={async () => {
                  const name = (document.getElementById('set-name') as HTMLInputElement).value;
                  const tagline = (document.getElementById('set-tagline') as HTMLInputElement).value;
                  const address = (document.getElementById('set-address') as HTMLInputElement).value;
                  const phone = (document.getElementById('set-phone') as HTMLInputElement).value;
                  const openingTime = (document.getElementById('set-open') as HTMLInputElement).value;
                  const closingTime = (document.getElementById('set-close') as HTMLInputElement).value;
                  const taxPercent = Number((document.getElementById('set-tax') as HTMLInputElement).value);
                  const currencySymbol = (document.getElementById('set-curr') as HTMLInputElement).value;

                  await onUpdateSettings({
                    name,
                    tagline,
                    address,
                    phone,
                    openingTime,
                    closingTime,
                    taxPercent,
                    currencySymbol,
                  });
                  showFeedback('Restaurant settings saved successfully!');
                }}
                className="px-6 py-3 bg-[#C85A32] text-white rounded-2xl text-xs font-bold hover:bg-[#B04B26] transition-colors"
              >
                Save Restaurant Settings
              </button>
            </div>

            {/* Supabase Connection Setup & Migration instructions */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#EADBCE] shadow-xs space-y-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-700 text-white flex items-center justify-center font-bold">
                  <Database className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-serif font-bold text-xl text-[#1E1E24]">
                    Supabase PostgreSQL Database & Realtime
                  </h3>
                  <p className="text-xs text-[#6B696F]">
                    Connect your Supabase project for persistent cloud PostgreSQL storage, Auth, and Realtime sync.
                  </p>
                </div>
              </div>

              <div className="p-4 bg-[#FAF7F2] rounded-2xl border border-[#EADBCE] text-xs text-[#6B696F] space-y-2">
                <div className="font-bold text-[#1E1E24] flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Setup Instructions:</span>
                </div>
                <ol className="list-decimal pl-5 space-y-1">
                  <li>Go to your Supabase project at <a href="https://supabase.com" target="_blank" rel="noreferrer" className="text-[#C85A32] underline">supabase.com</a>.</li>
                  <li>In SQL Editor, run the schema file located in this repository at <code>supabase/schema.sql</code>.</li>
                  <li>Copy your <strong>Project URL</strong> and <strong>Anon Public Key</strong> from Project Settings &gt; API.</li>
                  <li>Paste below and click <strong>Test & Connect Supabase</strong>.</li>
                </ol>
              </div>

              <div className="grid grid-cols-1 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#1E1E24] uppercase tracking-wider">
                    VITE_SUPABASE_URL:
                  </label>
                  <input
                    type="text"
                    placeholder="https://xyzproject.supabase.co"
                    value={supabaseUrlInput}
                    onChange={(e) => setSupabaseUrlInput(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#FAF7F2] border border-[#EADBCE] rounded-xl text-xs font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#1E1E24] uppercase tracking-wider">
                    VITE_SUPABASE_ANON_KEY:
                  </label>
                  <input
                    type="password"
                    placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                    value={supabaseKeyInput}
                    onChange={(e) => setSupabaseKeyInput(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#FAF7F2] border border-[#EADBCE] rounded-xl text-xs font-mono"
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  onClick={handleTestSupabase}
                  className="px-5 py-2.5 bg-[#1E1E24] text-white rounded-xl text-xs font-bold hover:bg-black transition-colors"
                >
                  Test & Connect Supabase
                </button>
              </div>

              {supabaseTestStatus && (
                <div className="p-3 bg-[#FAF1EC] border border-[#F3D5C6] rounded-xl text-xs text-[#9B3C1B]">
                  <strong>Status:</strong> {supabaseTestStatus}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------------ */}
        {/* TAB 6: STAFF ACCOUNTS & ROLES */}
        {/* ------------------------------------------------------------------ */}
        {activeTab === 'staff' && (
          <div className="space-y-6">
            <div className="bg-white p-5 rounded-3xl border border-[#EADBCE] shadow-xs flex items-center justify-between">
              <div>
                <h3 className="font-serif font-bold text-xl text-[#1E1E24]">
                  Staff Accounts & Permissions
                </h3>
                <p className="text-xs text-[#6B696F]">
                  Manage authorized users for Admin, Kitchen KDS, and Dining Floor Staff.
                </p>
              </div>

              <button
                onClick={() => {
                  const name = prompt('Staff Member Name:');
                  const email = prompt('Staff Email:');
                  const role = prompt('Role (admin, kitchen, staff):', 'kitchen') as any;
                  if (name && email && role) {
                    setStaffUsers([
                      ...staffUsers,
                      {
                        id: `staff-${Date.now()}`,
                        fullName: name,
                        email,
                        role,
                        isActive: true,
                        createdAt: new Date().toISOString(),
                      },
                    ]);
                    showFeedback(`Staff user ${name} created.`);
                  }
                }}
                className="flex items-center gap-1.5 px-4 py-2 bg-[#C85A32] text-white rounded-xl text-xs font-bold hover:bg-[#B04B26]"
              >
                <Plus className="w-4 h-4" /> Add Staff Member
              </button>
            </div>

            <div className="bg-white rounded-3xl border border-[#EADBCE] shadow-xs overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#FAF7F2] text-[#6B696F] font-bold uppercase tracking-wider border-b border-[#EADBCE]">
                  <tr>
                    <th className="py-3 px-4">Name</th>
                    <th className="py-3 px-4">Email</th>
                    <th className="py-3 px-4">Assigned Role</th>
                    <th className="py-3 px-4">Account Status</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F3ECE1]">
                  {staffUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-[#FAF7F2]/50">
                      <td className="py-3 px-4 font-bold text-sm text-[#1E1E24]">
                        {user.fullName}
                      </td>
                      <td className="py-3 px-4 text-[#6B696F]">{user.email}</td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2.5 py-0.5 rounded-full font-bold uppercase text-[10px] ${
                            user.role === 'admin'
                              ? 'bg-purple-100 text-purple-800'
                              : user.role === 'kitchen'
                              ? 'bg-orange-100 text-orange-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          {user.role}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-emerald-700 font-bold">● Active</span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        {user.role !== 'admin' && (
                          <button
                            onClick={() => {
                              setStaffUsers(staffUsers.filter((u) => u.id !== user.id));
                              showFeedback('User removed.');
                            }}
                            className="text-red-500 hover:text-red-700 text-xs font-semibold"
                          >
                            Deactivate
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* -------------------------------------------------------------------- */}
      {/* MODAL: ADD / EDIT DISH */}
      {/* -------------------------------------------------------------------- */}
      {isItemModalOpen && editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-[#FAF7F2] rounded-3xl p-6 sm:p-8 max-w-lg w-full border border-[#EADBCE] shadow-2xl max-h-[90vh] overflow-y-auto space-y-4">
            <h3 className="font-serif font-bold text-xl text-[#1E1E24]">
              {editingItem.id ? 'Edit Dish' : 'Add New Dish'}
            </h3>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-[#1E1E24]">
                  Dish Name *
                </label>
                <input
                  type="text"
                  required
                  value={editingItem.name || ''}
                  onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })}
                  placeholder="e.g. Hot Spot Veggie Special"
                  className="w-full px-3.5 py-2.5 bg-white border border-[#EADBCE] rounded-xl text-sm"
                />
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-[#1E1E24]">
                  Category *
                </label>
                <select
                  value={editingItem.categoryId || ''}
                  onChange={(e) => setEditingItem({ ...editingItem, categoryId: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-white border border-[#EADBCE] rounded-xl text-sm"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-[#1E1E24]">
                    Base Price (INR) *
                  </label>
                  <input
                    type="number"
                    required
                    value={editingItem.basePrice || 0}
                    onChange={(e) => setEditingItem({ ...editingItem, basePrice: Number(e.target.value) })}
                    className="w-full px-3.5 py-2.5 bg-white border border-[#EADBCE] rounded-xl text-sm font-bold"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-[#1E1E24]">
                    Prep Time (Mins)
                  </label>
                  <input
                    type="number"
                    value={editingItem.preparationTimeMinutes || 15}
                    onChange={(e) =>
                      setEditingItem({ ...editingItem, preparationTimeMinutes: Number(e.target.value) })
                    }
                    className="w-full px-3.5 py-2.5 bg-white border border-[#EADBCE] rounded-xl text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-[#1E1E24]">
                  Description
                </label>
                <textarea
                  rows={2}
                  value={editingItem.description || ''}
                  onChange={(e) => setEditingItem({ ...editingItem, description: e.target.value })}
                  placeholder="Ingredients, seasonings, and toppings..."
                  className="w-full px-3.5 py-2.5 bg-white border border-[#EADBCE] rounded-xl text-sm"
                />
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-[#1E1E24]">
                  Photo Image URL
                </label>
                <input
                  type="text"
                  value={editingItem.imageUrl || ''}
                  onChange={(e) => setEditingItem({ ...editingItem, imageUrl: e.target.value })}
                  placeholder="https://..."
                  className="w-full px-3.5 py-2.5 bg-white border border-[#EADBCE] rounded-xl text-sm"
                />
              </div>

              <div className="flex items-center gap-6 pt-2">
                <label className="flex items-center gap-2 text-xs font-semibold text-[#1E1E24] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingItem.isVeg !== false}
                    onChange={(e) => setEditingItem({ ...editingItem, isVeg: e.target.checked })}
                    className="w-4 h-4 text-[#C85A32] rounded-md"
                  />
                  <span>Vegetarian Dish</span>
                </label>

                <label className="flex items-center gap-2 text-xs font-semibold text-[#1E1E24] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={Boolean(editingItem.isBestseller)}
                    onChange={(e) => setEditingItem({ ...editingItem, isBestseller: e.target.checked })}
                    className="w-4 h-4 text-[#C85A32] rounded-md"
                  />
                  <span>Mark as Bestseller</span>
                </label>

                <label className="flex items-center gap-2 text-xs font-semibold text-[#1E1E24] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingItem.isAvailable !== false}
                    onChange={(e) => setEditingItem({ ...editingItem, isAvailable: e.target.checked })}
                    className="w-4 h-4 text-[#C85A32] rounded-md"
                  />
                  <span>Available in Stock</span>
                </label>
              </div>
            </div>

            <div className="pt-4 border-t border-[#EADBCE] flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setIsItemModalOpen(false);
                  setEditingItem(null);
                }}
                className="px-4 py-2.5 text-xs font-bold text-[#6B696F]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (!editingItem.name || editingItem.basePrice === undefined) {
                    alert('Please enter name and price');
                    return;
                  }
                  if (editingItem.id) {
                    await onUpdateMenuItem(editingItem.id, editingItem);
                    showFeedback(`Dish "${editingItem.name}" updated!`);
                  } else {
                    await onAddMenuItem(editingItem);
                    showFeedback(`Dish "${editingItem.name}" added to menu!`);
                  }
                  setIsItemModalOpen(false);
                  setEditingItem(null);
                }}
                className="px-5 py-2.5 bg-[#C85A32] text-white rounded-xl text-xs font-bold hover:bg-[#B04B26]"
              >
                Save Dish
              </button>
            </div>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------------- */}
      {/* MODAL: AI PHOTO / PDF MENU EXTRACTOR */}
      {/* -------------------------------------------------------------------- */}
      {isAiModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-[#FAF7F2] rounded-3xl p-6 sm:p-8 max-w-2xl w-full border border-[#EADBCE] shadow-2xl max-h-[90vh] overflow-y-auto space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-700 to-[#C85A32] text-white flex items-center justify-center">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-serif font-bold text-xl text-[#1E1E24]">
                  AI Menu Extractor (Gemini)
                </h3>
                <p className="text-xs text-[#6B696F]">
                  Upload a photo of your printed restaurant menu or paste menu text. Gemini will structure categories, prices, and descriptions with full preview before saving.
                </p>
              </div>
            </div>

            {/* Upload or Text input tabs */}
            {!aiPreviewData && (
              <div className="space-y-4 pt-2">
                <div className="border-2 border-dashed border-[#C85A32] rounded-2xl p-6 text-center bg-white">
                  <Upload className="w-8 h-8 text-[#C85A32] mx-auto mb-2" />
                  <label className="cursor-pointer inline-block px-4 py-2 bg-[#C85A32] text-white rounded-xl text-xs font-bold hover:bg-[#B04B26] transition-colors">
                    <span>Upload Menu Photo / Document</span>
                    <input
                      type="file"
                      accept="image/*,.pdf"
                      onChange={handleAiPhotoUpload}
                      className="hidden"
                    />
                  </label>
                  <p className="text-[11px] text-[#8C8A90] mt-2">
                    Supports JPG, PNG, WEBP of paper menus or restaurant flyers.
                  </p>
                </div>

                <div className="relative">
                  <div className="text-center text-xs text-[#8C8A90] font-bold uppercase tracking-wider my-2">
                    - OR PASTE RAW MENU TEXT -
                  </div>
                  <textarea
                    rows={4}
                    placeholder="e.g.&#10;Farmhouse Pizza - 249&#10;Double Veg Burger - 139&#10;Steamed Momos - 129&#10;Cold Coffee - 139"
                    value={aiTextInput}
                    onChange={(e) => setAiTextInput(e.target.value)}
                    className="w-full p-3.5 bg-white border border-[#EADBCE] rounded-xl text-xs focus:outline-none focus:border-[#C85A32]"
                  />
                  <button
                    onClick={handleAiTextExtract}
                    disabled={!aiTextInput.trim() || aiLoading}
                    className="mt-2 w-full py-2.5 bg-[#1E1E24] text-white rounded-xl text-xs font-bold hover:bg-black disabled:opacity-50"
                  >
                    {aiLoading ? 'Analyzing menu with Gemini AI...' : 'Parse Dishes from Text'}
                  </button>
                </div>

                {aiLoading && (
                  <div className="text-center py-6 text-xs text-[#C85A32] font-semibold animate-pulse flex items-center justify-center gap-2">
                    <Sparkles className="w-4 h-4 animate-spin" />
                    <span>Gemini is reading dishes, categories, and prices...</span>
                  </div>
                )}
              </div>
            )}

            {/* PREVIEW & CONFIRMATION BEFORE PUBLISHING (Requirement 6) */}
            {aiPreviewData && (
              <div className="space-y-4 pt-2">
                <div className="bg-emerald-50 border border-emerald-300 rounded-2xl p-4 text-xs text-emerald-800 flex items-center justify-between">
                  <div>
                    <strong>Success!</strong> Extracted {aiPreviewData.items?.length || 0} dishes across{' '}
                    {aiPreviewData.categories?.length || 0} categories.
                  </div>
                  <button
                    onClick={() => setAiPreviewData(null)}
                    className="text-xs font-bold text-emerald-900 underline"
                  >
                    Re-upload
                  </button>
                </div>

                <div className="max-h-60 overflow-y-auto space-y-2 border border-[#EADBCE] rounded-2xl p-3 bg-white">
                  {aiPreviewData.items?.map((item: any, idx: number) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-xl bg-[#FAF7F2] flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="font-bold text-[#1E1E24]">
                          {item.name}{' '}
                          <span className="text-[10px] text-[#C85A32] font-semibold">
                            ({item.categoryName})
                          </span>
                        </div>
                        <div className="text-[#6B696F] text-[11px] line-clamp-1">
                          {item.description}
                        </div>
                      </div>
                      <div className="font-bold text-[#1E1E24] text-sm shrink-0">
                        {settings.currencySymbol}{item.basePrice}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsAiModalOpen(false);
                      setAiPreviewData(null);
                    }}
                    className="px-4 py-2 text-xs font-bold text-[#6B696F]"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmAiImport}
                    className="px-6 py-2.5 bg-[#C85A32] text-white rounded-xl text-xs font-bold hover:bg-[#B04B26] shadow-sm"
                  >
                    Confirm & Publish to Menu
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
