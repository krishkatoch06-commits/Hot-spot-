import React, { useState } from 'react';
import { MenuItem, MenuItemVariant, MenuItemAddon } from '../data/defaultMenu';
import { CartItem } from '../types';
import { X, Plus, Minus, Flame, Sparkles, Clock, Check } from 'lucide-react';

interface ItemCustomizeModalProps {
  item: MenuItem | null;
  isOpen: boolean;
  onClose: () => void;
  onAddToCart: (item: CartItem) => void;
  currencySymbol: string;
}

export const ItemCustomizeModal: React.FC<ItemCustomizeModalProps> = ({
  item,
  isOpen,
  onClose,
  onAddToCart,
  currencySymbol,
}) => {
  if (!isOpen || !item) return null;

  // Selected variant
  const defaultVariant = item.variants?.find((v) => v.isDefault) || item.variants?.[0];
  const [selectedVariant, setSelectedVariant] = useState<MenuItemVariant | undefined>(defaultVariant);
  const [selectedAddons, setSelectedAddons] = useState<MenuItemAddon[]>([]);
  const [quantity, setQuantity] = useState<number>(1);
  const [specialInstructions, setSpecialInstructions] = useState<string>('');

  const toggleAddon = (addon: MenuItemAddon) => {
    if (selectedAddons.some((a) => a.id === addon.id)) {
      setSelectedAddons(selectedAddons.filter((a) => a.id !== addon.id));
    } else {
      setSelectedAddons([...selectedAddons, addon]);
    }
  };

  const variantAdjustment = selectedVariant?.priceAdjustment || 0;
  const addonsTotal = selectedAddons.reduce((sum, a) => sum + a.price, 0);
  const unitPrice = item.basePrice + variantAdjustment;
  const itemTotal = (unitPrice + addonsTotal) * quantity;

  const handleAdd = () => {
    const cartItem: CartItem = {
      cartItemId: `ci-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      menuItem: item,
      selectedVariant: selectedVariant
        ? {
            id: selectedVariant.id,
            name: selectedVariant.name,
            priceAdjustment: selectedVariant.priceAdjustment,
          }
        : undefined,
      selectedAddons: selectedAddons.map((a) => ({ id: a.id, name: a.name, price: a.price })),
      quantity,
      specialInstructions: specialInstructions.trim() || undefined,
      unitPrice,
      itemTotal,
    };

    onAddToCart(cartItem);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="relative w-full max-w-lg bg-[#FAF7F2] rounded-3xl shadow-2xl border border-[#EADBCE] max-h-[90vh] flex flex-col overflow-hidden">
        {/* Hero image & close button */}
        <div className="relative h-48 sm:h-56 w-full bg-[#EADBCE] shrink-0">
          <img
            src={item.imageUrl}
            alt={item.name}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
          
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2.5 bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors backdrop-blur-xs"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Badges on image */}
          <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                {/* Veg/Non-veg indicator */}
                <span
                  className={`inline-flex items-center justify-center w-5 h-5 border-2 rounded-xs bg-white ${
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
                  <span className="bg-[#C85A32] text-white text-[11px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-sm">
                    <Sparkles className="w-3 h-3" /> Bestseller
                  </span>
                )}
                {item.spicyLevel && item.spicyLevel > 0 && (
                  <span className="bg-amber-600/90 text-white text-[11px] font-medium px-2 py-0.5 rounded-full flex items-center gap-0.5">
                    <Flame className="w-3 h-3" />
                    {item.spicyLevel === 1 ? 'Mild' : item.spicyLevel === 2 ? 'Medium' : 'Hot'}
                  </span>
                )}
              </div>
              <h3 className="text-xl sm:text-2xl font-serif font-bold text-white drop-shadow-sm">
                {item.name}
              </h3>
            </div>
            <div className="text-right">
              <span className="text-xl sm:text-2xl font-bold text-amber-200 drop-shadow-sm">
                {currencySymbol}{item.basePrice}
              </span>
            </div>
          </div>
        </div>

        {/* Scrollable details & options */}
        <div className="overflow-y-auto flex-1 p-6 space-y-6">
          <p className="text-sm text-[#6B696F] leading-relaxed">
            {item.description}
          </p>

          <div className="flex items-center gap-4 text-xs text-[#8C8A90] pb-2 border-b border-[#EADBCE]">
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-[#C85A32]" />
              Prep: ~{item.preparationTimeMinutes} mins
            </span>
            <span>•</span>
            <span className={item.isAvailable ? 'text-emerald-700 font-medium' : 'text-red-600 font-medium'}>
              {item.isAvailable ? 'Available Now' : 'Sold Out'}
            </span>
          </div>

          {/* Variants */}
          {item.variants && item.variants.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-[#1E1E24] uppercase tracking-wide">
                  Choose Size / Portion
                </h4>
                <span className="text-xs text-[#C85A32] font-semibold">Required</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {item.variants.map((v) => {
                  const isChosen = selectedVariant?.id === v.id;
                  return (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => setSelectedVariant(v)}
                      className={`flex items-center justify-between p-3.5 rounded-2xl border-2 transition-all text-left ${
                        isChosen
                          ? 'border-[#C85A32] bg-[#FAF1EC]'
                          : 'border-[#EADBCE] bg-white hover:border-[#C85A32]/40'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                            isChosen ? 'border-[#C85A32] bg-[#C85A32]' : 'border-[#8C8A90]'
                          }`}
                        >
                          {isChosen && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                        </div>
                        <span className="text-sm font-medium text-[#1E1E24]">{v.name}</span>
                      </div>
                      <span className="text-xs font-semibold text-[#6B696F]">
                        {v.priceAdjustment > 0
                          ? `+${currencySymbol}${v.priceAdjustment}`
                          : 'Standard'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Add-ons */}
          {item.addons && item.addons.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-sm font-bold text-[#1E1E24] uppercase tracking-wide">
                Optional Add-ons & Extras
              </h4>
              <div className="space-y-2">
                {item.addons.map((a) => {
                  const isChecked = selectedAddons.some((addon) => addon.id === a.id);
                  return (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => toggleAddon(a)}
                      className={`w-full flex items-center justify-between p-3 rounded-2xl border-2 transition-all text-left ${
                        isChecked
                          ? 'border-[#C85A32] bg-[#FAF1EC]'
                          : 'border-[#EADBCE] bg-white hover:border-[#C85A32]/40'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`w-5 h-5 rounded-md border flex items-center justify-center ${
                            isChecked
                              ? 'border-[#C85A32] bg-[#C85A32] text-white'
                              : 'border-[#8C8A90] bg-white'
                          }`}
                        >
                          {isChecked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                        </div>
                        <span className="text-sm text-[#1E1E24] font-medium">{a.name}</span>
                      </div>
                      <span className="text-xs font-semibold text-[#C85A32]">
                        +{currencySymbol}{a.price}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Special Instructions */}
          <div className="space-y-2">
            <label className="text-sm font-bold text-[#1E1E24] uppercase tracking-wide">
              Kitchen Instructions (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Less spicy, no onions, extra crispy crust..."
              value={specialInstructions}
              onChange={(e) => setSpecialInstructions(e.target.value)}
              maxLength={120}
              className="w-full px-4 py-3 bg-white border border-[#EADBCE] rounded-xl text-sm focus:outline-none focus:border-[#C85A32] transition-colors"
            />
          </div>
        </div>

        {/* Footer with quantity and add to cart */}
        <div className="p-4 sm:p-6 bg-white border-t border-[#EADBCE] flex items-center justify-between gap-4">
          {/* Quantity stepper */}
          <div className="flex items-center border border-[#EADBCE] rounded-xl bg-[#FAF7F2] p-1">
            <button
              type="button"
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
              disabled={quantity <= 1}
              className="w-9 h-9 flex items-center justify-center rounded-lg bg-white text-[#1E1E24] disabled:opacity-40 hover:bg-[#F3ECE1] transition-colors"
            >
              <Minus className="w-4 h-4" />
            </button>
            <span className="w-10 text-center font-bold text-sm text-[#1E1E24]">
              {quantity}
            </span>
            <button
              type="button"
              onClick={() => setQuantity(quantity + 1)}
              className="w-9 h-9 flex items-center justify-center rounded-lg bg-white text-[#1E1E24] hover:bg-[#F3ECE1] transition-colors"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {/* Add to order button */}
          <button
            type="button"
            onClick={handleAdd}
            disabled={!item.isAvailable}
            className="flex-1 flex items-center justify-between px-6 py-3.5 bg-[#C85A32] text-white rounded-2xl font-semibold hover:bg-[#B04B26] transition-colors shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span>Add to Cart</span>
            <span className="font-bold text-amber-200">
              {currencySymbol}{itemTotal}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
