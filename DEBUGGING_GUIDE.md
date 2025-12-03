# Debugging Guide - Messaging App Issues

## 🔍 Issue Analysis & Fixes

### Issue #1: Username shows "Loading..." in DM window

**Symptoms:**
- When you open a direct message conversation, the other user's name shows "Loading..."
- The profile eventually loads but with delay

**Root Cause:**
- `fetchOtherUser` runs but component renders before data arrives
- Missing error handling for failed profile queries
- Profile query doesn't have proper fallback

**Fix:**
```typescript
// src/app/dashboard/dm/[userId]/page.tsx

useEffect(() => {
  if (!profile?.id || !userId) return;
  
  fetchOtherUser();
  
  // Add timeout to prevent infinite loading
  const timeout = setTimeout(() => {
    if (!otherUser) {
      setError('User profile failed to load');
      setOtherUser(null);
    }
  }, 5000);
  
  return () => clearTimeout(timeout);
}, [profile?.id, userId]);
```

**Key Changes:**
- Add timeout (5 seconds) to prevent infinite "Loading..." state
- Properly handle null profile results
- Add explicit error message when profile fails to load

---

### Issue #2: Profile loading slow after time

**Symptoms:**
- After several minutes, opening a profile becomes very slow
- Multiple requests pile up in network tab
- Browser memory usage increases

**Root Cause:**
- Real-time subscriptions not properly cleaning up
- Multiple subscriptions stacking on top of each other
- Memory leak from unreturned subscription cleanup

**Fix:**
```typescript
// src/hooks/usePresence.ts

export const useUserPresenceList = () => {
  const subscriptionRef = useRef<RealtimeChannel | null>(null);
  const fetchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // ... setup code ...

    // CRITICAL: Return proper cleanup function
    return () => {
      // Always clean up subscription
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
        subscriptionRef.current = null;
      }
      // Always clean up timeout
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
        fetchTimeoutRef.current = null;
      }
    };
  }, []);
};
```

**Key Changes:**
- Set subscription/timeout refs to `null` after cleanup
- Ensure cleanup runs on component unmount
- Add null checks before using refs

---

### Issue #3: Sign-in stuck on "Signing in" screen

**Symptoms:**
- Login button clicked but page stays on signing in screen
- Redirect to dashboard never happens
- Console shows `[PRESENCE] Init error: {}` without details

**Root Cause:**
- `usePresence` hook fails silently with empty error object
- No userId available yet when usePresence tries to initialize
- Catch block doesn't properly extract error message

**Fix:**
```typescript
// src/hooks/usePresence.ts

export const usePresence = (userId: string | undefined) => {
  const setPresence = useUserStore((state) => state.setPresence);
  const setError = useUserStore((state) => state.setError);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isCleaningUpRef = useRef(false);

  useEffect(() => {
    // CRITICAL: Return early if no userId
    if (!userId) {
      console.log('⚠️ [PRESENCE] No userId provided, skipping presence update');
      return;
    }

    console.log('✅ [PRESENCE] Initializing for userId:', userId);

    const updatePresence = async () => {
      try {
        const now = new Date().toISOString();
        
        const { error: upsertError } = await supabase
          .from('user_presence')
          .upsert(
            { user_id: userId, is_online: true, last_seen: now, status: 'online' },
            { onConflict: 'user_id' }
          );

        // CRITICAL: Check for error BEFORE throwing
        if (upsertError) {
          console.error('❌ [PRESENCE] Supabase upsert error:', upsertError);
          throw new Error(upsertError.message || 'Unknown upsert error');
        }

        console.log('✅ [PRESENCE] Presence updated successfully for:', userId);
        setPresence({
          user_id: userId,
          is_online: true,
          last_seen: now,
          status: 'online'
        });
      } catch (err) {
        // CRITICAL: Properly extract error message
        const errorMessage = err instanceof Error ? err.message : String(err) || 'Unknown error';
        console.error('❌ [PRESENCE] Error updating presence:', errorMessage);
        setError(errorMessage);
      }
    };

    // Call immediately on mount
    updatePresence();

    // Set up heartbeat
    heartbeatIntervalRef.current = setInterval(updatePresence, 30000);

    return () => {
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
        heartbeatIntervalRef.current = null;
      }

      if (!isCleaningUpRef.current) {
        isCleaningUpRef.current = true;

        // Mark offline
        const markOffline = async () => {
          try {
            const now = new Date().toISOString();
            const { error: updateError } = await supabase
              .from('user_presence')
              .update({ is_online: false, last_seen: now, status: 'offline' })
              .eq('user_id', userId);

            if (updateError) throw updateError;
            
            console.log('✅ [PRESENCE] User marked offline:', userId);
          } catch (err) {
            console.error('❌ [PRESENCE] Error marking offline:', err);
          } finally {
            isCleaningUpRef.current = false;
          }
        };

        markOffline();
      }
    };
  }, [userId, setPresence, setError]);
};
```

**Key Changes:**
- Early return if no userId (prevents error)
- Proper error extraction with fallback messages
- Console logging with emojis for easier debugging
- Explicit error message from Supabase or default message
- Calls updatePresence immediately on mount

---

### Issue #4: Presence error: `{}` (empty object)

**Symptoms:**
- Console shows `❌ [PRESENCE] Init error: {}`
- No actual error details provided
- Hard to debug the real issue

