import React, { useState, useEffect, useMemo } from 'react';
import { Order, OrderStatus } from '../types';
import {
  ChefHat,
  Volume2,
  VolumeX,
  Clock,
  CheckCircle,
  AlertCircle,
  XCircle,
  Filter,
  RefreshCw,
  Search,
  BellRing,
} from 'lucide-react';
import { playKitchenChime } from '../lib/audio';

interface KitchenDashboardProps {
  orders: Order[];
  onUpdateOrderStatus: (
    orderId: string,
    status: OrderStatus,
    notes?: string,
    cancelReason?: string
  ) => Promise<void>;
  onRefreshOrders: () => void;
  currencySymbol: string;
}

export const KitchenDashboard: React.FC<KitchenDashboardProps> = ({
  orders,
  onUpdateOrderStatus,
  onRefreshOrders,
  currencySymbol,
}) => {
  const [isMuted, setIsMuted] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('active'); // 'active' (new, accepted, preparing, ready), 'all', or specific status
  const [tableFilter, setTableFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [cancelModalOrder, setCancelModalOrder] = useState<Order | null>(null);
  const [cancelReasonInput, setCancelReasonInput] = useState('');

  // Audio trigger on new order arrival
  const newOrderCount = orders.filter((o) => o.status === 'new').length;
  useEffect(() => {
    if (newOrderCount > 0 && !isMuted) {
      playKitchenChime();
    }
  }, [newOrderCount, isMuted]);

  // Unique tables from existing orders for filter
  const tableNumbers = useMemo(() => {
    const set = new Set<string>();
    orders.forEach((o) => set.add(o.tableNumber));
    return Array.from(set).sort((a, b) => Number(a) - Number(b));
  }, [orders]);

  // Filtered orders
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      // Status filter
      if (statusFilter === 'active') {
        if (order.status === 'served' || order.status === 'cancelled') return false;
      } else if (statusFilter !== 'all') {
        if (order.status !== statusFilter) return false;
      }

      // Table filter
      if (tableFilter !== 'all' && order.tableNumber !== tableFilter) {
        return false;
      }

      // Search query (order number or customer name)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchNum = order.orderNumber.toLowerCase().includes(q);
        const matchName = order.customerName.toLowerCase().includes(q);
        return matchNum || matchName;
      }

      return true;
    });
  }, [orders, statusFilter, tableFilter, searchQuery]);

  const handleStatusTransition = async (order: Order, nextStatus: OrderStatus) => {
    setActionLoadingId(order.id);
    try {
      await onUpdateOrderStatus(order.id, nextStatus, `Status updated to ${nextStatus} by Kitchen`);
    } catch (err: any) {
      alert(`Error updating order: ${err.message}`);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleConfirmCancel = async () => {
    if (!cancelModalOrder) return;
    setActionLoadingId(cancelModalOrder.id);
    try {
      await onUpdateOrderStatus(
        cancelModalOrder.id,
        'cancelled',
        'Order cancelled by Kitchen',
        cancelReasonInput || 'Kitchen issue / 86 item'
      );
      setCancelModalOrder(null);
      setCancelReasonInput('');
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setActionLoadingId(null);
    }
  };

  // Helper for elapsed minutes
  const getElapsed = (dateStr: string) => {
    const diff = Math.max(0, Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000));
    return diff;
  };

  return (
    <div className="min-h-screen bg-[#1E1E24] text-[#FAF7F2] p-4 sm:p-6 pb-20">
      {/* Top Kitchen Header Bar */}
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-6 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-[#C85A32] text-white flex items-center justify-center shadow-lg">
            <ChefHat className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-serif font-black tracking-wide text-white">
                Kitchen Display System (KDS)
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950 text-emerald-400 border border-emerald-800 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Live Realtime Feed
              </span>
            </div>
            <p className="text-xs text-white/60 mt-0.5">
              Hot Spot Hamirpur • Expediter & Line Cook Terminal
            </p>
          </div>
        </div>

        {/* Controls: Mute sound, Refresh, Status counters */}
        <div className="flex flex-wrap items-center gap-2.5 self-stretch md:self-auto">
          {/* New Orders Alert Badge */}
          {newOrderCount > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#C85A32] text-white text-xs font-bold shadow-md pulse-new-order">
              <BellRing className="w-4 h-4 animate-bounce" />
              <span>{newOrderCount} New Orders!</span>
            </div>
          )}

          {/* Sound Toggle */}
          <button
            onClick={() => setIsMuted(!isMuted)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition-colors ${
              isMuted
                ? 'bg-red-950/60 border-red-800 text-red-300'
                : 'bg-white/10 border-white/20 text-white hover:bg-white/15'
            }`}
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
            <span>{isMuted ? 'Muted' : 'Sound On'}</span>
          </button>

          {/* Refresh button */}
          <button
            onClick={onRefreshOrders}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/10 border border-white/20 hover:bg-white/15 text-xs font-bold transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="max-w-7xl mx-auto py-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 border-b border-white/10">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
          <span className="text-xs text-white/50 flex items-center gap-1 pl-1">
            <Filter className="w-3.5 h-3.5" /> Filter:
          </span>
          <button
            onClick={() => setStatusFilter('active')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
              statusFilter === 'active'
                ? 'bg-[#C85A32] text-white shadow-sm'
                : 'bg-white/10 text-white/70 hover:bg-white/15'
            }`}
          >
            Active Orders ({orders.filter((o) => o.status !== 'served' && o.status !== 'cancelled').length})
          </button>
          <button
            onClick={() => setStatusFilter('new')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
              statusFilter === 'new'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'bg-white/10 text-white/70 hover:bg-white/15'
            }`}
          >
            New ({orders.filter((o) => o.status === 'new').length})
          </button>
          <button
            onClick={() => setStatusFilter('preparing')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
              statusFilter === 'preparing'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-white/10 text-white/70 hover:bg-white/15'
            }`}
          >
            Preparing ({orders.filter((o) => o.status === 'preparing').length})
          </button>
          <button
            onClick={() => setStatusFilter('ready')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
              statusFilter === 'ready'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'bg-white/10 text-white/70 hover:bg-white/15'
            }`}
          >
            Ready for Pickup ({orders.filter((o) => o.status === 'ready').length})
          </button>
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
              statusFilter === 'all'
                ? 'bg-white text-[#1E1E24] shadow-sm'
                : 'bg-white/10 text-white/70 hover:bg-white/15'
            }`}
          >
            All Today ({orders.length})
          </button>
        </div>

        <div className="flex items-center gap-2">
          {/* Table select dropdown */}
          <select
            value={tableFilter}
            onChange={(e) => setTableFilter(e.target.value)}
            className="bg-white/10 border border-white/20 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#C85A32]"
          >
            <option value="all" className="bg-[#1E1E24] text-white">All Tables</option>
            {tableNumbers.map((t) => (
              <option key={t} value={t} className="bg-[#1E1E24] text-white">
                Table {t}
              </option>
            ))}
          </select>

          {/* Quick search input */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-white/40 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search # or name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-white/10 border border-white/20 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-white/40 focus:outline-none focus:border-[#C85A32]"
            />
          </div>
        </div>
      </div>

      {/* Orders Grid */}
      <div className="max-w-7xl mx-auto mt-6">
        {filteredOrders.length === 0 ? (
          <div className="text-center py-20 bg-white/5 rounded-3xl border border-white/10 p-8">
            <CheckCircle className="w-12 h-12 text-emerald-400 mx-auto mb-3 opacity-60" />
            <h3 className="text-xl font-serif font-bold text-white">All caught up!</h3>
            <p className="text-xs text-white/60 mt-1 max-w-sm mx-auto">
              No orders matching the current filter. New orders placed by customers at tables will flash here in real-time.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredOrders.map((order) => {
              const elapsed = getElapsed(order.createdAt);
              const isUrgent = elapsed > 20 && order.status !== 'served' && order.status !== 'cancelled';
              const isNew = order.status === 'new';

              return (
                <div
                  key={order.id}
                  className={`relative rounded-3xl border flex flex-col justify-between overflow-hidden transition-all duration-200 shadow-md ${
                    isNew
                      ? 'bg-[#29221F] border-[#C85A32] ring-2 ring-[#C85A32]/40'
                      : isUrgent
                      ? 'bg-[#2A1D1D] border-red-500/80'
                      : 'bg-[#26262E] border-white/15'
                  }`}
                >
                  {/* Card Header */}
                  <div className="p-4 border-b border-white/10 bg-black/20">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-2xl font-black font-serif text-white tracking-wide">
                            #{order.orderNumber}
                          </span>
                          <span className="px-2 py-0.5 rounded-md text-xs font-black bg-white/20 text-white">
                            Table {order.tableNumber}
                          </span>
                        </div>
                        <div className="text-xs text-white/70 mt-0.5">
                          Guest: <strong className="text-white font-medium">{order.customerName}</strong>
                          {order.customerPhone && (
                            <span className="text-white/40 ml-1">({order.customerPhone})</span>
                          )}
                        </div>
                      </div>

                      {/* Elapsed time badge */}
                      <div
                        className={`flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold ${
                          isUrgent
                            ? 'bg-red-600 text-white animate-pulse'
                            : 'bg-white/10 text-white/80'
                        }`}
                      >
                        <Clock className="w-3 h-3" />
                        <span>{elapsed}m ago</span>
                      </div>
                    </div>

                    {/* Status Badge */}
                    <div className="mt-2.5 flex items-center justify-between">
                      <span
                        className={`text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
                          order.status === 'new'
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                            : order.status === 'accepted'
                            ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                            : order.status === 'preparing'
                            ? 'bg-orange-500/20 text-orange-300 border border-orange-500/40'
                            : order.status === 'ready'
                            ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                            : order.status === 'served'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                            : 'bg-red-500/20 text-red-300 border border-red-500/40'
                        }`}
                      >
                        ● {order.status}
                      </span>

                      <span className="text-xs text-white/50 font-medium">
                        {order.items.reduce((s, i) => s + i.quantity, 0)} total items
                      </span>
                    </div>

                    {/* Special Table Instructions if any */}
                    {order.specialInstructions && (
                      <div className="mt-2 p-2 rounded-xl bg-amber-950/40 border border-amber-800/60 text-xs text-amber-200">
                        <strong>Table Note:</strong> {order.specialInstructions}
                      </div>
                    )}
                  </div>

                  {/* Items list */}
                  <div className="p-4 flex-1 space-y-2.5 overflow-y-auto max-h-64">
                    {order.items.map((item) => (
                      <div
                        key={item.id}
                        className="p-2.5 rounded-xl bg-black/25 border border-white/5 flex flex-col gap-1"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-start gap-2">
                            <span className="w-6 h-6 rounded-md bg-[#C85A32] text-white flex items-center justify-center font-bold text-xs shrink-0">
                              {item.quantity}
                            </span>
                            <div>
                              <div className="text-sm font-semibold text-white leading-snug">
                                {item.itemName}
                              </div>
                              {item.variantName && (
                                <div className="text-xs text-[#C85A32] font-semibold">
                                  Size/Portion: {item.variantName}
                                </div>
                              )}
                              {item.addons && item.addons.length > 0 && (
                                <div className="text-[11px] text-white/60">
                                  + {item.addons.map((a) => a.name).join(', ')}
                                </div>
                              )}
                              {item.specialInstructions && (
                                <div className="text-[11px] text-amber-300 italic font-medium">
                                  Note: &ldquo;{item.specialInstructions}&rdquo;
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Action buttons (Kitchen workflow transitions) */}
                  <div className="p-3 bg-black/30 border-t border-white/10 space-y-2">
                    {order.status === 'new' && (
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          disabled={actionLoadingId === order.id}
                          onClick={() => handleStatusTransition(order, 'accepted')}
                          className="py-2.5 px-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center justify-center gap-1"
                        >
                          <span>Accept Order</span>
                        </button>
                        <button
                          type="button"
                          disabled={actionLoadingId === order.id}
                          onClick={() => handleStatusTransition(order, 'preparing')}
                          className="py-2.5 px-3 bg-[#C85A32] hover:bg-[#B04B26] text-white rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center justify-center gap-1"
                        >
                          <span>Start Cooking</span>
                        </button>
                      </div>
                    )}

                    {order.status === 'accepted' && (
                      <button
                        type="button"
                        disabled={actionLoadingId === order.id}
                        onClick={() => handleStatusTransition(order, 'preparing')}
                        className="w-full py-2.5 bg-[#C85A32] hover:bg-[#B04B26] text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
                      >
                        Start Cooking / In Oven
                      </button>
                    )}

                    {order.status === 'preparing' && (
                      <button
                        type="button"
                        disabled={actionLoadingId === order.id}
                        onClick={() => handleStatusTransition(order, 'ready')}
                        className="w-full py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
                      >
                        Mark Ready for Table / Runner
                      </button>
                    )}

                    {order.status === 'ready' && (
                      <button
                        type="button"
                        disabled={actionLoadingId === order.id}
                        onClick={() => handleStatusTransition(order, 'served')}
                        className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center justify-center gap-1"
                      >
                        <CheckCircle className="w-4 h-4" />
                        <span>Confirm Served to Table {order.tableNumber}</span>
                      </button>
                    )}

                    {order.status === 'served' && (
                      <div className="py-2 text-center text-xs text-emerald-400 font-semibold bg-emerald-950/40 rounded-xl border border-emerald-800">
                        ✓ Served to Table {order.tableNumber}
                      </div>
                    )}

                    {order.status === 'cancelled' && (
                      <div className="py-2 text-center text-xs text-red-400 font-semibold bg-red-950/40 rounded-xl border border-red-800">
                        ✕ Cancelled: {order.cancelReason || 'Staff Cancelled'}
                      </div>
                    )}

                    {/* Secondary button: cancel order if something goes wrong */}
                    {order.status !== 'served' && order.status !== 'cancelled' && (
                      <button
                        type="button"
                        onClick={() => setCancelModalOrder(order)}
                        className="w-full text-center text-[11px] text-white/40 hover:text-red-400 py-1 transition-colors"
                      >
                        Cancel / 86 items...
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Cancel Reason Modal */}
      {cancelModalOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="w-full max-w-md bg-[#26262E] rounded-3xl p-6 border border-white/20 text-white">
            <div className="flex items-center gap-3 text-red-400 mb-2">
              <AlertCircle className="w-6 h-6" />
              <h3 className="text-lg font-bold">Cancel Order #{cancelModalOrder.orderNumber}?</h3>
            </div>
            <p className="text-xs text-white/70 mb-4">
              This will notify Table {cancelModalOrder.tableNumber} that their order has been cancelled.
            </p>

            <div className="space-y-2 mb-4">
              <label className="text-xs font-bold uppercase tracking-wider text-white/60">
                Cancellation Reason:
              </label>
              <input
                type="text"
                placeholder="e.g. Out of ingredients, customer requested, etc."
                value={cancelReasonInput}
                onChange={(e) => setCancelReasonInput(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/20 text-sm text-white focus:outline-none focus:border-[#C85A32]"
              />
            </div>

            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setCancelModalOrder(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-white/70 hover:text-white"
              >
                Go Back
              </button>
              <button
                type="button"
                disabled={actionLoadingId === cancelModalOrder.id}
                onClick={handleConfirmCancel}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold shadow-sm"
              >
                Confirm Cancellation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
