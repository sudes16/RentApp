# ⚡ Quick Start - 3 Steps to Get Running

Your app is now showing a warning: **"Supabase Not Configured"**

Follow these 3 simple steps to fix it:

---

## 📝 Step 1: Create `.env` File (1 minute)

In your **project root** (same folder as `package.json`), create a file named `.env`:

```bash
# Create the file
touch .env
```

Or manually create it in your code editor.

---

## 🔑 Step 2: Add Supabase Credentials (2 minutes)

### Get Your Credentials:

1. Go to [app.supabase.com](https://app.supabase.com)
2. Select your project (or create a new one - it's free!)
3. Click **Settings** (gear icon) → **API**
4. Copy these two values:
   - **Project URL** (looks like `https://xxxxx.supabase.co`)
   - **anon public key** (starts with `eyJ...`)

### Add to `.env` file:

Open your `.env` file and paste:

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.ey...
```

**Replace with your actual values!**

---

## 🗄️ Step 3: Setup Database (2 minutes)

### Option A: Using Supabase CLI (Recommended)

```bash
# Install CLI (one time only)
npm install -g supabase

# Link to your project
npx supabase link --project-ref your-project-ref

# Push the database schema
npx supabase db push
```

### Option B: Manual Setup (Copy & Paste)

1. Open the file: `/supabase/migrations/20260103000000_initial_schema.sql`
2. Copy ALL the SQL code
3. Go to Supabase Dashboard → **SQL Editor**
4. Paste the SQL and click **Run**

---

## 🎉 Done! Now Restart Your App

```bash
# Stop your dev server (Ctrl+C)
# Then start it again:
npm run dev
```

The warning should be gone! 🎊

---

## ✅ Test It Out

1. **Register a new account:**
   - Click "Need an owner account? Register"
   - Fill in your details
   - Click "Register"

2. **Sign in:**
   - Use the email and password you just created
   - You're in! 🚀

3. **Start using the app:**
   - Add a parent property
   - Add some units
   - Assign tenants
   - Record payments

---

## ⚠️ Common Issues

### "Email confirmations required"

**Fix:** Disable email confirmation for development:

1. Supabase Dashboard → **Authentication** → **Settings** → **Email Auth**
2. Toggle OFF "Enable email confirmations"
3. Try registering again

### "Invalid project ref"

**Fix:** Get your project ref:

1. Supabase Dashboard → **Settings** → **General**
2. Look for "Reference ID"
3. Use this in the `supabase link` command

### "Migration failed"

**Fix:** Use Option B (Manual Setup) instead:
- Copy SQL from migration file
- Paste in SQL Editor
- Click Run

---

## 📚 Need More Help?

- **Detailed Setup:** See `SUPABASE_SETUP.md`
- **Full Documentation:** See `README.md`
- **Migration Info:** See `MIGRATION_SUMMARY.md`

---

## 🎯 What's Next?

After setup:
1. ✅ Explore the dashboard
2. ✅ Add your first property
3. ✅ Assign a tenant
4. ✅ Record a payment
5. ✅ Check out the analytics!

**Enjoy your cloud-powered rental management system! 🏢**
