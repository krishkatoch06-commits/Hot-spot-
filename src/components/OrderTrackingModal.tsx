import React, { useEffect, useState } from 'react';
import { Order, OrderStatus } from '../types';
import { CheckCircle2, Clock, ChefHat, Sparkles, AlertTriangle, ArrowLeft, RefreshCw } from 'lucide-react';
import confetti from 'canvas-confetti';

interface OrderTrackingModalProps {
  order: Order | null;
  isOpen: boolean;
  onClose: () => void;
  currencySymbol: string;
  onRefresh?: () => void;
}

const STATUS_STEPS: { key: OrderStatus; label: string; desc: string }[] = [
  { key: 'new', label: 'Order Received', desc: 'Sent straight to Hot Spot kitchen' },
  { key: 'accepted', label: 'Kitchen Accepted', desc: 'Order confirmed by head chef' },
  { key: 'preparing', label: 'Cooking & Baking', desc: 'Fresh ingredients being prepared now' },
  { key: 'ready', label: 'Order Ready', desc: 'Hot & fresh at your table soon' },
  { key: 'served', label: 'Served', desc: 'Enjoy your meal!' },
];

export const OrderTrackingModal: React.FC<OrderTrackingModalProps> = ({
  order,
  isOpen,
  onClose,
  currencySymbol,
  onRefresh,
}) => {
  if (!isOpen || !order) return null;

  // Run confetti once on new order
  useEffect(() => {
    try {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.6 },
        colors: ['#C85A32', '#FBEFE9', '#D97706', '#2D5A43'],
      });
    } catch {}
  }, [order.id]);

  const [elapsedMinutes, setElapsedMinutes] = useState(0);

  useEffect(() => {
    const updateElapsed = () => {
      const start = new Date(order.createdAt).getTime();
      const diff = Math.max(0, Math.floor((Date.now() - start) / 60000));
      setElapsedMinutes(diff);
    };

    updateElapsed();
    const timer = setInterval(updateElapsed, 15000);
    return () => clearInterval(timer);
  }, [order.createdAt]);

  const getStepIndex = (status: OrderStatus) => {
    switch (status) {
      case 'new': return 0;
      case 'accepted': return 1;
      case 'preparing': return 2;
      case 'ready': return 3;
      case 'served': return 4;
      default: return 0;
    }
  };

  const currentStep = getStepIndex(order.status);
  const isCancelled = order.status === 'cancelled';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="relative w-full max-w-lg bg-[#FAF7F2] rounded-3xl shadow-2xl border border-[#EADBCE] max-h-[92vh] flex flex-col overflow-hidden">
        {/* Top Header */}
        <div className="p-6 bg-white border-b border-[#EADBCE] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="p-2 text-[#6B696F] hover:text-[#1E1E24] hover:bg-[#F3ECE1] rounded-full transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-[#C85A32]">
                Live Order Tracking
              </span>
              <h2 className="text-xl font-serif font-bold text-[#1E1E24]">
                Order #{order.orderNumber}
              </h2>
            </div>
          </div>
          {onRefresh && (
            <button
              onClick={onRefresh}
              title="Refresh live status"
              className="p-2.5 text-[#6B696F] hover:text-[#C85A32] hover:bg-[#FBEFE9] rounded-xl transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Content */}
        <div className="overflow-y-auto flex-1 p-6 space-y-6">
          {/* Status highlight card */}
          {isCancelled ? (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-center">
              <AlertTriangle className="w-8 h-8 text-red-600 mx-auto mb-2" />
              <h3 className="font-bold text-red-800 text-lg">Order Cancelled</h3>
              <p className="text-xs text-red-600 mt-1">
                Reason: {order.cancelReason || 'Cancelled by restaurant staff.'}
              </p>
            </div>
          ) : (
            <div className="bg-[#FAF1EC] border-2 border-[#C85A32]/30 rounded-2xl p-5 text-center shadow-xs">
              <div className="w-12 h-12 rounded-full bg-[#C85A32] text-white flex items-center justify-center mx-auto mb-3 shadow-sm pulse-new-order">
                {order.status === 'served' ? (
                  <CheckCircle2 className="w-6 h-6" />
                ) : order.status === 'preparing' ? (
                  <ChefHat className="w-6 h-6" />
                ) : (
                  <Sparkles className="w-6 h-6" />
                )}
              </div>
              <h3 className="font-serif font-bold text-2xl text-[#1E1E24] capitalize">
                {order.status === 'new'
                  ? 'Order Sent to Kitchen'
                  : order.status === 'accepted'
                  ? 'Kitchen Preparing Queue'
                  : order.status === 'preparing'
                  ? 'Sizzling on Stove & Oven'
                  : order.status === 'ready'
                  ? 'Order is Ready!'
                  : 'Served to Table'}
              </h3>
              <p className="text-xs text-[#6B696F] mt-1">
                Table {order.tableNumber} • Guest: {order.customerName}
              </p>
              <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 bg-white rounded-full text-xs font-semibold text-[#C85A32] border border-[#F3D5C6]">
                <Clock className="w-3.5 h-3.5" />
                <span>Elapsed time: {elapsedMinutes} mins</span>
              </div>
            </div>
          )}

          {/* Stepper Progress */}
          {!isCancelled && (
            <div className="space-y-4 px-2">
              <h4 className="text-xs font-bold text-[#1E1E24] uppercase tracking-wider">
                Kitchen Timeline
              </h4>
              <div className="space-y-4 relative">
                {STATUS_STEPS.map((step, idx) => {
                  const isDone = currentStep >= idx;
                  const isCurrent = currentStep === idx;

                  return (
                    <div key={step.key} className="flex items-start gap-3.5 relative">
                      {idx !== STATUS_STEPS.length - 1 && (
                        <div
                          className={`absolute left-3.5 top-7 bottom-0 w-0.5 -mb-4 ${
                            currentStep > idx ? 'bg-[#C85A32]' : 'bg-[#EADBCE]'
                          }`}
                        />
                      )}
                      <div
                        className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 z-10 text-xs font-bold transition-all ${
                          isDone
                            ? 'bg-[#C85A32] text-white'
                            : 'bg-white border-2 border-[#EADBCE] text-[#8C8A90]'
                        } ${isCurrent ? 'ring-4 ring-[#C85A32]/20' : ''}`}
                      >
                        {isDone ? '✓' : idx + 1}
                      </div>
                      <div className="flex-1 pt-0.5">
                        <div className="flex items-center justify-between">
                          <h5
                            className={`text-sm font-semibold ${
                              isDone ? 'text-[#1E1E24]' : 'text-[#8C8A90]'
                            }`}
                          >
                            {step.label}
                          </h5>
                          {isCurrent && (
                            <span className="text-[10px] font-bold bg-[#C85A32] text-white px-2 py-0.5 rounded-full uppercase">
                              Active
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-[#6B696F] mt-0.5">{step.desc}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Order Details Accordion / Summary */}
          <div className="bg-white rounded-2xl p-4 border border-[#EADBCE] space-y-3">
            <h4 className="text-xs font-bold text-[#1E1E24] uppercase tracking-wider pb-2 border-b border-[#F3ECE1]">
              Items Ordered
            </h4>
            <div className="space-y-2.5">
              {order.items.map((item) => (
                <div key={item.id} className="flex items-start justify-between text-xs">
                  <div>
                    <span className="font-bold text-[#1E1E24]">{item.quantity}x </span>
                    <span className="font-medium text-[#1E1E24]">{item.itemName}</span>
                    {item.variantName && (
                      <span className="text-[#C85A32] ml-1">({item.variantName})</span>
                    )}
                    {item.addons && item.addons.length > 0 && (
                      <div className="text-[11px] text-[#6B696F] pl-4">
                        + {item.addons.map((a) => a.name).join(', ')}
                      </div>
                    )}
                    {item.specialInstructions && (
                      <div className="text-[11px] italic text-[#8C8A90] pl-4">
                        &ldquo;{item.specialInstructions}&rdquo;
                      </div>
                    )}
                  </div>
                  <span className="font-semibold text-[#1E1E24]">
                    {currencySymbol}{item.itemTotal}
                  </span>
                </div>
              ))}
            </div>

            <div className="pt-2 border-t border-[#F3ECE1] space-y-1 text-xs text-[#6B696F]">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>{currencySymbol}{order.subtotal}</span>
              </div>
              <div className="flex justify-between">
                <span>Taxes</span>
                <span>{currencySymbol}{order.taxAmount}</span>
              </div>
              {order.serviceCharge > 0 && (
                <div className="flex justify-between">
                  <span>Service Charge</span>
                  <span>{currencySymbol}{order.serviceCharge}</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-bold text-[#1E1E24] pt-1 border-t border-[#F3ECE1]">
                <span>Total Amount</span>
                <span className="text-[#C85A32]">{currencySymbol}{order.totalAmount}</span>
              </div>
            </div>

            {/* Payment badge */}
            <div className="pt-2 flex items-center justify-between text-xs">
              <span className="text-[#6B696F]">Payment:</span>
              <span
                className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                  order.paymentStatus === 'paid'
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-amber-100 text-amber-800'
                }`}
              >
                {order.paymentStatus === 'paid' ? 'Paid' : 'Pay at Counter'}
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-white border-t border-[#EADBCE] flex items-center justify-between gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 bg-[#FAF7F2] text-[#1E1E24] border border-[#EADBCE] rounded-xl text-xs font-bold hover:bg-[#F3ECE1] transition-colors"
          >
            Order More Items
          </button>
        </div>
      </div>
    </div>
  );
};
