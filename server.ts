import express from 'express';
import type { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import {
  INITIAL_RESTAURANT_SETTINGS,
  INITIAL_TABLES,
  INITIAL_CATEGORIES,
  INITIAL_MENU_ITEMS,
  MenuItem,
  MenuCategory,
  RestaurantTable,
  RestaurantSettings,
} from './src/data/defaultMenu.ts';
import type { Order, OrderItemRecord, OrderStatus, PaymentStatus } from './src/types/index.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// ---------------------------------------------------------------------------
// DATA PERSISTENCE LAYER (Server-Side)
// ---------------------------------------------------------------------------
const DATA_DIR = path.resolve(__dirname, '.data');
const DB_FILE = path.resolve(DATA_DIR, 'restaurant_store.json');

interface StoreData {
  settings: RestaurantSettings;
  tables: RestaurantTable[];
  categories: MenuCategory[];
  menuItems: MenuItem[];
  orders: Order[];
  auditLogs: any[];
}

function initDataStore(): StoreData {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  if (fs.existsSync(DB_FILE)) {
    try {
      const content = fs.readFileSync(DB_FILE, 'utf-8');
      const parsed = JSON.parse(content);
      return {
        settings: parsed.settings || INITIAL_RESTAURANT_SETTINGS,
        tables: parsed.tables || INITIAL_TABLES,
        categories: parsed.categories || INITIAL_CATEGORIES,
        menuItems: parsed.menuItems || INITIAL_MENU_ITEMS,
        orders: parsed.orders || [],
        auditLogs: parsed.auditLogs || [],
      };
    } catch (e) {
      console.warn('Error reading store file, creating default store', e);
    }
  }

  const initialStore: StoreData = {
    settings: INITIAL_RESTAURANT_SETTINGS,
    tables: INITIAL_TABLES,
    categories: INITIAL_CATEGORIES,
    menuItems: INITIAL_MENU_ITEMS,
    orders: [],
    auditLogs: [],
  };

  saveDataStore(initialStore);
  return initialStore;
}

let store: StoreData = initDataStore();

function saveDataStore(data: StoreData) {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to save store to file:', err);
  }
}

// ---------------------------------------------------------------------------
// SERVER-SENT EVENTS (SSE) FOR INSTANT REALTIME UPDATES
// ---------------------------------------------------------------------------
const sseClients: Response[] = [];

function broadcastOrderUpdate(event: string, payload: any) {
  const data = JSON.stringify({ event, payload, timestamp: new Date().toISOString() });
  for (let i = sseClients.length - 1; i >= 0; i--) {
    const client = sseClients[i];
    try {
      client.write(`event: ${event}\ndata: ${data}\n\n`);
    } catch {
      sseClients.splice(i, 1);
    }
  }
}

app.get('/api/stream/orders', (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  sseClients.push(res);

  // Send initial ping
  res.write(`event: connected\ndata: ${JSON.stringify({ status: 'connected', clients: sseClients.length })}\n\n`);

  req.on('close', () => {
    const idx = sseClients.indexOf(res);
    if (idx !== -1) sseClients.splice(idx, 1);
  });
});

// ---------------------------------------------------------------------------
// RESTAURANT SETTINGS APIS
// ---------------------------------------------------------------------------
app.get('/api/settings', (_req: Request, res: Response) => {
  res.json({ success: true, settings: store.settings });
});

app.put('/api/settings', (req: Request, res: Response) => {
  const updated = { ...store.settings, ...req.body };
  store.settings = updated;
  saveDataStore(store);

  store.auditLogs.unshift({
    id: `log-${Date.now()}`,
    action: 'UPDATE_SETTINGS',
    entityType: 'settings',
    details: req.body,
    createdAt: new Date().toISOString(),
  });

  res.json({ success: true, settings: store.settings });
});

// ---------------------------------------------------------------------------
// TABLES APIS
// ---------------------------------------------------------------------------
app.get('/api/tables', (_req: Request, res: Response) => {
  res.json({ success: true, tables: store.tables });
});

