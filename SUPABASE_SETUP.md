# Supabase Setup Documentation

## Project Credentials

- **Project Name**: messaging-app-prod
- **Project ID**: tgpfhcwdkkhgmpoy7hen
- **Project URL**: https://tgpfhcwdkkhgmpoy7hen.supabase.co
- **Database**: PostgreSQL
- **Region**: Production

## Environment Variables

Add these to your `.env.local` file:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://tgpfhcwdkkhgmpoy7hen.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
```

## Database Architecture

### Core Tables for Messaging

#### 1. **users** (auth.users reference)
User authentication and account management.

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | UUID | NO | - |
| email | VARCHAR | NO | - |
| (Other auth fields managed by Supabase Auth) | - | - | - |

**Policies**: Authenticated users can read all users

---

#### 2. **profiles**
Extended user profile information.

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | UUID | NO | refs auth.users |
| username | VARCHAR | YES | - |
| avatar_url | VARCHAR | YES | - |
| status | VARCHAR | YES | 'offline' |
| last_seen | TIMESTAMP | YES | - |
| created_at | TIMESTAMP | YES | - |
| updated_at | TIMESTAMP | YES | - |

**RLS Policies**:
- ✅ Anyone can view profiles
- ✅ Users can insert own profile
- ✅ Users can update own profile
- ✅ Users can view their own profile

---

#### 3. **user_presence**
Real-time presence tracking for online status.

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | UUID | NO | gen_random_uuid() |
| user_id | UUID | NO | refs profiles.id |
| is_online | BOOLEAN | YES | false |
| status | VARCHAR | YES | 'offline' |
| last_seen | TIMESTAMP | YES | now() |

**RLS Policies**:
- ✅ Anyone can view presence (for online indicators)
- ✅ Users can insert their own presence
- ✅ Users can update their own presence
- ✅ Users can delete their own presence

**Realtime**: ✅ Enabled

---

#### 4. **direct_messages**
Direct message conversations between users.

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | UUID | NO | uuid_generate_v4() |
| sender_id | UUID | NO | refs auth.users |
| recipient_id | UUID | NO | refs auth.users |
| content | TEXT | NO | - |
| is_read | BOOLEAN | YES | false |
| created_at | TIMESTAMP | YES | CURRENT_TIMESTAMP |
| updated_at | TIMESTAMP | YES | CURRENT_TIMESTAMP |

**RLS Policies**:
- ✅ Users can send messages (INSERT)
- ✅ Users can read their messages (SELECT)
- ✅ Users can update their own messages (UPDATE)
- ✅ Users can delete their own messages (DELETE)

**Realtime**: ✅ Enabled

---

### Channel/Workspace Tables

#### 5. **channels**
Channels for group messaging and collaboration.

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | UUID | NO | gen_random_uuid() |
| name | VARCHAR | NO | - |
| description | VARCHAR | YES | - |
| creator_id | UUID | NO | - |
| created_at | TIMESTAMP | YES | - |
| updated_at | TIMESTAMP | YES | - |
| parent_channel_id | UUID | YES | - |
| parent_id | UUID | YES | - |
| workspace_id | UUID | YES | - |
| is_private | BOOLEAN | YES | false |
| topic | TEXT | YES | - |
| created_by | UUID | YES | - |

**RLS Policies**: Authenticated users can view/create/manage channels

---

#### 6. **channel_members**
Channel membership tracking.

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | UUID | NO | gen_random_uuid() |
| user_id | UUID | NO | refs auth.users |
| channel_id | UUID | NO | refs channels.id |
| role | VARCHAR | YES | 'member' |
| joined_at | TIMESTAMP | YES | now() |

**RLS Policies**:
- ✅ Users can join channels
- ✅ Users can read channel members

---

#### 7. **messages**
Messages in channels.

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | UUID | NO | - |
| user_id | UUID | NO | refs auth.users |
| content | TEXT | NO | - |
| channel_id | UUID | YES | refs channels.id |
| created_at | TIMESTAMP | YES | - |
| updated_at | TIMESTAMP | YES | - |

**RLS Policies**:
- ✅ Messages are readable by everyone
- ✅ Users can insert messages
- ✅ Users can update/delete their own messages

---

#### 8. **message_reactions**
Emoji reactions on messages.

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | UUID | NO | - |
| message_id | UUID | NO | refs messages.id |
| user_id | UUID | NO | refs auth.users |
| emoji | VARCHAR | NO | - |
| created_at | TIMESTAMP | YES | - |

**RLS Policies**:
- ✅ Users can add their reactions
- ✅ Users can update their reaction
- ✅ Users can remove their reactions
- ✅ Authenticated users can read reactions

---

### Calendar Integration Tables

#### 9. **calendars**
User calendars for event management.

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | UUID | NO | - |
| owner_id | UUID | NO | refs auth.users |
| name | VARCHAR | NO | - |
| description | TEXT | YES | - |
| color | VARCHAR | YES | - |
| is_public | BOOLEAN | YES | - |
| created_at | TIMESTAMP | YES | - |
| updated_at | TIMESTAMP | YES | - |

---

#### 10. **calendar_events**
Events within calendars.

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | UUID | NO | - |
| calendar_id | UUID | YES | refs calendars.id |
| title | VARCHAR | NO | - |
| description | TEXT | YES | - |
| start_time | TIMESTAMP | NO | - |
| end_time | TIMESTAMP | NO | - |
| location | VARCHAR | YES | - |
| is_all_day | BOOLEAN | YES | - |
| google_event_id | VARCHAR | YES | - |
| created_by | UUID | NO | - |
| recurrence | VARCHAR | YES | - |
| recurrence_end_date | TIMESTAMP | YES | - |
| metadata_payload | JSON | YES | - |
| created_at | TIMESTAMP | YES | - |
| updated_at | TIMESTAMP | YES | - |

---

#### 11. **calendar_members**
Calendar sharing and permissions.

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | UUID | NO | - |
| calendar_id | UUID | NO | refs calendars.id |
| user_id | UUID | NO | refs auth.users |
| permission | VARCHAR | YES | - |
| added_at | TIMESTAMP | YES | - |

---

#### 12. **calendar_subscriptions**
User subscriptions to calendars.

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | UUID | NO | - |
| calendar_id | UUID | NO | refs calendars.id |
| user_id | UUID | NO | refs auth.users |
| is_visible | BOOLEAN | YES | - |
| subscribed_at | TIMESTAMP | YES | - |

---

### Admin & Session Tables

#### 13. **admin_actions**
Audit log for admin activities.

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | UUID | NO | - |
| admin_id | UUID | NO | - |
| action_type | VARCHAR | NO | - |
| target_type | VARCHAR | NO | - |
| target_id | UUID | NO | - |
| reason | TEXT | YES | - |
| details | VARCHAR | YES | - |
| created_at | TIMESTAMP | NO | now() |

---

#### 14. **device_sessions**
Device session tracking for security.

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | UUID | NO | - |
| user_id | UUID | NO | refs auth.users |
| device_name | VARCHAR | NO | - |
| device_type | VARCHAR | NO | - |
| ip_address | VARCHAR | YES | - |
| user_agent | VARCHAR | YES | - |
| last_active | TIMESTAMP | NO | now() |
| is_active | BOOLEAN | NO | true |
| created_at | TIMESTAMP | NO | now() |

---

## Key Features

### ✅ Real-time Subscriptions
The following tables have real-time enabled:
- `user_presence` - For online status updates
- `direct_messages` - For instant messaging
- `messages` - For channel messages
- `message_reactions` - For reaction updates

### ✅ Row Level Security (RLS)
All tables use RLS to ensure:
- Users can only access their own data
- Private messages are only visible to sender/recipient
- Channel messages visible to members
- Presence data is public (for who's online display)

### ✅ Authentication
- Uses Supabase Auth (PostgreSQL auth.users table)
- JWT tokens for API authentication
- Profile data linked via user ID

## Development Notes

### Presence Polling Strategy
Since free tier doesn't support all real-time features, presence uses polling:
- **Active**: Every 5 seconds
- **Idle**: Every 30 seconds
- Prevents excessive database queries

### Free Tier Limits
- ✅ PostgreSQL database (included)
- ✅ Row Level Security (included)
- ✅ Real-time subscriptions (included, limited)
- ⚠️ No scheduled jobs on free tier (use polling instead)
- ⚠️ Storage limited to 1GB

### Performance Optimization
- Indexes on `user_id`, `sender_id`, `recipient_id`, `channel_id` for fast queries
- Timestamps indexed for sorting/filtering
- Foreign keys for referential integrity

## Useful Queries

### Get user with online status
```sql
SELECT 
  p.id,
  p.username,
  p.avatar_url,
  up.is_online,
  up.status,
  up.last_seen
FROM profiles p
LEFT JOIN user_presence up ON p.id = up.user_id
WHERE p.id = 'user-id';
```

### Get direct message thread
```sql
SELECT * 
FROM direct_messages
WHERE (sender_id = 'user-id' AND recipient_id = 'other-user-id')
   OR (sender_id = 'other-user-id' AND recipient_id = 'user-id')
ORDER BY created_at ASC;
```

### Get unread message count
```sql
SELECT COUNT(*) 
FROM direct_messages
WHERE recipient_id = 'user-id' AND is_read = false;
```

## Troubleshooting

### Presence showing as "Loading"
- Check RLS policies on `user_presence` table
- Verify polling service is running
- Check browser console for errors

### Messages not syncing
- Verify real-time subscriptions are active
- Check direct_messages RLS policies
- Ensure sender_id matches auth.uid()

### Sign-in stuck
- Clear browser cache/localStorage
- Check Supabase auth configuration
- Verify API keys in environment variables

## Related Files
- `.env.example` - Environment variables template
- `src/lib/supabase/` - Supabase client setup
- `src/hooks/useRealtimeSubscription.ts` - Real-time subscription logic
- `src/hooks/useIdlePolling.ts` - Presence polling logic
