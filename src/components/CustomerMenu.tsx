import React, { useState, useMemo } from 'react';
import {
  RestaurantSettings,
  RestaurantTable,
  MenuCategory,
  MenuItem,
  CartItem,
  Order,
  PaymentMethod,
} from '../types';
import { TableSelectorModal } from './TableSelectorModal';
import { ItemCustomizeModal } from './ItemCustomizeModal';
import { CartDrawer } from './CartDrawer';
import { OrderTrackingModal } from './OrderTrackingModal';
import {
  Search,
  MapPin,
  Clock,
  ExternalLink,
  ShoppingBag,
  Flame,
  Sparkles,
  Plus,
  ArrowRight,
  Phone,
  SlidersHorizontal,
} from 'lucide-react';

interface CustomerMenuProps {
  settings: RestaurantSettings;
  tables: RestaurantTable[];
  categories: MenuCategory[];
  menuItems: MenuItem[];
  selectedTable: RestaurantTable | null;
  onSelectTable: (table: RestaurantTable) => void;
  cart: CartItem[];
  onAddToCart: (item: CartItem) => void;
  onUpdateCartQty: (cartItemId: string, newQty: number) => void;
  onRemoveCartItem: (cartItemId: string) => void;
  onClearCart: () => void;
  onSubmitOrder: (details: {
    customerName: string;
    customerPhone?: string;
    specialInstructions?: string;
    paymentMethod: PaymentMethod;
  }) => Promise<Order>;
  activeOrder: Order | null;
  onRefreshActiveOrder?: () => void;
}