app.post('/api/tables', (req: Request, res: Response) => {
  const { tableNumber, displayName, capacity, isActive } = req.body;
  if (!tableNumber) {
    return res.status(400).json({ success: false, message: 'Table number is required' });
  }

  // Check unique table number
  const exists = store.tables.find(
    (t) => t.tableNumber.trim().toLowerCase() === String(tableNumber).trim().toLowerCase()
  );
  if (exists) {
    return res.status(400).json({ success: false, message: `Table number ${tableNumber} already exists` });
  }

  const newTable: RestaurantTable = {
    id: `tbl-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    tableNumber: String(tableNumber).trim(),
    displayName: displayName || `Table ${tableNumber}`,
    capacity: Number(capacity) || 4,
    isActive: isActive !== false,
    qrSlug: `t-${tableNumber.trim().toLowerCase().replace(/\s+/g, '-')}`,
  };

  store.tables.push(newTable);
  saveDataStore(store);
  res.status(201).json({ success: true, table: newTable });
});

app.put('/api/tables/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const index = store.tables.findIndex((t) => t.id === id);
  if (index === -1) {
    return res.status(404).json({ success: false, message: 'Table not found' });
  }

  store.tables[index] = { ...store.tables[index], ...req.body };
  saveDataStore(store);
  res.json({ success: true, table: store.tables[index] });
});

app.delete('/api/tables/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  store.tables = store.tables.filter((t) => t.id !== id);
  saveDataStore(store);
  res.json({ success: true, message: 'Table deleted successfully' });
});

// ---------------------------------------------------------------------------
// MENU APIS (Categories & Items)
// ---------------------------------------------------------------------------
app.get('/api/menu', (_req: Request, res: Response) => {
  res.json({
    success: true,
    categories: store.categories,
    menuItems: store.menuItems,
  });
});

app.post('/api/menu/categories', (req: Request, res: Response) => {
  const { name, description, icon, displayOrder } = req.body;
  if (!name) return res.status(400).json({ success: false, message: 'Category name is required' });

  const newCat: MenuCategory = {
    id: `cat-${Date.now()}`,
    name,
    description: description || '',
    icon: icon || 'Utensils',
    displayOrder: Number(displayOrder) || store.categories.length + 1,
    isActive: true,
  };

  store.categories.push(newCat);
  saveDataStore(store);
  res.status(201).json({ success: true, category: newCat });
});

app.put('/api/menu/categories/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const idx = store.categories.findIndex((c) => c.id === id);
  if (idx === -1) return res.status(404).json({ success: false, message: 'Category not found' });

  store.categories[idx] = { ...store.categories[idx], ...req.body };
  saveDataStore(store);
  res.json({ success: true, category: store.categories[idx] });
});

app.delete('/api/menu/categories/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  store.categories = store.categories.filter((c) => c.id !== id);
  saveDataStore(store);
  res.json({ success: true, message: 'Category deleted' });
});

app.post('/api/menu/items', (req: Request, res: Response) => {
  const {
    categoryId,
    name,
    description,
    basePrice,
    imageUrl,
    isVeg,
    isAvailable,
    preparationTimeMinutes,
    isBestseller,
    spicyLevel,
    variants,
    addons,
    tags,
  } = req.body;

  if (!name || basePrice === undefined) {
    return res.status(400).json({ success: false, message: 'Item name and base price are required' });
  }

  const newItem: MenuItem = {
    id: `item-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    categoryId: categoryId || (store.categories[0]?.id ?? 'cat-general'),
    name: name.trim(),
    description: description || '',
    basePrice: Number(basePrice),
    imageUrl: imageUrl || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&auto=format&fit=crop&q=80',
    isVeg: Boolean(isVeg),
    isAvailable: isAvailable !== false,
    preparationTimeMinutes: Number(preparationTimeMinutes) || 15,
    isBestseller: Boolean(isBestseller),
    spicyLevel: Number(spicyLevel) || 0,
    variants: variants || [],
    addons: addons || [],
    tags: tags || [],
  };

  store.menuItems.unshift(newItem);
  saveDataStore(store);
  res.status(201).json({ success: true, item: newItem });
});

