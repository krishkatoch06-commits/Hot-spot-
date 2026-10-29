# Hot Spot QR - Digital Restaurant & Kitchen System

A production-grade, full-stack contactless QR-code ordering and kitchen management system built for **Hot Spot** (Hamirpur, Himachal Pradesh, India).

Verified Google Maps Reference: `https://maps.app.goo.gl/B2fHCFbCtg1jejDu7`

---

## 🌟 Key Features

### 1. Customer-Facing Digital Menu (`/menu`)
- **One Common Restaurant QR Code**: Diners scan a single common table standee QR code from their phone camera (iOS/Android). No app installation required.
- **Table Verification**: Table number selected from live floor database; verified again on the trusted backend server during submission.
- **Categorized Menu**: Artisan Pizzas, Gourmet Burgers, Himalayan Momos, Pastas & Noodles, Crispy Bites, Thick Shakes.
- **Search & Filters**: Fast instant search, Pure Veg (green indicator), and Non-Veg (red indicator) toggles.
- **Dishes Customization**: Variants (Regular, Medium, Large), Portions, Add-ons (Cheese burst, Dips, Toppings), and chef cooking instructions.
- **Authoritative Server Pricing**: Subtotal, 5% GST taxes, and optional service charge computed authoritatively on the server to prevent tamper.
- **Live Order Tracking**: Real-time progress tracker (`Placed` ➔ `Accepted` ➔ `Preparing` ➔ `Ready` ➔ `Served`) with celebratory confetti and elapsed timer.

### 2. Kitchen Display System (KDS)
- **Live Real-time Feed**: Realtime order arrival via Supabase Realtime & Server-Sent Events (SSE).
- **Sound Alert**: Authentic 2-tone kitchen bell chime on new orders with mute toggle.
- **Expediter Workflow**: Accept, Start Cooking, Mark Ready, and Confirm Served buttons.
- **Elapsed Time Highlighting**: Orders running past 20 minutes turn urgent red to prioritize delivery.
- **Table & Status Filters**: Filter by active, preparing, ready, table number, or customer name.

### 3. Full Owner & Admin Management Suite
- **Analytics Dashboard**: Real-time daily gross sales, pending/preparing/served order counts, and best-selling dishes.
- **Menu Management**: Add, edit, duplicate, archive dishes, update prices, upload photos, and toggle "Sold Out" instantly.
- **AI Menu Extractor (Gemini)**: Upload a photo/flyer of your printed paper menu or paste text; Gemini automatically detects dishes, categories, and prices with preview & confirmation before publishing!
- **Bulk CSV Import & Export**: Import your existing menu or export current items and orders to CSV.
- **Printable QR Standee Generator**: Download high-resolution 800x800 PNG QR code or generate a ready-to-print A4 table standee pointing to your permanent deployed URL.
- **Table Floor Manager**: Manage table numbers, seating capacities, and active/inactive status.
- **Staff & RBAC**: Admin, Kitchen Line Cook, and Floor Staff roles.

---

## 🚀 Supabase Cloud PostgreSQL Setup

This app is built to connect seamlessly to Supabase PostgreSQL, Authentication, and Realtime.

### Step 1: Create a Supabase Project
1. Log in to [supabase.com](https://supabase.com) and create a new project.
2. Choose your region (e.g., `ap-south-1` Mumbai for India).

### Step 2: Run the Database Schema
1. Open your Supabase Dashboard ➔ **SQL Editor**.
2. Open the file `supabase/schema.sql` from this repository.
3. Paste the contents into the SQL Editor and click **Run**.
4. This creates all 13 tables (`restaurant_settings`, `profiles`, `user_roles`, `restaurant_tables`, `menu_categories`, `menu_items`, `menu_item_variants`, `menu_item_addons`, `orders`, `order_items`, `order_status_history`, `payments`, `audit_logs`), enables Row Level Security (RLS) policies, and configures realtime publication for `orders`.

### Step 3: Configure Environment Variables
Copy `.env.example` to `.env` and fill in:

```env
# Gemini AI API Key (for Menu Photo Extraction)
GEMINI_API_KEY="your-gemini-api-key"

# Deployed URL
APP_URL="https://your-restaurant-domain.com"

# Supabase Credentials (found in Project Settings -> API)
VITE_SUPABASE_URL="https://your-project-id.supabase.co"
VITE_SUPABASE_ANON_KEY="eyJhbGciOi..."
SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOi..."
```

*(Note: You can also enter and test your Supabase URL and Anon Key directly from the in-app Admin Panel ➔ **Restaurant & Supabase** settings tab without redeploying!)*

---

## 🔐 Default Demo Accounts

For immediate testing, default staff credentials:
- **Owner / Admin**: `owner@hotspot.com` / `admin123`
- **Kitchen Staff**: `kitchen@hotspot.com` / `kitchen123`

---

## 🛠️ Local Development & Build

```bash
# Install dependencies
npm install

# Start full-stack development server (Express backend + Vite frontend)
npm run dev

# Check TypeScript validation
npm run lint

# Build for production
npm run build

# Start production server
npm run start
```

---

## 🚢 Deployment (Netlify / Cloud Run / VPS)

1. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in your hosting provider's Environment Variables settings.
2. Set build command: `npm run build`
3. Set publish directory: `dist`
4. For full-stack deployment (supporting server-authoritative calculations and Gemini OCR):
   - Deploy as a Node.js web service running `npm run start` (starts `server.ts` listening on `PORT`).