export const CustomerMenu: React.FC<CustomerMenuProps> = ({
  settings,
  tables,
  categories,
  menuItems,
  selectedTable,
  onSelectTable,
  cart,
  onAddToCart,
  onUpdateCartQty,
  onRemoveCartItem,
  onClearCart,
  onSubmitOrder,
  activeOrder,
  onRefreshActiveOrder,
}) => {
  // Modal states
  const [isTableModalOpen, setIsTableModalOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isTrackingOpen, setIsTrackingOpen] = useState(false);
  const [customizingItem, setCustomizingItem] = useState<MenuItem | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategoryId, setActiveCategoryId] = useState<string>('all');
  const [dietaryFilter, setDietaryFilter] = useState<'all' | 'veg' | 'non-veg'>('all');

  // Filtered menu items
  const filteredItems = useMemo(() => {
    return menuItems.filter((item) => {
      // Category filter
      if (activeCategoryId !== 'all' && item.categoryId !== activeCategoryId) {
        return false;
      }
      // Dietary filter
      if (dietaryFilter === 'veg' && !item.isVeg) return false;
      if (dietaryFilter === 'non-veg' && item.isVeg) return false;

      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchName = item.name.toLowerCase().includes(query);
        const matchDesc = item.description?.toLowerCase().includes(query);
        const matchTags = item.tags?.some((t) => t.toLowerCase().includes(query));
        return matchName || matchDesc || matchTags;
      }
      return true;
    });
  }, [menuItems, activeCategoryId, dietaryFilter, searchQuery]);

  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const cartSubtotal = cart.reduce((sum, item) => sum + item.itemTotal, 0);

  const handleOrderSubmission = async (details: {
    customerName: string;
    customerPhone?: string;
    specialInstructions?: string;
    paymentMethod: PaymentMethod;
  }) => {
    setIsSubmitting(true);
    try {
      await onSubmitOrder(details);
      setIsCartOpen(false);
      setIsTrackingOpen(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF7F2] pb-28">
      {/* 1. RESTAURANT HERO BANNER */}
      <div className="relative bg-[#201D1C] text-white">
        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#C85A32_1px,transparent_1px)] [background-size:16px_16px]" />
        
        <div className="max-w-5xl mx-auto px-4 pt-6 pb-6 sm:pb-8 relative z-10">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-950 text-emerald-400 border border-emerald-800">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  {settings.isOpen ? 'Open Now' : 'Closed'}
                </span>
                <span className="text-xs text-white/60">
                  {settings.openingTime} - {settings.closingTime}
                </span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-serif font-black tracking-tight text-white">
                {settings.name}
              </h1>
              <p className="text-sm text-white/70 mt-1 max-w-xl">
                {settings.tagline}
              </p>
              
              <div className="flex flex-wrap items-center gap-4 mt-3 text-xs text-white/60">
                <a
                  href={settings.googleMapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 hover:text-white transition-colors"
                >
                  <MapPin className="w-3.5 h-3.5 text-[#C85A32]" />
                  <span>{settings.address}</span>
                  <ExternalLink className="w-3 h-3 opacity-60" />
                </a>
                <a
                  href={`tel:${settings.phone}`}
                  className="flex items-center gap-1 hover:text-white transition-colors"
                >
                  <Phone className="w-3.5 h-3.5 text-[#C85A32]" />
                  <span>{settings.phone}</span>
                </a>
              </div>
            </div>

            {/* Quick table indicator card */}
            <div className="sm:self-end">
              <button
                type="button"
                onClick={() => setIsTableModalOpen(true)}
                className="w-full sm:w-auto flex items-center justify-between gap-3 px-4 py-2.5 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/20 backdrop-blur-xs transition-all text-left"
              >
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-white/60 font-bold">
                    Your Dining Table
                  </div>
                  <div className="text-sm font-bold text-white flex items-center gap-1.5">
                    {selectedTable ? (
                      <>
                        <span className="w-2 h-2 rounded-full bg-emerald-400" />
                        <span>{selectedTable.displayName}</span>
                      </>
                    ) : (
                      <span className="text-amber-300">Tap to Select Table</span>
                    )}
                  </div>
                </div>
                <span className="text-xs font-semibold px-2.5 py-1 bg-[#C85A32] text-white rounded-lg">
                  {selectedTable ? 'Change' : 'Choose'}
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Active Order Banner if customer has placed an order */}
      {activeOrder && activeOrder.status !== 'served' && activeOrder.status !== 'cancelled' && (
        <div className="max-w-5xl mx-auto px-4 mt-4">
          <div
            onClick={() => setIsTrackingOpen(true)}
            className="cursor-pointer bg-[#FAF1EC] border-2 border-[#C85A32] rounded-2xl p-3.5 flex items-center justify-between shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-[#C85A32] animate-ping" />
              <div>
                <span className="text-xs font-bold text-[#C85A32] uppercase tracking-wide">
                  Live Order In Progress • Order #{activeOrder.orderNumber}
                </span>
                <p className="text-xs text-[#1E1E24] font-medium">
                  Status:{' '}
                  <strong className="capitalize text-[#C85A32] font-bold">
                    {activeOrder.status}
                  </strong>{' '}
                  at Table {activeOrder.tableNumber}
                </p>
              </div>
            </div>
            <span className="text-xs font-bold text-[#C85A32] flex items-center gap-1">
              Track Live <ArrowRight className="w-3.5 h-3.5" />
            </span>
          </div>
        </div>
      )}

      {/* 2. SEARCH & CONTROLS BAR (Sticky) */}
      <div className="sticky top-0 z-30 bg-[#FAF7F2]/95 backdrop-blur-md border-b border-[#EADBCE] shadow-xs">
        <div className="max-w-5xl mx-auto px-4 py-3 space-y-3">
          {/* Search box & Dietary filters */}
          <div className="flex flex-col sm:flex-row items-center gap-2.5">
            <div className="relative w-full flex-1">
              <Search className="w-4 h-4 text-[#8C8A90] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search pizzas, burgers, momos, shakes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 bg-white border border-[#EADBCE] rounded-xl text-sm focus:outline-none focus:border-[#C85A32] transition-colors"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-[#8C8A90] hover:text-[#1E1E24]"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Veg / Non-veg pills */}
            <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto shrink-0">
              <button
                type="button"
                onClick={() => setDietaryFilter('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors shrink-0 ${
                  dietaryFilter === 'all'
                    ? 'bg-[#1E1E24] text-white'
                    : 'bg-white text-[#6B696F] border border-[#EADBCE] hover:border-[#1E1E24]'
                }`}
              >
                All Dishes
              </button>
              <button
                type="button"
                onClick={() => setDietaryFilter('veg')}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors shrink-0 ${
                  dietaryFilter === 'veg'
                    ? 'bg-emerald-800 text-white'
                    : 'bg-white text-emerald-800 border border-emerald-300 hover:border-emerald-600'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                Pure Veg
              </button>
              <button
                type="button"
                onClick={() => setDietaryFilter('non-veg')}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors shrink-0 ${
                  dietaryFilter === 'non-veg'
                    ? 'bg-red-800 text-white'
                    : 'bg-white text-red-800 border border-red-300 hover:border-red-600'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-red-500" />
                Non-Veg
              </button>
            </div>
          </div>

          {/* Categories Horizontal Scroller */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
            <button
              onClick={() => setActiveCategoryId('all')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                activeCategoryId === 'all'
                  ? 'bg-[#C85A32] text-white shadow-xs'
                  : 'bg-white text-[#6B696F] border border-[#EADBCE] hover:border-[#C85A32]'
              }`}
            >
              All Categories ({menuItems.length})
            </button>
            {categories.map((cat) => {
              const count = menuItems.filter((i) => i.categoryId === cat.id).length;
              const isSelected = activeCategoryId === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategoryId(cat.id)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                    isSelected
                      ? 'bg-[#C85A32] text-white shadow-xs'
                      : 'bg-white text-[#6B696F] border border-[#EADBCE] hover:border-[#C85A32]'
                  }`}
                >
                  {cat.name} ({count})
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 3. MENU ITEMS GRID */}
      <div className="max-w-5xl mx-auto px-4 mt-6">
        {filteredItems.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-3xl border border-[#EADBCE] p-8">
            <SlidersHorizontal className="w-10 h-10 text-[#8C8A90] mx-auto mb-3" />
            <h3 className="font-serif font-bold text-lg text-[#1E1E24]">No dishes found</h3>
            <p className="text-xs text-[#6B696F] mt-1">
              Try adjusting your search terms or dietary filters.
            </p>
            <button
              onClick={() => {
                setSearchQuery('');
                setActiveCategoryId('all');
                setDietaryFilter('all');
              }}
              className="mt-4 px-4 py-2 bg-[#C85A32] text-white text-xs font-bold rounded-xl"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredItems.map((item) => (
              <div
                key={item.id}
                className="group bg-white rounded-3xl border border-[#EADBCE] overflow-hidden shadow-xs hover:shadow-md transition-all duration-300 flex flex-col"
              >
                {/* Food Image */}
                <div className="relative h-44 w-full bg-[#EADBCE] overflow-hidden">
                  <img
                    src={item.imageUrl}
                    alt={item.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-60" />

                  {/* Badges */}
                  <div className="absolute top-3 left-3 flex items-center gap-1.5">
                    {/* Veg / Non-veg indicator */}
                    <span
                      className={`inline-flex items-center justify-center w-5 h-5 border-2 rounded-xs bg-white shadow-xs ${
                        item.isVeg ? 'border-emerald-600' : 'border-red-600'
                      }`}
                    >
                      <span
                        className={`w-2.5 h-2.5 rounded-full ${
                          item.isVeg ? 'bg-emerald-600' : 'bg-red-600'
                        }`}
                      />
                    </span>

                    {item.isBestseller && (
                      <span className="bg-[#C85A32] text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-xs">
                        <Sparkles className="w-2.5 h-2.5" /> Bestseller
                      </span>
                    )}
                  </div>

                  {!item.isAvailable && (
                    <div className="absolute inset-0 bg-black/65 backdrop-blur-xs flex items-center justify-center">
                      <span className="bg-red-600 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                        Sold Out
                      </span>
                    </div>
                  )}

                  {item.spicyLevel && item.spicyLevel > 0 && (
                    <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-xs text-amber-300 text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-0.5">
                      <Flame className="w-3 h-3 text-amber-400" />
                      <span>{item.spicyLevel === 1 ? 'Mild' : item.spicyLevel === 2 ? 'Medium' : 'Hot'}</span>
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="p-4 flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="font-serif font-bold text-base text-[#1E1E24] group-hover:text-[#C85A32] transition-colors leading-snug">
                      {item.name}
                    </h3>
                    <p className="text-xs text-[#6B696F] line-clamp-2 mt-1 leading-relaxed">
                      {item.description}
                    </p>

                    <div className="flex items-center gap-2 mt-2 text-[11px] text-[#8C8A90]">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-[#C85A32]" />
                        {item.preparationTimeMinutes} mins
                      </span>
                      {item.variants && item.variants.length > 0 && (
                        <span>• {item.variants.length} Sizes</span>
                      )}
                      {item.addons && item.addons.length > 0 && (
                        <span>• Addons available</span>
                      )}
                    </div>
                  </div>

                  {/* Price & Add button */}
                  <div className="mt-4 pt-3 border-t border-[#F3ECE1] flex items-center justify-between">
                    <div>
                      <span className="text-xs text-[#8C8A90]">Starting at</span>
                      <div className="text-base font-bold text-[#1E1E24]">
                        {settings.currencySymbol}{item.basePrice}
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={!item.isAvailable}
                      onClick={() => setCustomizingItem(item)}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 ${
                        item.isAvailable
                          ? 'bg-[#C85A32] text-white hover:bg-[#B04B26] hover:scale-[1.02]'
                          : 'bg-[#EADBCE] text-[#8C8A90] cursor-not-allowed'
                      }`}
                    >
                      <Plus className="w-3.5 h-3.5 stroke-[3]" />
                      <span>{item.variants?.length || item.addons?.length ? 'Customize' : 'Add'}</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 4. FLOATING BOTTOM CART BAR (When cart has items) */}
      {cart.length > 0 && (
        <div className="fixed bottom-4 left-4 right-4 z-40 max-w-lg mx-auto">
          <button
            onClick={() => setIsCartOpen(true)}
            className="w-full bg-[#C85A32] hover:bg-[#B04B26] text-white rounded-2xl p-4 shadow-2xl flex items-center justify-between border-2 border-amber-300/40 transition-transform active:scale-[0.98]"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center font-bold text-sm">
                {cartCount}
              </div>
              <div className="text-left">
                <div className="text-xs opacity-90">View Order Summary</div>
                <div className="text-base font-bold">
                  {settings.currencySymbol}{cartSubtotal}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1 font-bold text-sm bg-white text-[#C85A32] px-3.5 py-1.5 rounded-xl shadow-xs">
              <span>View Cart</span>
              <ArrowRight className="w-4 h-4" />
            </div>
          </button>
        </div>
      )}

      {/* MODALS */}
      <TableSelectorModal
        isOpen={isTableModalOpen}
        tables={tables}
        selectedTable={selectedTable}
        onSelectTable={(tbl) => {
          onSelectTable(tbl);
          setIsTableModalOpen(false);
        }}
        onClose={() => setIsTableModalOpen(false)}
      />

      <ItemCustomizeModal
        item={customizingItem}
        isOpen={Boolean(customizingItem)}
        onClose={() => setCustomizingItem(null)}
        onAddToCart={onAddToCart}
        currencySymbol={settings.currencySymbol}
      />

      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cart={cart}
        table={selectedTable}
        onOpenTableModal={() => {
          setIsCartOpen(false);
          setIsTableModalOpen(true);
        }}
        onUpdateQuantity={onUpdateCartQty}
        onRemoveItem={onRemoveCartItem}
        onClearCart={onClearCart}
        settings={settings}
        onSubmitOrder={handleOrderSubmission}
        isSubmitting={isSubmitting}
      />

      <OrderTrackingModal
        order={activeOrder}
        isOpen={isTrackingOpen}
        onClose={() => setIsTrackingOpen(false)}
        currencySymbol={settings.currencySymbol}
        onRefresh={onRefreshActiveOrder}
      />
    </div>
  );
};
