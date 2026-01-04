# RentHub - Rental Property Management App

## Overview
A comprehensive, mobile-friendly rental property management application with role-based access for OWNERS and TENANTS. Data is stored locally in the browser using localStorage with Excel export/import functionality.

## Features Implemented

### 1. User Roles & Authentication
- **OWNER Role**: Full access to manage properties, tenants, and payments
- **TENANT Role**: View-only access to their own rental information
- Login page with email/password authentication
- Owner registration (tenants added by owners)
- Demo credentials provided on login page

### 2. Data Storage
All data stored in localStorage (no database required):
- **Users**: id, email, name, role, password, phone
- **Properties**: id, ownerId, name, type, address, rentAmount, rentFrequency, dueDay, securityDeposit, status, notes
- **Tenancies**: id, propertyId, tenantId, rentAmount, startDate, nextDueDate, advanceBalance, status
- **Payments**: id, tenancyId, propertyId, tenantId, amount, date, method, advanceUsed, receiptNumber, notes

### 3. OWNER Features

#### Dashboard
- Key metrics cards (Total Properties, Active Tenancies, Monthly Collection, Overdue Payments, etc.)
- Recent payments list
- Upcoming due dates
- Export all data to Excel button

#### Properties Management
- Add/Edit/Delete properties
- Property types: shop, flat, land, warehouse
- Search and filter by type/status
- Track vacant vs occupied properties
- Set rent amount, frequency (monthly/yearly), and due day
- Add security deposits and notes

#### Tenants Management
- Assign tenants to properties
- Create new tenant accounts (auto-generates login credentials)
- View tenant information and payment history
- End tenancy feature
- Track advance balances

#### Payments
- Record rent payments
- Multiple payment methods (cash, bank transfer, cheque, online)
- Apply advance balance to payments
- Auto-calculate next due dates
- Generate receipt numbers
- Download payment receipts
- Export payment reports to Excel

### 4. TENANT Features

#### Dashboard
- View current rental property details
- See next payment due date (with overdue warning)
- Check advance balance
- View complete payment history
- Download receipts for all payments

### 5. Excel Export Functionality
- Export all data (properties, tenancies, payments)
- Export properties list
- Export payment reports
- Download individual receipts as text files
- Uses xlsx library for Excel generation

### 6. Mobile-Responsive Design
- Clean, modern UI using Tailwind CSS and shadcn/ui components
- Mobile-friendly navigation with hamburger menu
- Touch-optimized cards and buttons
- Responsive grid layouts
- Works well on Android (WebView compatible)

## Demo Credentials

### Owner Account
- Email: owner@demo.com
- Password: owner123

### Tenant Accounts
- Email: tenant1@demo.com
- Password: tenant123
- Email: tenant2@demo.com
- Password: tenant123

## Sample Data Included

The app initializes with sample data:
- 1 Owner
- 2 Tenants
- 3 Properties (2 occupied, 1 vacant)
- 2 Active Tenancies
- 3 Payment Records

## Key Features

### Advance Payment Handling
- Track advance payments from tenants
- Automatically apply advance to rent
- Show advance balance on dashboards
- Deduct from advance when recording payments

### Payment Tracking
- Auto-generate unique receipt numbers
- Track payment history per tenant
- Calculate next due dates automatically
- Support for partial payments and advance credits

### Role-Based Security
- Owners only see their own data
- Tenants only see their rental info
- Authentication required for all pages
- Automatic routing based on role

## Technical Details

### Data Persistence
- Uses browser localStorage
- Data survives page refreshes
- Can be exported to Excel for backup
- No server or database required

### Dev Mode Notes
All data structures are documented in `/src/app/utils/db.ts`:
- Property model with CRUD operations
- Tenancy lifecycle management
- Payment tracking with receipt generation
- User management with role-based access

### Potential API Endpoints (for future backend)
- POST /api/login
- POST /api/register
- GET /api/properties
- POST /api/properties
- PUT /api/properties/:id
- DELETE /api/properties/:id
- GET /api/tenancies
- POST /api/tenancies
- GET /api/payments
- POST /api/payments
- GET /api/reports/payments
- GET /api/export/excel

## Future Enhancements
1. Email notifications for due dates
2. SMS reminders
3. Multiple currency support
4. Lease document upload/storage
5. Maintenance request tracking
6. Tenant reviews/ratings
7. Payment gateway integration
8. Mobile app (React Native)
9. Multi-language support
10. Cloud sync option

## Notes
- This is a demonstration app - not suitable for storing sensitive PII or financial data in production
- Uses mock authentication (passwords stored in plain text)
- For production use, implement proper backend with encryption, secure authentication, and database
- Excel export works entirely client-side
- No data leaves the browser unless explicitly exported

## File Structure
```
/src/app/
  ├── utils/
  │   ├── db.ts              # Data models and localStorage operations
  │   └── excel.ts           # Excel export functions
  ├── contexts/
  │   └── AuthContext.tsx    # Authentication state management
  ├── components/
  │   ├── LoginPage.tsx      # Login and registration
  │   ├── Layout.tsx         # Main layout with navigation
  │   ├── OwnerDashboard.tsx # Owner overview
  │   ├── TenantDashboard.tsx # Tenant view
  │   ├── PropertiesPage.tsx # Property CRUD
  │   ├── TenantsPage.tsx    # Tenant management
  │   ├── PaymentsPage.tsx   # Payment recording
  │   └── ui/               # Reusable UI components
  └── App.tsx               # Main app component
```
