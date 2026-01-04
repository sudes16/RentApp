# Supabase Setup Guide

Your rental property management app is now connected to Supabase! Follow these steps to complete the setup.

## ✅ What's Already Done

- ✅ Supabase client installed (`@supabase/supabase-js`)
- ✅ Database schema created (`/supabase/migrations/20260103000000_initial_schema.sql`)
- ✅ Authentication integrated with Supabase Auth
- ✅ All components updated to use Supabase instead of localStorage
- ✅ Row Level Security (RLS) policies configured

## 🚀 Quick Start

### 1. Get Your Supabase Credentials

1. Go to your [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Go to **Settings** → **API**
4. Copy:
   - **Project URL** (looks like `https://xxxxx.supabase.co`)
   - **anon/public key** (starts with `eyJ...`)

### 2. Set Environment Variables

Create a `.env` file in your project root (if it doesn't exist):

```env
VITE_SUPABASE_URL=your-project-url-here
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

**Example:**
```env
VITE_SUPABASE_URL=https://abcdefghijklmnop.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 3. Database Migration

The database tables will be automatically created when you push the migration:

**Option A: Using Supabase CLI (Recommended)**
```bash
# Install Supabase CLI
npm install -g supabase

# Login
supabase login

# Link to your project
supabase link --project-ref your-project-ref

# Push migration
supabase db push
```

**Option B: Manual Setup via Dashboard**

Copy the SQL from `/supabase/migrations/20260103000000_initial_schema.sql` and:
1. Go to **SQL Editor** in Supabase Dashboard
2. Paste the migration SQL
3. Click **Run**

### 4. Test Authentication

The app uses Supabase Auth with email/password:

1. **Register a new account** - Click "Need an owner account? Register"
2. **Sign in** - Use your registered email and password

**Note:** If email confirmation is enabled in Supabase, you'll need to confirm the email first. You can disable this in:
- Supabase Dashboard → **Authentication** → **Settings** → **Email Auth** → Disable "Enable email confirmations"

## 📊 Database Structure

### Tables Created

1. **parent_properties**
   - Main properties (name, address only)
   - Owned by individual users

2. **properties**
   - Individual rental units
   - Linked to parent properties
   - Contains rent details

3. **tenancies**
   - Active/ended rental agreements
   - Links tenants to properties
   - Tracks rent, deposits, advances

4. **payments**
   - Payment history
   - Multiple payment methods (Cash, UPI, Bank Transfer, etc.)
   - Transaction tracking

### Security (RLS Policies)

✅ **Owners** can:
- View/Create/Update/Delete their own properties, tenancies, and payments
- **Cannot** see other owners' data

✅ **Tenants** can:
- View their own rental information (read-only)
- View their payment history
- **Cannot** modify data or see other tenants' data

## 🔄 Data Migration

If you have existing data in localStorage that you want to migrate:

1. **Export current data:**
   - Go to Properties page
   - Click "Export to Excel"
   - Save your data

2. **Import to Supabase:**
   - After setting up Supabase
   - Use the "Import from Excel" feature
   - Or manually add properties through the UI

## 🛠️ Troubleshooting

### "Failed to fetch" or Connection Errors

1. Check your `.env` file has correct credentials
2. Restart your development server after adding `.env`:
   ```bash
   npm run dev
   ```

### "User already exists" Error

- The email is already registered
- Use the "Sign In" option instead
- Or use a different email address

### RLS Policy Errors

If you see "Row-level security policy violation":
1. Make sure you're logged in
2. Check that the RLS policies were created correctly
3. Verify the migration ran successfully

### Email Confirmation Issues

If you can't log in after registration:
1. Go to Supabase Dashboard → **Authentication** → **Users**
2. Find your user
3. Click "..." → "Confirm Email"

Or disable email confirmation:
1. **Authentication** → **Settings** → **Email Auth**
2. Toggle off "Enable email confirmations"

## 🎯 Next Steps

1. ✅ Set up environment variables
2. ✅ Run database migration
3. ✅ Register an owner account
4. ✅ Start adding properties!

## 📱 Android App (Future)

When ready to convert to Android:
- Use Capacitor.js
- No code changes needed
- Just run: `npx cap add android`

## 🆘 Support

Having issues? Check:
- [Supabase Documentation](https://supabase.com/docs)
- [Supabase Auth Guide](https://supabase.com/docs/guides/auth)
- [Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)

---

**🎉 You're all set! Start managing your rental properties with cloud-powered data storage!**
