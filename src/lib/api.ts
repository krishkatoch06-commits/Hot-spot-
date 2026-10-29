import {
  RestaurantSettings,
  RestaurantTable,
  MenuCategory,
  MenuItem,
  Order,
  OrderStatus,
  PaymentStatus,
  PaymentMethod,
} from '../types/index';
import { getSupabaseClient, isSupabaseConfigured } from './supabase';

const API_BASE = '/api';

export async function fetchSettings(): Promise<RestaurantSettings> {
  try {
    const res = await fetch(`${API_BASE}/settings`);
    if (!res.ok) throw new Error('Failed to fetch settings');
    const data = await res.json();
    return data.settings;
  } catch (err) {
    console.error('Error fetching settings:', err);
    throw err;
  }
}

export async function updateSettings(settings: Partial<RestaurantSettings>): Promise<RestaurantSettings> {
  const res = await fetch(`${API_BASE}/settings`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(settings),
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.message || 'Failed to update settings');
  return data.settings;
}

export async function fetchTables(): Promise<RestaurantTable[]> {
  const res = await fetch(`${API_BASE}/tables`);
  const data = await res.json();
  if (!data.success) throw new Error('Failed to fetch tables');
  return data.tables;
}

export async function createTable(tableData: Partial<RestaurantTable>): Promise<RestaurantTable> {
  const res = await fetch(`${API_BASE}/tables`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(tableData),
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.message || 'Failed to create table');
  return data.table;
}

export async function updateTable(id: string, tableData: Partial<RestaurantTable>): Promise<RestaurantTable> {
  const res = await fetch(`${API_BASE}/tables/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(tableData),
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.message || 'Failed to update table');
  return data.table;
}

export async function deleteTable(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/tables/${id}`, { method: 'DELETE' });
  const data = await res.json();
  if (!data.success) throw new Error(data.message || 'Failed to delete table');
}

export async function fetchMenu(): Promise<{ categories: MenuCategory[]; menuItems: MenuItem[] }> {
  const res = await fetch(`${API_BASE}/menu`);
  const data = await res.json();
  if (!data.success) throw new Error('Failed to fetch menu');
  return { categories: data.categories, menuItems: data.menuItems };
}

export async function createMenuItem(item: Partial<MenuItem>): Promise<MenuItem> {
  const res = await fetch(`${API_BASE}/menu/items`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(item),
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.message || 'Failed to create item');
  return data.item;
}

export async function updateMenuItem(id: string, item: Partial<MenuItem>): Promise<MenuItem> {
  const res = await fetch(`${API_BASE}/menu/items/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(item),
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.message || 'Failed to update item');
  return data.item;
}

export async function deleteMenuItem(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/menu/items/${id}`, { method: 'DELETE' });
  const data = await res.json();
  if (!data.success) throw new Error(data.message || 'Failed to delete item');
}

export async function createCategory(cat: Partial<MenuCategory>): Promise<MenuCategory> {
  const res = await fetch(`${API_BASE}/menu/categories`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(cat),
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.message || 'Failed to create category');
  return data.category;
}

export async function updateCategory(id: string, cat: Partial<MenuCategory>): Promise<MenuCategory> {
  const res = await fetch(`${API_BASE}/menu/categories/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(cat),
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.message || 'Failed to update category');
  return data.category;
}

export async function deleteCategory(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/menu/categories/${id}`, { method: 'DELETE' });
  const data = await res.json();
  if (!data.success) throw new Error(data.message || 'Failed to delete category');
}

export async function bulkImportMenu(items: any[], categories?: any[]): Promise<{ importedCount: number; message: string }> {
  const res = await fetch(`${API_BASE}/menu/bulk-import`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ items, categories }),
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.message || 'Bulk import failed');
  return data;
}

export interface SubmitOrderPayload {
  tableNumber: string;
  customerName: string;
  customerPhone?: string;
  cartItems: any[];
  specialInstructions?: string;
  paymentMethod?: PaymentMethod;
}

