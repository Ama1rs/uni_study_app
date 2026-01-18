# 🚀 Supabase Cloud Sync Testing Guide

## 📋 Quick Start Checklist

### ✅ Prerequisites
- [ ] Supabase project created and schema applied (`src-tauri/migrations/supabase_schema.sql`)
- [ ] `.env` file configured with `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
- [ ] Development server running: `npm run tauri:dev`

---

## 🔍 Step-by-Step Debugging Process

### **Step 0: Define "Online" Status**
The app now has a strict definition of "online" - ALL conditions must be true:

✅ **Internet access** - `navigator.onLine === true`  
✅ **Supabase client exists** - Client properly initialized  
✅ **Environment variables loaded** - URL and key defined  
✅ **Supabase reachable** - Server responds (even with error)  
✅ **Auth session valid** - User logged in or anonymous  
✅ **Recent successful request** - Last successful request < 30s ago

---

## 🧪 Testing Scenarios

### **1. Manual Testing via Browser Console**

Open Tauri app, press F12, and run:

```javascript
// Test Step 1: Internet
console.log("🌐 Internet Status:", navigator.onLine);

// Test Step 2: Supabase Client
console.log("🔌 Supabase Client:", window.supabaseClient);

// Test Step 3: Environment Variables
console.log("⚙️  URL:", import.meta.env.VITE_SUPABASE_URL);
console.log("🔑 KEY:", import.meta.env.VITE_SUPABASE_ANON_KEY?.slice(0, 10));

// Test Step 4: Supabase Reachability
if (window.supabaseClient) {
  window.supabaseClient
    .from("_dummy_ping")
    .select("*")
    .limit(1)
    .then(({ data, error }) => {
      if (error?.message?.includes('relation "_dummy_ping" does not exist')) {
        console.log("✅ Supabase REACHABLE (expected error)");
      } else {
        console.log("❌ Supabase NOT reachable:", error);
      }
    });
}

// Test Step 5: Auth State
if (window.supabaseClient) {
  window.supabaseClient.auth.getSession().then(({ data }) => {
    console.log("👤 Auth Session:", data.session ? "VALID" : "NONE");
  });
}

// Run Complete Debug Check
if (typeof window.debugCloudStatus === 'function') {
  window.debugCloudStatus().then(console.log);
}
```

### **2. UI-Based Testing**

#### **A. Access Debug Panel**
1. Go to **Settings → Data Settings**
2. Look for "🐛 Cloud Sync Debugging Tools" section
3. Check real-time status indicators
4. Click "Run Debug" to execute full checklist

#### **B. Monitor Real-Time Status**
- **Green**: All systems operational
- **Yellow**: Currently checking/recovering
- **Red**: One or more systems failed

#### **C. Step-by-Step Verification**
The debug panel shows each checklist item with status:
- ✅ **Green checkmark**: Step passed
- ❌ **Red X**: Step failed  
- ⚠️ **Yellow circle**: Step not yet checked

---

## 🎯 Specific Test Cases

### **Test Case 1: Fresh Installation**
```bash
# 1. Clear local data
rm -rf ~/.local/share/uni_study_app/study_app.db

# 2. Start app
npm run tauri:dev

# 3. Expected: Local-only mode, all Supabase tests should show "Offline"
```

### **Test Case 2: Configured Supabase**
```bash
# 1. Configure .env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# 2. Restart app
npm run tauri:dev

# 3. Expected: All steps should pass, status should be "Online"
```

### **Test Case 3: Network Failure Simulation**
```bash
# 1. Start app with working Supabase config
# 2. Disconnect internet (disable WiFi or unplug ethernet)
# 3. Expected: Real-time monitor should detect failure within 5 seconds
# 4. Reconnect network
# 5. Expected: Should recover within 5 seconds
```

### **Test Case 4: Invalid Supabase Config**
```bash
# 1. Break the config
VITE_SUPABASE_URL=https://invalid-project.supabase.co
VITE_SUPABASE_ANON_KEY=invalid-key

# 2. Start app
# 3. Expected: Step 4 should fail with network error
```

### **Test Case 5: Auth Flow Testing**
```javascript
// Test different auth states
// 1. Logout
await window.supabaseClient.auth.signOut();
// Expected: Status should go offline

