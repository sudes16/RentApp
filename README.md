# 🏢 RentHub - Property Rental Management System

A comprehensive rental property management application with cloud-based data storage, built with React, TypeScript, Tailwind CSS, Material-UI, and Supabase.

## ✨ Features

### 👤 Dual User Roles
- **OWNER**: Full property management capabilities
- **TENANT**: View-only access to rental information

### 🏠 Property Management
- **Parent Properties**: Main buildings/complexes (name & address only)
- **Individual Units**: Shops, flats, warehouses, land with complete rent details
- Hierarchical property organization
- Vacant/Occupied status tracking

### 👥 Tenant Management
- Assign tenants to properties
- Track rental agreements (tenancies)
- Security deposits and advance payments
- Start dates and next due dates

### 💰 Payment Tracking
- Multiple payment methods (Cash, Bank Transfer, UPI, Cheque, Online)
- Transaction ID tracking for digital payments
- Advance payment system
- Complete payment history
- Overdue tracking

### 📊 Revenue Analytics
- Monthly income trends
- Collection efficiency metrics
- Property-wise revenue comparison
- Overdue rent tracking
- Interactive charts and visualizations

### 🔐 Security
- Supabase Authentication
- Row Level Security (RLS)
- Owners only see their own data
- Tenants only see their rental info

### 📱 Mobile-Friendly
- Responsive design
- Material Design principles
- Ready for Android conversion (Capacitor)

### 💾 Data Management
- Excel export/import
- Cloud backup (Supabase)
- Real-time data sync
- Multi-device access

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm/pnpm
- Supabase account (free tier available)

### Installation

1. **Clone and install:**
   ```bash
   git clone <your-repo>
   cd renthub
   npm install
   ```