**Root Cause:**
- Error is being caught but not properly logged
- Empty error object means catch block receives wrong type
- Supabase error not being checked before throwing

**Fix:**
```typescript
// Add comprehensive error logging

const logPresenceError = (context: string, error: unknown) => {
  if (error instanceof Error) {
    console.error(`❌ [PRESENCE] ${context}:`, error.message);
  } else if (typeof error === 'object' && error !== null) {
    console.error(`❌ [PRESENCE] ${context}:`, JSON.stringify(error, null, 2));
  } else {
    console.error(`❌ [PRESENCE] ${context}:`, String(error));
  }
};

// In usePresence hook:
try {
  const { error: upsertError, data } = await supabase
    .from('user_presence')
    .upsert(...);

  if (upsertError) {
    logPresenceError('Supabase upsert failed', upsertError);
    throw upsertError;
  }
  
  console.log('✅ [PRESENCE] Data upserted:', data);
} catch (err) {
  logPresenceError('Presence update failed', err);
  setError(err instanceof Error ? err.message : 'Failed to update presence');
}
```

**Key Changes:**
- Proper error logging helper function
- Check Supabase error response before throwing
- Log actual error details (message, code, etc.)
- Consistent error message format

---

## 🔧 Quick Fix Checklist

### Step 1: Fix the usePresence Hook
- [ ] Replace `src/hooks/usePresence.ts` with corrected version
- [ ] Add early return for missing userId
- [ ] Add proper error extraction
- [ ] Add console logging
- [ ] Ensure cleanup returns are set to null

### Step 2: Fix the DM Page  
- [ ] Add timeout for profile loading in `src/app/dashboard/dm/[userId]/page.tsx`
- [ ] Show loading state max 5 seconds then error
- [ ] Add fallback for missing profile data

### Step 3: Fix Real-time Subscriptions
- [ ] Search for all `.subscribe()` calls in hooks
- [ ] Ensure all cleanup functions properly unsubscribe
- [ ] Set refs to null after unsubscribe
- [ ] Test with React DevTools Profiler to check memory

### Step 4: Initialize Presence on Dashboard Load
- [ ] Create or update `src/app/dashboard/layout.tsx`
- [ ] Call `usePresence(userId)` at top level
- [ ] Ensure userId is available from auth state

---

## 🧪 Testing Checklist

### Test 1: Authentication Flow
```
1. Clear browser cache (Ctrl+Shift+Delete)
2. Hard refresh (Ctrl+Shift+R)
3. Sign up new user → Should redirect to dashboard
4. Check console for "✅ [PRESENCE] Initializing for userId: ..."
5. User should show "Online" immediately
```

### Test 2: Direct Messages
```
1. From user A, send DM to user B
2. Check: User B's name loads within 2 seconds (not "Loading...")
3. Open user B's profile: Should load instantly
4. Wait 5 minutes, open profile again: Should still be fast
```

### Test 3: Presence Updates
```
1. Open 2 browser windows (A and B)
2. Log in as different users in each
3. In A, check DM list: B should show "Online" with green dot
4. Refresh B's page: Should stay "Online"
5. Close B's browser: A should show B as "Offline" within 30 seconds
```

### Test 4: Memory Leaks
```
1. Open DevTools → Memory tab
2. Take heap snapshot
3. Open/close DM threads 5-10 times
4. Force garbage collection
5. Take another snapshot
6. Compare: Should not show massive increase
```

---

## 🔍 Debugging Commands

### Check if presence is updating in database:
```sql
SELECT user_id, is_online, last_seen, updated_at 
FROM user_presence 
ORDER BY updated_at DESC 
LIMIT 10;
```

### Check for stuck subscriptions:
```typescript
// In browser console
const sub = supabase.channel('test');
console.log(sub.state); // Should show subscription state
```

### Monitor presence logs:
```typescript
// Add this to dashboard layout to see all presence logs
useEffect(() => {
  const handleLog = (message: string) => {
    if (message.includes('[PRESENCE]')) {
      console.log(message);
    }
  };

  // Listen to console for debugging
  console.log('🔍 Presence logging enabled');
}, []);
```

---

## 📊 Expected Console Output

**After successful login:**
```
✅ [PRESENCE] Initializing for userId: a1b2c3d4...
✅ [PRESENCE] Presence updated successfully for: a1b2c3d4...
✅ [PRESENCE] User marked offline: a1b2c3d4...
```

**If there's an error:**
```
❌ [PRESENCE] No userId provided, skipping presence update
❌ [PRESENCE] Supabase upsert error: {code: "...", message: "..."}
❌ [PRESENCE] Error updating presence: Detailed error message here
```

---

## 🚀 After Applying Fixes

1. **Commit changes:**
```bash
git add .
git commit -m "fix: Complete presence initialization and profile loading issues"
git push
```

2. **Hard refresh app:**
```
Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
```

3. **Test all 4 scenarios** in Testing Checklist above

4. **Monitor console** for the expected output

---

## 📞 If Issues Persist

Check these in order:

1. **Browser console** for full error messages
2. **Supabase SQL Editor** to verify user_presence table has data
3. **Network tab** to see actual API responses
4. **React DevTools** to check component props and state
5. **Chrome DevTools** → Application → Local Storage for auth token

---

**Last Updated**: December 3, 2025  
**Version**: 1.0 - Complete Debug Guide