export async function submitOrder(payload: SubmitOrderPayload): Promise<Order> {
  const res = await fetch(`${API_BASE}/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!data.success) {
    throw new Error(data.message || 'Failed to place order');
  }

  // Also if Supabase is configured, record in Supabase in parallel
  if (isSupabaseConfigured()) {
    try {
      const supabase = getSupabaseClient();
      if (supabase && data.order) {
        await supabase.from('orders').insert({
          id: data.order.id,
          order_number: data.order.orderNumber,
          table_number: data.order.tableNumber,
          customer_name: data.order.customerName,
          customer_phone: data.order.customerPhone,
          status: data.order.status,
          subtotal: data.order.subtotal,
          tax_amount: data.order.taxAmount,
          service_charge: data.order.serviceCharge,
          total_amount: data.order.totalAmount,
          payment_method: data.order.paymentMethod,
          payment_status: data.order.paymentStatus,
          special_instructions: data.order.specialInstructions,
        });
      }
    } catch (e) {
      console.warn('Note: Could not mirror to Supabase cloud table directly:', e);
    }
  }

  return data.order;
}

export async function fetchOrders(params?: { status?: string; table?: string }): Promise<Order[]> {
  const q = new URLSearchParams();
  if (params?.status) q.set('status', params.status);
  if (params?.table) q.set('table', params.table);

  const res = await fetch(`${API_BASE}/orders?${q.toString()}`);
  const data = await res.json();
  if (!data.success) throw new Error('Failed to fetch orders');
  return data.orders;
}

export async function fetchOrderById(id: string): Promise<Order> {
  const res = await fetch(`${API_BASE}/orders/${id}`);
  const data = await res.json();
  if (!data.success) throw new Error(data.message || 'Order not found');
  return data.order;
}

export async function updateOrderStatus(
  id: string,
  status: OrderStatus,
  notes?: string,
  cancelReason?: string
): Promise<Order> {
  const res = await fetch(`${API_BASE}/orders/${id}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status, notes, cancelReason }),
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.message || 'Failed to update order status');

  // Sync with Supabase if configured
  if (isSupabaseConfigured()) {
    try {
      const supabase = getSupabaseClient();
      if (supabase) {
        await supabase
          .from('orders')
          .update({ status, updated_at: new Date().toISOString() })
          .eq('order_number', data.order.orderNumber);
      }
    } catch (e) {
      console.warn('Supabase mirror error:', e);
    }
  }

  return data.order;
}

export async function updateOrderPayment(
  id: string,
  paymentStatus: PaymentStatus,
  paymentMethod?: PaymentMethod
): Promise<Order> {
  const res = await fetch(`${API_BASE}/orders/${id}/payment`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ paymentStatus, paymentMethod }),
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.message || 'Failed to update payment');
  return data.order;
}

export async function extractMenuWithAI(payload: { imageBase64?: string; textInput?: string; mimeType?: string }) {
  const res = await fetch(`${API_BASE}/menu/extract`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.message || 'AI extraction failed');
  return data.data;
}

/**
 * Realtime Listener helper: Listens on SSE or Supabase Realtime channel
 */
export function subscribeToOrders(onEvent: (event: string, data: any) => void): () => void {
  // If Supabase is configured with realtime, subscribe to orders channel
  const supabase = getSupabaseClient();
  let supabaseChannel: any = null;

  if (supabase) {
    try {
      supabaseChannel = supabase
        .channel('public:orders')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, (payload) => {
          onEvent('supabase_order_change', payload);
        })
        .subscribe();
    } catch (err) {
      console.warn('Supabase channel subscribe failed:', err);
    }
  }

  // Also listen to Server-Sent Events (SSE) from the backend
  const eventSource = new EventSource('/api/stream/orders');

  eventSource.addEventListener('new_order', (e: MessageEvent) => {
    try {
      const parsed = JSON.parse(e.data);
      onEvent('new_order', parsed.payload);
    } catch {}
  });

  eventSource.addEventListener('order_status_updated', (e: MessageEvent) => {
    try {
      const parsed = JSON.parse(e.data);
      onEvent('order_status_updated', parsed.payload);
    } catch {}
  });

  eventSource.addEventListener('order_payment_updated', (e: MessageEvent) => {
    try {
      const parsed = JSON.parse(e.data);
      onEvent('order_payment_updated', parsed.payload);
    } catch {}
  });

  return () => {
    eventSource.close();
    if (supabaseChannel && supabase) {
      supabase.removeChannel(supabaseChannel);
    }
  };
}