2. **Setup Supabase:**
   - Create a project at [supabase.com](https://supabase.com)
   - Copy your Project URL and anon key
   - Create `.env` file:
     ```env
     VITE_SUPABASE_URL=https://your-project.supabase.co
     VITE_SUPABASE_ANON_KEY=your-anon-key-here
     ```

3. **Run database migration:**

   **Option A: Using Supabase CLI**
   ```bash
   npx supabase link --project-ref your-project-ref
   npx supabase db push
   ```

   **Option B: Manual (SQL Editor)**
   - Copy SQL from `/supabase/migrations/20260103000000_initial_schema.sql`
   - Paste in Supabase Dashboard → SQL Editor → Run

4. **Start development:**
   ```bash
   npm run dev
   ```

5. **Register an account:**
   - Click "Need an owner account? Register"
   - Fill in your details
   - Start managing properties!

## 📖 Detailed Setup

See [SUPABASE_SETUP.md](./SUPABASE_SETUP.md) for complete setup instructions, troubleshooting, and migration guide.

## 🏗️ Architecture

### Tech Stack

- **Frontend**: React 18 + TypeScript
- **UI Framework**: Material-UI + Tailwind CSS
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Charts**: Recharts
- **State Management**: React Context
- **Build Tool**: Vite

### Database Schema

```
parent_properties
├── id (UUID)
├── owner_id (FK to auth.users)
├── name
└── address

properties (units)
├── id (UUID)
├── parent_property_id (FK)
├── owner_id (FK to auth.users)
├── unit_name
├── type (shop/flat/land/warehouse)
├── rent_amount
├── rent_frequency (monthly/yearly)
└── status (vacant/occupied)

tenancies
├── id (UUID)
├── property_id (FK)
├── tenant_id (FK to auth.users)
├── owner_id (FK to auth.users)
├── rent_amount
├── start_date
├── next_due_date
├── advance_balance
├── security_deposit
└── status (active/ended)

payments
├── id (UUID)
├── tenancy_id (FK)
├── property_id (FK)
├── tenant_id (FK)
├── owner_id (FK)
├── amount
├── date
├── method
├── transaction_id
└── advance_used
```

### Project Structure

```
src/
├── app/
│   ├── components/       # React components
│   │   ├── ui/          # Reusable UI components
│   │   ├── LoginPage.tsx
│   │   ├── OwnerDashboard.tsx
│   │   ├── TenantDashboard.tsx
│   │   ├── PropertiesPage.tsx
│   │   ├── TenantsPage.tsx
│   │   ├── PaymentsPage.tsx
│   │   └── RevenueAnalytics.tsx
│   ├── contexts/        # React Context providers
│   │   └── AuthContext.tsx
│   ├── utils/          # Utilities
│   │   ├── supabase.ts    # Supabase client & DB functions
│   │   ├── dataService.ts # Data access layer
│   │   └── types.ts       # TypeScript types
│   └── App.tsx         # Main app component
├── supabase/
│   └── migrations/     # Database migrations
└── styles/            # Global styles
```

## 👥 User Roles

### Owner Features
- ✅ Add/Edit/Delete parent properties
- ✅ Add/Edit/Delete rental units
- ✅ Assign tenants to properties
- ✅ Record rent payments
- ✅ Track security deposits & advances
- ✅ View comprehensive analytics
- ✅ Export/Import data
- ✅ Multi-device access

### Tenant Features (Future)
- ✅ View assigned property details
- ✅ See rent due dates
- ✅ View payment history
- ✅ Download receipts
- ⏳ Make online payments (coming soon)

## 🎨 Design

- **Color Scheme**: Indigo-Blue palette
- **UI Framework**: Material Design (Material-UI)
- **Responsive**: Mobile-first design
- **Icons**: Lucide React
- **Charts**: Recharts with custom styling

## 💡 Usage Examples

### Adding a Property

1. Navigate to "Properties"
2. Click "Add Parent Property"
3. Enter name and address
4. Click "Add Unit" to add rental units
5. Fill in rent details and save

### Assigning a Tenant

1. Go to "Tenants"
2. Click "Assign New Tenant"
3. Select property
4. Enter tenant details
5. Set rent amount and deposits
6. Save

### Recording a Payment

1. Navigate to "Payments"
2. Click "Record Payment"
3. Select property/tenant
4. Enter amount and payment method
5. Add transaction ID (for UPI/Bank Transfer)
6. Save - Next due date auto-updates!

## 📱 Converting to Android App

When ready, use Capacitor:

```bash
npm install @capacitor/core @capacitor/cli
npx cap init
npx cap add android
npx cap sync
npx cap open android
```

Build APK in Android Studio → **Build** → **Build Bundle(s) / APK(s)** → **Build APK(s)**

## 🛠️ Development

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## 🔧 Configuration

### Environment Variables

```env
VITE_SUPABASE_URL=your-supabase-project-url
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

### Disable Email Confirmation (Development)

In Supabase Dashboard:
1. Go to **Authentication** → **Settings** → **Email Auth**
2. Disable "Enable email confirmations"

## 📊 Data Export/Import

### Export
- Click "Export to Excel" on any page
- Downloads all data in Excel format
- Use as backup or for reporting

### Import
- Click "Import from Excel"
- Upload Excel file with correct format
- Data validates and imports

## 🆘 Troubleshooting

### Connection Issues
- Check `.env` file has correct credentials
- Restart dev server after changing `.env`
- Verify Supabase project is active

### Authentication Errors
- Disable email confirmation in development
- Check password requirements (min 6 characters)
- Verify email format

### RLS Policy Errors
- Ensure migration ran successfully
- Check you're logged in
- Verify owner_id matches logged-in user

## 📄 License

MIT License - feel free to use for your projects!

## 🤝 Contributing

Contributions welcome! Please:
1. Fork the repo
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📞 Support

For issues:
- Check [SUPABASE_SETUP.md](./SUPABASE_SETUP.md)
- Review [Supabase Docs](https://supabase.com/docs)
- Open an issue on GitHub

---

**Built with ❤️ using React, Supabase, and Material-UI**

🌟 **Star this repo if you find it useful!**
