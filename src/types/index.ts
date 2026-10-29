import { MenuItem, MenuCategory, RestaurantTable, RestaurantSettings } from '../data/defaultMenu';

export type OrderStatus = 'new' | 'accepted' | 'preparing' | 'ready' | 'served' | 'cancelled';
export type PaymentStatus = 'unpaid' | 'paid' | 'refunded';
export type PaymentMethod = 'counter' | 'upi' | 'card';
export type UserRole = 'admin' | 'kitchen' | 'staff';

export interface OrderSelectedAddon {
  id: string;
  name: string;
  price: number;
}

export interface CartItem {
  cartItemId: string; // unique ID in cart
  menuItem: MenuItem;
  selectedVariant?: { id: string; name: string; priceAdjustment: number };
  selectedAddons: OrderSelectedAddon[];
  quantity: number;
  specialInstructions?: string;
  unitPrice: number; // basePrice + variantAdjustment
  itemTotal: number; // (unitPrice + addonsTotal) * quantity
}

export interface OrderItemRecord {
  id: string;
  orderId: string;
  menuItemId?: string;
  itemName: string;
  unitPrice: number;
  quantity: number;
  variantName?: string;
  variantPrice?: number;
  addons: OrderSelectedAddon[];
  specialInstructions?: string;
  itemTotal: number;
  createdAt?: string;
}

export interface OrderStatusHistoryItem {
  id: string;
  orderId: string;
  fromStatus?: OrderStatus;
  toStatus: OrderStatus;
  changedBy: string;
  notes?: string;
  createdAt: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  tableId?: string;
  tableNumber: string;
  customerName: string;
  customerPhone?: string;
  status: OrderStatus;
  subtotal: number;
  taxAmount: number;
  serviceCharge: number;
  totalAmount: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  specialInstructions?: string;
  cancelReason?: string;
  createdAt: string;
  updatedAt: string;
  items: OrderItemRecord[];
  history?: OrderStatusHistoryItem[];
}

export interface StaffUser {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
}

export interface AuditLogItem {
  id: string;
  userId?: string;
  userEmail?: string;
  action: string;
  entityType: string;
  entityId?: string;
  details?: Record<string, any>;
  createdAt: string;
}

export type { MenuItem, MenuCategory, RestaurantTable, RestaurantSettings };
