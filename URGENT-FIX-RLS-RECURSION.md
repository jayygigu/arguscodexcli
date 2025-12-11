# 🚨 URGENT: Fix Infinite Recursion in RLS Policies

## Problem
You're getting this error:
\`\`\`
infinite recursion detected in policy for relation "messages"
\`\`\`

## Root Cause
The RLS policies in `fix-messages-rls-policies.sql` have a bug where they query the `messages` table within the `messages` table's own policy, causing infinite recursion.

## Solution: Run This Script NOW

**Run this script in your Supabase SQL Editor:**
\`\`\`
scripts/revert-to-simple-policies.sql
\`\`\`

This will:
1. ✅ Remove ALL buggy policies (including the recursive ones)
2. ✅ Restore the simple, working policies
3. ✅ Fix the infinite recursion error immediately

## What the Simple Policies Do

### SELECT Policy
Users can view messages where:
- They are the sender (`sender_id = auth.uid()`)
- OR they own the agency (`agency_id` matches their agency)

### INSERT Policy
Users can send messages as themselves (`sender_id = auth.uid()`)

### UPDATE Policy
Users can update messages where:
- They are the sender
- OR they own the agency

## Why This Works

These simple policies DON'T query the `messages` table within themselves. They only check:
1. The current user's ID
2. The `agencies` table (separate table, no recursion)

## After Running the Script

1. ✅ Refresh your web app
2. ✅ Test sending messages from agency → investigator
3. ✅ Test sending messages from investigator → agency
4. ✅ Both directions should work instantly

## For Your Mobile App

Your mobile app should already work with these policies because they allow:
- Investigators to see messages where `sender_id = their_user_id`
- Investigators to see messages where `agency_id` matches agencies they've interacted with (through the agency owner check)

The key is that both the web app and mobile app query by `agency_id`, and these policies allow that.

## Verification

After running the script, you should see these 3 policies in Supabase:
1. `Users can view messages they are part of` (SELECT)
2. `Users can send messages` (INSERT)
3. `Users can update their messages` (UPDATE)

## DO NOT Run These Scripts
- ❌ `fix-messages-rls-policies.sql` (has recursion bug)
- ❌ `fix-messages-rls-policies-v2.sql` (too complex, not needed)

## Use This Instead
- ✅ `revert-to-simple-policies.sql` (simple, works perfectly)