// 2. Login
const { data, error } = await window.supabaseClient.auth.signInWithPassword({
  email: 'test@example.com',
  password: 'password'
});
// Expected: Status should go online if other conditions met
```

---

## 🔧 Advanced Debugging

### **Network Inspection**
```javascript
// Check Tauri permissions
console.log("HTTP Allowlist:", __TAURI_INTERNALS__.allowlist.http);

// Check actual network requests
// Open DevTools → Network tab
// Look for requests to your-project.supabase.co
```

### **Database Inspection**
```bash
# Check local SQLite database
sqlite3 ~/.local/share/uni_study_app/study_app.db

# Check sync_state table
SELECT * FROM sync_state;

# Check device_identity table  
SELECT * FROM device_identity;
```

### **Supabase Dashboard Verification**
1. Go to [supabase.com/dashboard](https://supabase.com/dashboard)
2. Select your project
3. Check:
   - **Table Editor**: All data synced correctly
   - **Authentication**: User profiles created
   - **Storage**: Files uploaded with correct paths
   - **Settings**: RLS policies enabled

---

## 📊 Performance Monitoring

### **Response Time Tracking**
The real-time monitor shows:
- **🟢 < 500ms**: Excellent
- **🟡 500-1000ms**: Acceptable  
- **🔴 > 1000ms**: Poor

### **Failure Recovery**
The app tracks consecutive failures and:
- **1-2 failures**: Normal retry
- **3-5 failures**: Exponential backoff
- **6+ failures**: Mark offline, require manual intervention

---

## 🚨 Common Issues & Solutions

| Issue | Root Cause | Fix |
|-------|-------------|-----|
| All steps pass but status offline | UI not updating | Check `determineOnlineStatus()` logic |
| Step 4 fails with CORS error | Tauri permissions | Add `"http": {"all": true}` to `tauri.conf.json` |
| Env vars undefined | .env not loaded | Restart `npm run tauri:dev` after editing `.env` |
| Auth fails with 401 | RLS policy issue | Check `supabase_schema.sql` policies |
| Real-time monitor always checking | Infinite loop | Check `useEffect` dependencies |

---

## 🔍 Debug Output Examples

### **✅ Working Configuration**
```
🔍 Starting Cloud Sync Debug Checklist
Step 1: Checking internet access
navigator.onLine: true
Step 2: Checking Supabase client  
Supabase client: [SupabaseClient object]
Step 3: Checking environment variables
URL: https://abc123.supabase.co
KEY: eyJhbGciOi...
Step 4: Pinging Supabase
Ping error: {code: "PGRST116", details: "...relation "_dummy_ping" does not exist"}
Step 5: Checking auth state
Session: {session: {user: {id: "..."}}}
🎯 Final Cloud Status: {isOnline: true, ...}
```

### **❌ Network Failure**
```
🔍 Starting Cloud Sync Debug Checklist
Step 1: Checking internet access
navigator.onLine: true
Step 4: Pinging Supabase
Ping error: TypeError: Failed to fetch
🎯 Final Cloud Status: {isOnline: false, supabaseReachable: false, ...}
```

---

## 🎉 Success Indicators

✅ **All systems green** in debug panel  
✅ **Response time < 500ms** consistently  
✅ **Data appears in Supabase dashboard**  
✅ **Cross-device sync works**  
✅ **No console errors**  

When all these are true, your Supabase implementation is working correctly!

---

## 🔗 Quick Reference

| Function | Location | Purpose |
|----------|------------|---------|
| `window.debugCloudStatus()` | Global | Run complete debug checklist |
| `window.cloudStatusDebug` | Global | Access current cloud status object |
| `CloudDebugPanel` | Settings | Visual debug interface |
| `CloudStatusIndicator` | Any component | Real-time status display |

## 📱 Mobile Testing (if applicable)

For mobile testing, additional considerations:
- Test network transitions (WiFi → Cellular → Offline)
- Verify background sync behavior
- Test with poor network conditions
- Check battery impact of real-time monitoring