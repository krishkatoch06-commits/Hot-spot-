import React, { useState } from 'react';
import { CartItem, RestaurantTable, RestaurantSettings, PaymentMethod } from '../types';
import { X, Trash2, Plus, Minus, AlertCircle, ShoppingBag, ArrowRight, ShieldCheck } from 'lucide-react';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  cart: CartItem[];
  table: RestaurantTable | null;
  onOpenTableModal: () => void;
  onUpdateQuantity: (cartItemId: string, newQty: number) => void;
  onRemoveItem: (cartItemId: string) => void;
  onClearCart: () => void;
  settings: RestaurantSettings;
  onSubmitOrder: (details: {
    customerName: string;
    customerPhone?: string;
    specialInstructions?: string;
    paymentMethod: PaymentMethod;
  }) => Promise<void>;
  isSubmitting: boolean;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({
  isOpen,
  onClose,
  cart,
  table,
  onOpenTableModal,
  onUpdateQuantity,
  onRemoveItem,
  onClearCart,
  settings,
  onSubmitOrder,
  isSubmitting,
}) => {
  if (!isOpen) return null;

  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('counter');
  const [validationError, setValidationError] = useState<string | null>(null);

  // Subtotal calculations
  const subtotal = cart.reduce((sum, item) => sum + item.itemTotal, 0);
  const taxRate = (settings.taxPercent || 5) / 100;
  const serviceChargeRate = (settings.serviceChargePercent || 0) / 100;

  const taxAmount = Math.round(subtotal * taxRate * 100) / 100;
  const serviceCharge = Math.round(subtotal * serviceChargeRate * 100) / 100;
  const totalAmount = Math.round((subtotal + taxAmount + serviceCharge) * 100) / 100;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    if (!table) {
      setValidationError('Please select your table number first.');
      onOpenTableModal();
      return;
    }

    if (!customerName.trim()) {
      setValidationError('Please enter your name so the kitchen knows who to serve.');
      return;
    }

    if (cart.length === 0) {
      setValidationError('Your cart is empty. Please add delicious dishes to order.');
      return;
    }

    try {
      await onSubmitOrder({
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim() || undefined,
        specialInstructions: specialInstructions.trim() || undefined,
        paymentMethod,
      });
    } catch (err: any) {
      setValidationError(err.message || 'Failed to submit order. Please try again.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs">
      <div className="relative w-full max-w-md bg-[#FAF7F2] h-full shadow-2xl flex flex-col border-l border-[#EADBCE]">
        {/* Header */}
        <div className="p-5 border-b border-[#EADBCE] bg-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-[#FBEFE9] text-[#C85A32] flex items-center justify-center">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-serif font-bold text-[#1E1E24]">Your Order</h2>
              <p className="text-xs text-[#6B696F]">
                {cart.length} {cart.length === 1 ? 'item' : 'items'} in cart
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-[#6B696F] hover:text-[#1E1E24] hover:bg-[#F3ECE1] rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Table Banner */}
        <div className="px-5 py-3 bg-[#FAF1EC] border-b border-[#F3D5C6] flex items-center justify-between">
          <div className="text-xs text-[#9B3C1B]">
            {table ? (
              <span>
                Ordering for: <strong className="font-bold text-[#1E1E24]">{table.displayName}</strong>
              </span>
            ) : (
              <span className="font-semibold text-red-600 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" /> No table selected!
              </span>
            )}
          </div>
          <button
            onClick={onOpenTableModal}
            className="text-xs font-bold text-[#C85A32] hover:underline"
          >
            {table ? 'Change Table' : 'Select Table'}
          </button>
        </div>

        {/* Cart items list */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {cart.length === 0 ? (
            <div className="text-center py-16 text-[#6B696F]">
              <div className="w-16 h-16 rounded-full bg-[#EADBCE]/40 flex items-center justify-center mx-auto mb-3 text-[#8C8A90]">
                <ShoppingBag className="w-8 h-8" />
              </div>
              <h4 className="font-serif font-semibold text-lg text-[#1E1E24]">Your cart is empty</h4>
              <p className="text-xs mt-1 max-w-xs mx-auto">
                Discover our wood-fired pizzas, gourmet burgers, and Himalayan momos!
              </p>
              <button
                onClick={onClose}
                className="mt-4 px-5 py-2 bg-[#C85A32] text-white text-xs font-bold rounded-xl"
              >
                Browse Menu
              </button>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between pb-1">
                <span className="text-xs font-bold uppercase tracking-wider text-[#6B696F]">
                  Order Items
                </span>
                <button
                  onClick={onClearCart}
                  className="text-xs text-red-600 hover:text-red-700 flex items-center gap-1"
                >
                  <Trash2 className="w-3 h-3" /> Clear
                </button>
              </div>

              <div className="space-y-3">
                {cart.map((item) => (
                  <div
                    key={item.cartItemId}
                    className="p-3.5 rounded-2xl bg-white border border-[#EADBCE] shadow-xs flex flex-col gap-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2">
                        <span
                          className={`mt-1 inline-flex items-center justify-center w-3.5 h-3.5 border rounded-xs bg-white ${
                            item.menuItem.isVeg ? 'border-emerald-600' : 'border-red-600'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              item.menuItem.isVeg ? 'bg-emerald-600' : 'bg-red-600'
                            }`}
                          />
                        </span>
                        <div>
                          <h4 className="text-sm font-semibold text-[#1E1E24] leading-snug">
                            {item.menuItem.name}
                          </h4>
                          {item.selectedVariant && (
                            <div className="text-[11px] text-[#C85A32] font-medium">
                              {item.selectedVariant.name}
                            </div>
                          )}
                          {item.selectedAddons.length > 0 && (
                            <div className="text-[11px] text-[#6B696F]">
                              Addons: {item.selectedAddons.map((a) => a.name).join(', ')}
                            </div>
                          )}
                          {item.specialInstructions && (
                            <div className="text-[11px] italic text-[#8C8A90]">
                              &ldquo;{item.specialInstructions}&rdquo;
                            </div>
                          )}
                        </div>
                      </div>

                      <span className="text-sm font-bold text-[#1E1E24] shrink-0">
                        {settings.currencySymbol}{item.itemTotal}
                      </span>
                    </div>

                    {/* Quantity controls */}
                    <div className="flex items-center justify-between pt-2 border-t border-[#F3ECE1]">
                      <span className="text-xs text-[#6B696F]">
                        {settings.currencySymbol}{item.unitPrice} each
                      </span>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center border border-[#EADBCE] rounded-lg bg-[#FAF7F2]">
                          <button
                            type="button"
                            onClick={() => onUpdateQuantity(item.cartItemId, item.quantity - 1)}
                            className="w-7 h-7 flex items-center justify-center hover:bg-[#EADBCE] rounded-l-lg text-[#1E1E24]"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="w-7 text-center font-bold text-xs text-[#1E1E24]">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => onUpdateQuantity(item.cartItemId, item.quantity + 1)}
                            className="w-7 h-7 flex items-center justify-center hover:bg-[#EADBCE] rounded-r-lg text-[#1E1E24]"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <button
                          type="button"
                          onClick={() => onRemoveItem(item.cartItemId)}
                          className="p-1.5 text-[#8C8A90] hover:text-red-600 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Customer info form */}
              <form onSubmit={handleSubmit} className="pt-3 space-y-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#1E1E24] uppercase tracking-wide flex items-center justify-between">
                    <span>Your Name *</span>
                    <span className="text-[10px] text-[#8C8A90] lowercase font-normal">Required for kitchen call</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Enter your name (e.g. Rahul, Priya)"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white border border-[#EADBCE] rounded-xl text-sm focus:outline-none focus:border-[#C85A32]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#1E1E24] uppercase tracking-wide flex items-center justify-between">
                    <span>Mobile Number</span>
                    <span className="text-[10px] text-[#8C8A90] lowercase font-normal">Optional SMS receipt</span>
                  </label>
                  <input
                    type="tel"
                    placeholder="10-digit mobile number"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white border border-[#EADBCE] rounded-xl text-sm focus:outline-none focus:border-[#C85A32]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#1E1E24] uppercase tracking-wide">
                    Special Table Instructions (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Serve drinks first, extra napkins"
                    value={specialInstructions}
                    onChange={(e) => setSpecialInstructions(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white border border-[#EADBCE] rounded-xl text-sm focus:outline-none focus:border-[#C85A32]"
                  />
                </div>

                {/* Payment Option */}
                <div className="space-y-2 pt-1">
                  <label className="text-xs font-bold text-[#1E1E24] uppercase tracking-wide">
                    Payment Method
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('counter')}
                      className={`p-3 rounded-xl border text-xs font-semibold text-left transition-all ${
                        paymentMethod === 'counter'
                          ? 'border-[#C85A32] bg-[#FAF1EC] text-[#C85A32]'
                          : 'border-[#EADBCE] bg-white text-[#6B696F]'
                      }`}
                    >
                      <div className="font-bold text-sm">Pay at Counter</div>
                      <div className="text-[11px] opacity-80 mt-0.5">Cash / Card / UPI upon finish</div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('upi')}
                      className={`p-3 rounded-xl border text-xs font-semibold text-left transition-all ${
                        paymentMethod === 'upi'
                          ? 'border-[#C85A32] bg-[#FAF1EC] text-[#C85A32]'
                          : 'border-[#EADBCE] bg-white text-[#6B696F]'
                      }`}
                    >
                      <div className="font-bold text-sm">Instant UPI</div>
                      <div className="text-[11px] opacity-80 mt-0.5">Scan QR at counter</div>
                    </button>
                  </div>
                </div>

                {validationError && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                    <span>{validationError}</span>
                  </div>
                )}
              </form>
            </>
          )}
        </div>

        {/* Bill summary & submit button */}
        {cart.length > 0 && (
          <div className="p-5 bg-white border-t border-[#EADBCE] space-y-3 shrink-0 shadow-lg">
            <div className="space-y-1.5 text-xs text-[#6B696F]">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span className="font-medium text-[#1E1E24]">{settings.currencySymbol}{subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>GST / Taxes ({settings.taxPercent}%)</span>
                <span className="font-medium text-[#1E1E24]">{settings.currencySymbol}{taxAmount.toFixed(2)}</span>
              </div>
              {serviceCharge > 0 && (
                <div className="flex justify-between">
                  <span>Service Charge ({settings.serviceChargePercent}%)</span>
                  <span className="font-medium text-[#1E1E24]">{settings.currencySymbol}{serviceCharge.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-base font-bold text-[#1E1E24] pt-2 border-t border-[#F3ECE1]">
                <span>Total Payable</span>
                <span className="text-[#C85A32]">{settings.currencySymbol}{totalAmount.toFixed(2)}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting || !table}
              className="w-full py-4 bg-[#C85A32] text-white rounded-2xl font-bold hover:bg-[#B04B26] transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed text-base"
            >
              {isSubmitting ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>Send Order to Kitchen</span>
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>

            <div className="flex items-center justify-center gap-1.5 text-[11px] text-[#8C8A90]">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Verified server calculation • Sent directly to kitchen KDS</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