app.put('/api/menu/items/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const idx = store.menuItems.findIndex((m) => m.id === id);
  if (idx === -1) return res.status(404).json({ success: false, message: 'Menu item not found' });

  store.menuItems[idx] = { ...store.menuItems[idx], ...req.body };
  saveDataStore(store);
  res.json({ success: true, item: store.menuItems[idx] });
});

app.delete('/api/menu/items/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  store.menuItems = store.menuItems.filter((m) => m.id !== id);
  saveDataStore(store);
  res.json({ success: true, message: 'Menu item removed' });
});

// Bulk Import Menu Items (from CSV or AI Extraction)
app.post('/api/menu/bulk-import', (req: Request, res: Response) => {
  const { items, categories } = req.body;
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ success: false, message: 'Invalid or empty items array' });
  }

  // Add categories if new
  if (Array.isArray(categories)) {
    for (const cat of categories) {
      if (!store.categories.some((c) => c.name.toLowerCase() === cat.name.toLowerCase())) {
        store.categories.push({
          id: `cat-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          name: cat.name,
          description: cat.description || '',
          icon: cat.icon || 'Utensils',
          displayOrder: store.categories.length + 1,
          isActive: true,
        });
      }
    }
  }

  // Import items
  let importedCount = 0;
  for (const raw of items) {
    if (!raw.name) continue;

    // Find category ID
    let targetCatId = raw.categoryId;
    if (!targetCatId && raw.categoryName) {
      const matched = store.categories.find(
        (c) => c.name.toLowerCase() === raw.categoryName.trim().toLowerCase()
      );
      if (matched) {
        targetCatId = matched.id;
      } else {
        const newCatId = `cat-${Date.now()}-${importedCount}`;
        store.categories.push({
          id: newCatId,
          name: raw.categoryName.trim(),
          description: '',
          icon: 'Utensils',
          displayOrder: store.categories.length + 1,
          isActive: true,
        });
        targetCatId = newCatId;
      }
    }

    if (!targetCatId) {
      targetCatId = store.categories[0]?.id || 'cat-general';
    }

    const newItem: MenuItem = {
      id: `item-${Date.now()}-${importedCount}-${Math.floor(Math.random() * 1000)}`,
      categoryId: targetCatId,
      name: String(raw.name).trim(),
      description: raw.description || '',
      basePrice: Math.max(0, Number(raw.basePrice || raw.price || 99)),
      imageUrl: raw.imageUrl || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&auto=format&fit=crop&q=80',
      isVeg: raw.isVeg !== undefined ? Boolean(raw.isVeg) : true,
      isAvailable: raw.isAvailable !== false,
      preparationTimeMinutes: Number(raw.preparationTimeMinutes) || 15,
      isBestseller: Boolean(raw.isBestseller),
      spicyLevel: Number(raw.spicyLevel) || 0,
      variants: raw.variants || [],
      addons: raw.addons || [],
      tags: raw.tags || [],
    };

    store.menuItems.unshift(newItem);
    importedCount++;
  }

  saveDataStore(store);
  res.json({
    success: true,
    message: `Successfully imported ${importedCount} menu items`,
    importedCount,
    totalItems: store.menuItems.length,
  });
});

// ---------------------------------------------------------------------------
// TRUSTED ORDER SUBMISSION & CALCULATION (CRITICAL SECURITY)
// ---------------------------------------------------------------------------
app.post('/api/orders', (req: Request, res: Response) => {
  const { tableNumber, customerName, customerPhone, cartItems, specialInstructions, paymentMethod } = req.body;

  // 1. Validate customer name
  if (!customerName || typeof customerName !== 'string' || customerName.trim().length === 0) {
    return res.status(400).json({ success: false, message: 'Please provide your name.' });
  }

  // 2. Validate table number against server database
  if (!tableNumber) {
    return res.status(400).json({ success: false, message: 'Please select your table number.' });
  }

  const validTable = store.tables.find(
    (t) => t.tableNumber.trim().toLowerCase() === String(tableNumber).trim().toLowerCase() && t.isActive
  );

  if (!validTable) {
    return res.status(400).json({
      success: false,
      message: `Table "${tableNumber}" is not an active dining table. Please choose a valid active table.`,
    });
  }

  // 3. Validate items
  if (!Array.isArray(cartItems) || cartItems.length === 0) {
    return res.status(400).json({ success: false, message: 'Your cart is empty.' });
  }

  let subtotal = 0;
  const processedOrderItems: OrderItemRecord[] = [];
  const orderId = `ord-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

  for (const cartItem of cartItems) {
    const menuItemId = cartItem.menuItemId || cartItem.menuItem?.id;
    const menuItem = store.menuItems.find((m) => m.id === menuItemId);

    if (!menuItem) {
      return res.status(400).json({
        success: false,
        message: `Dish "${cartItem.menuItem?.name || 'Item'}" is no longer on the menu.`,
      });
    }

    if (!menuItem.isAvailable) {
      return res.status(400).json({
        success: false,
        message: `Sorry, "${menuItem.name}" just sold out and is unavailable.`,
      });
    }

    const quantity = Math.max(1, Math.floor(Number(cartItem.quantity) || 1));

    // Authoritative unit price check
    let unitPrice = menuItem.basePrice;
    let variantName: string | undefined;
    let variantPrice = 0;

    if (cartItem.selectedVariant) {
      const dbVariant = menuItem.variants?.find((v) => v.id === cartItem.selectedVariant.id);
      if (dbVariant) {
        variantName = dbVariant.name;
        variantPrice = dbVariant.priceAdjustment;
        unitPrice += variantPrice;
      }
    }

    // Authoritative addon check
    const verifiedAddons: Array<{ id: string; name: string; price: number }> = [];
    let addonsSum = 0;
    if (Array.isArray(cartItem.selectedAddons)) {
      for (const reqAddon of cartItem.selectedAddons) {
        const dbAddon = menuItem.addons?.find((a) => a.id === reqAddon.id);
        if (dbAddon && dbAddon.isAvailable !== false) {
          verifiedAddons.push({
            id: dbAddon.id,
            name: dbAddon.name,
            price: dbAddon.price,
          });
          addonsSum += dbAddon.price;
        }
      }
    }

    const itemTotal = (unitPrice + addonsSum) * quantity;
    subtotal += itemTotal;

    processedOrderItems.push({
      id: `oi-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      orderId,
      menuItemId: menuItem.id,
      itemName: menuItem.name,
      unitPrice,
      quantity,
      variantName,
      variantPrice,
      addons: verifiedAddons,
      specialInstructions: cartItem.specialInstructions?.trim() || undefined,
      itemTotal,
      createdAt: new Date().toISOString(),
    });
  }

  // Calculate tax and charges authoritatively
  const taxRate = (store.settings.taxPercent || 5) / 100;
  const serviceChargeRate = (store.settings.serviceChargePercent || 0) / 100;

  const taxAmount = Math.round(subtotal * taxRate * 100) / 100;
  const serviceCharge = Math.round(subtotal * serviceChargeRate * 100) / 100;
  const totalAmount = Math.round((subtotal + taxAmount + serviceCharge) * 100) / 100;

  // Generate clean sequential/random order number e.g., HS-4029
  const orderNumber = `HS-${Math.floor(1000 + Math.random() * 9000)}`;

  const newOrder: Order = {
    id: orderId,
    orderNumber,
    tableId: validTable.id,
    tableNumber: validTable.tableNumber,
    customerName: customerName.trim(),
    customerPhone: customerPhone ? String(customerPhone).trim() : undefined,
    status: 'new',
    subtotal,
    taxAmount,
    serviceCharge,
    totalAmount,
    paymentMethod: paymentMethod === 'upi' ? 'upi' : paymentMethod === 'card' ? 'card' : 'counter',
    paymentStatus: 'unpaid',
    specialInstructions: specialInstructions?.trim() || undefined,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    items: processedOrderItems,
    history: [
      {
        id: `h-${Date.now()}`,
        orderId,
        toStatus: 'new',
        changedBy: 'Customer',
        notes: `Order placed at Table ${validTable.tableNumber}`,
        createdAt: new Date().toISOString(),
      },
    ],
  };

  store.orders.unshift(newOrder);
  saveDataStore(store);

  // Broadcast live update to kitchen dashboard
  broadcastOrderUpdate('new_order', newOrder);

  res.status(201).json({
    success: true,
    message: 'Order placed successfully!',
    order: newOrder,
  });
});

// ---------------------------------------------------------------------------
// ORDERS MANAGEMENT APIS (Kitchen & Admin)
// ---------------------------------------------------------------------------
app.get('/api/orders', (req: Request, res: Response) => {
  const { status, table, limit } = req.query;
  let filtered = [...store.orders];

  if (status && typeof status === 'string' && status !== 'all') {
    filtered = filtered.filter((o) => o.status === status);
  }

  if (table && typeof table === 'string' && table !== 'all') {
    filtered = filtered.filter((o) => o.tableNumber === table);
  }

  if (limit) {
    filtered = filtered.slice(0, Number(limit));
  }

  res.json({ success: true, orders: filtered });
});

app.get('/api/orders/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const order = store.orders.find((o) => o.id === id || o.orderNumber === id);
  if (!order) {
    return res.status(404).json({ success: false, message: 'Order not found' });
  }
  res.json({ success: true, order });
});

// Kitchen & Staff status transitions
app.patch('/api/orders/:id/status', (req: Request, res: Response) => {
  const { id } = req.params;
  const { status, changedBy, notes, cancelReason } = req.body;

  const validStatuses: OrderStatus[] = ['new', 'accepted', 'preparing', 'ready', 'served', 'cancelled'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ success: false, message: 'Invalid order status' });
  }

  const orderIndex = store.orders.findIndex((o) => o.id === id || o.orderNumber === id);
  if (orderIndex === -1) {
    return res.status(404).json({ success: false, message: 'Order not found' });
  }

  const prevOrder = store.orders[orderIndex];
  const prevStatus = prevOrder.status;

  const updatedOrder: Order = {
    ...prevOrder,
    status: status as OrderStatus,
    cancelReason: status === 'cancelled' ? cancelReason || notes || 'Cancelled by staff' : prevOrder.cancelReason,
    updatedAt: new Date().toISOString(),
    history: [
      ...(prevOrder.history || []),
      {
        id: `h-${Date.now()}`,
        orderId: prevOrder.id,
        fromStatus: prevStatus,
        toStatus: status as OrderStatus,
        changedBy: changedBy || 'Kitchen Staff',
        notes: notes || undefined,
        createdAt: new Date().toISOString(),
      },
    ],
  };

  store.orders[orderIndex] = updatedOrder;
  saveDataStore(store);

  // Broadcast status update
  broadcastOrderUpdate('order_status_updated', {
    orderId: updatedOrder.id,
    orderNumber: updatedOrder.orderNumber,
    fromStatus: prevStatus,
    toStatus: status,
    order: updatedOrder,
  });

  res.json({ success: true, order: updatedOrder });
});

// Update payment status (Cash counter, UPI, etc.)
app.patch('/api/orders/:id/payment', (req: Request, res: Response) => {
  const { id } = req.params;
  const { paymentStatus, paymentMethod, verifiedBy } = req.body;

  const orderIndex = store.orders.findIndex((o) => o.id === id || o.orderNumber === id);
  if (orderIndex === -1) {
    return res.status(404).json({ success: false, message: 'Order not found' });
  }

  const order = store.orders[orderIndex];
  order.paymentStatus = (paymentStatus as PaymentStatus) || 'paid';
  if (paymentMethod) order.paymentMethod = paymentMethod;
  order.updatedAt = new Date().toISOString();

  store.auditLogs.unshift({
    id: `log-${Date.now()}`,
    action: 'UPDATE_PAYMENT',
    entityType: 'order',
    entityId: order.orderNumber,
    details: { paymentStatus: order.paymentStatus, verifiedBy: verifiedBy || 'Staff' },
    createdAt: new Date().toISOString(),
  });

  saveDataStore(store);
  broadcastOrderUpdate('order_payment_updated', order);

  res.json({ success: true, order });
});

// ---------------------------------------------------------------------------
// AI-POWERED MENU PHOTO / PDF EXTRACTION (GEMINI)
// ---------------------------------------------------------------------------
app.post('/api/menu/extract', async (req: Request, res: Response) => {
  try {
    const { imageBase64, mimeType, textInput } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return res.status(400).json({
        success: false,
        message: 'GEMINI_API_KEY is not set in environment. Please add it to enable AI menu extraction.',
      });
    }

    const ai = new GoogleGenAI();

    const promptText = `You are an expert restaurant digital menu assistant for "Hot Spot" restaurant.
Analyze the provided restaurant menu image, document, or text and extract all dishes into structured JSON.
For each dish extract:
- name: string (clean title of the dish)
- categoryName: string (e.g. "Artisan Pizzas", "Gourmet Burgers", "Himalayan Momos", "Pastas & Noodles", "Starters", "Beverages & Shakes")
- description: string (appetizing description or ingredients)
- basePrice: number (approximate or extracted price in INR; if not listed, estimate a realistic price in INR like 149, 199, etc.)
- isVeg: boolean (true for vegetarian/paneer/cheese, false for chicken/meat/fish)
- spicyLevel: number (0=mild/none, 1=mild, 2=medium spicy, 3=extra spicy)
- tags: array of strings (e.g. ["Bestseller", "Chef Special", "Spicy"])

Return ONLY a valid JSON object matching this schema:
{
  "categories": [{"name": "string", "description": "string"}],
  "items": [
    {
      "name": "string",
      "categoryName": "string",
      "description": "string",
      "basePrice": 199,
      "isVeg": true,
      "spicyLevel": 1,
      "tags": ["Chef Special"]
    }
  ]
}
Do not wrap in markdown quotes if possible, or return standard JSON.`;

    let response;
    if (imageBase64) {
      const cleanBase64 = imageBase64.replace(/^data:[^;]+;base64,/, '');
      response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [
          {
            role: 'user',
            parts: [
              {
                inlineData: {
                  data: cleanBase64,
                  mimeType: mimeType || 'image/jpeg',
                },
              },
              { text: promptText },
            ],
          },
        ],
        config: {
          responseMimeType: 'application/json',
        },
      });
    } else if (textInput) {
      response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [
          {
            role: 'user',
            parts: [
              { text: promptText + `\n\nInput Menu Content:\n${textInput}` },
            ],
          },
        ],
        config: {
          responseMimeType: 'application/json',
        },
      });
    } else {
      return res.status(400).json({ success: false, message: 'Provide either imageBase64 or textInput' });
    }

    const textResult = response.text || '';
    let parsedData;
    try {
      parsedData = JSON.parse(textResult);
    } catch {
      // try trimming code block markers
      const clean = textResult.replace(/```json/g, '').replace(/```/g, '').trim();
      parsedData = JSON.parse(clean);
    }

    res.json({
      success: true,
      data: parsedData,
      rawCount: parsedData.items?.length || 0,
    });
  } catch (error: any) {
    console.error('AI Extraction Error:', error);
    res.status(500).json({
      success: false,
      message: error?.message || 'Failed to extract menu data with Gemini.',
    });
  }
});

// ---------------------------------------------------------------------------
// VITE INTEGRATION / SPA SERVING
// ---------------------------------------------------------------------------
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true, allowedHosts: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`[Hot Spot QR Server] Running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
