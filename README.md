# Messaging App Web

A modern real-time messaging application built with **Next.js 15**, **React 19**, **TypeScript**, **Supabase**, and **Zustand**.

## 🎯 Features

### ✅ Core Messaging
- **Real-time Messaging** - Instant message delivery with Supabase Realtime
- **Direct Messaging** - One-on-one conversations with read status
- **Channel Management** - Create parent and sub-channels
- **Channel Hierarchy** - Expandable/collapsible channel tree
- **Message Features** - Send, delete, and edit messages
- **Message Reactions** - React with emojis (with recent emoji history)

### ✅ Presence & Status
- **Online Status** - Real-time user presence tracking
- **Last Seen** - Track when users were last active
- **Status Messages** - Set custom status
- **Device Tracking** - Session management across devices

### ✅ User Experience
- **User Authentication** - Email/password signup and login
- **User Profiles** - View and edit user profiles
- **Responsive Design** - Works on desktop, tablet, and mobile
- **Dark Theme** - Beautiful dark mode UI

## 🛠️ Tech Stack

| Category | Technology |
|----------|-----------|
| **Frontend** | Next.js 15, React 19, TypeScript |
| **Styling** | Tailwind CSS |
| **State Management** | Zustand |
| **Database** | Supabase (PostgreSQL) |
| **Authentication** | Supabase Auth |
| **Real-time** | Supabase Realtime & Polling |
| **API** | Supabase REST & Realtime APIs |

## 📁 Project Structure

```
messaging-app-web/
├── src/
│   ├── app/                    # Next.js app router
│   │   ├── auth/              # Authentication pages
│   │   ├── dashboard/         # Dashboard layout
│   │   ├── dashboard/channel/ # Channel pages
│   │   └── page.tsx           # Home page
│   ├── components/
│   │   ├── Sidebar/           # Navigation
│   │   ├── Chat/              # Chat UI
│   │   ├── Messages/          # Message display
│   │   └── ...
│   ├── hooks/
│   │   ├── usePresence.ts     # Presence tracking
│   │   ├── useRealtimeSubscription.ts
│   │   ├── useIdlePolling.ts
│   │   └── ...
│   ├── lib/
│   │   ├── supabase/          # Supabase client & utilities
│   │   ├── types/             # TypeScript definitions
│   │   └── utils/             # Helper functions
│   ├── store/                 # Zustand store
│   └── middleware.ts          # Next.js middleware
├── SUPABASE_SETUP.md          # Database schema documentation
├── .env.example               # Environment template
├── .gitignore
└── package.json
```

## 🚀 Getting Started

### Prerequisites

- **Node.js** 18+
- **npm**, **yarn**, or **pnpm**
- **Supabase** account ([Create free account](https://supabase.com))
- **Git** installed

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/NZmikeyG/messaging-app-web.git
cd messaging-app-web
```

2. **Install dependencies**
```bash
npm install
# or
yarn install
```

3. **Set up environment variables**
```bash
cp .env.example .env.local
```

4. **Edit `.env.local` with your Supabase credentials**
```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

Get these from: [Supabase Dashboard](https://app.supabase.com) → Settings → API

5. **Set up Supabase database**

See [SUPABASE_SETUP.md](./SUPABASE_SETUP.md) for complete database schema and setup instructions.

Required tables:
- `profiles` - User profiles
- `channels` - Message channels
- `messages` - Chat messages
- `direct_messages` - Private messages
- `user_presence` - Online status
- `message_reactions` - Message reactions
- `conversations` - DM threads

6. **Run development server**
```bash
npm run dev
```

7. **Open in browser**
```
http://localhost:3000
```

## 📝 Available Scripts

```bash
npm run dev          # Start development server (hot-reload)
npm run build        # Build for production
npm start            # Start production server
npm run lint         # Run ESLint
npm run type-check   # Run TypeScript type checking
```

## 🔑 Environment Variables

Create `.env.local` in the root directory:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

⚠️ **Important**: Never commit `.env.local` to version control! It's in `.gitignore` for security.

## 📚 How to Use

### Create a Channel
1. Click **"+ Create channel"** in the sidebar
2. Enter channel name
3. Click **Create**

### Join/Browse Channels
1. See list in sidebar
2. Click channel to open chat
3. Click ▶ arrow to expand sub-channels

### Send a Message
1. Select a channel or direct message
2. Type message in input box
3. Press Enter or click Send

### React to Messages
1. Hover over a message
2. Click **🙂 emoji button**
3. Select emoji from picker
4. Your reaction appears on the message

### Delete a Message
1. Hover over your message
2. Click **⋯ menu button**
3. Click **🗑️ Delete**

### Direct Messaging
1. Click **Direct Messages** in sidebar
2. Select or create new conversation
3. Start typing and send

## 🔧 Configuration

### Supabase Tables Schema

For complete database schema, see [SUPABASE_SETUP.md](./SUPABASE_SETUP.md)

**Quick reference:**

```sql
-- profiles
id (uuid), username (text), avatar_url (text), status (varchar), 
last_seen (timestamp), created_at (timestamp)

-- channels
id (uuid), name (text), description (text), creator_id (uuid),
parent_id (uuid), workspace_id (uuid), is_private (boolean),
created_at (timestamp)

-- messages
id (uuid), channel_id (uuid), user_id (uuid), content (text),
created_at (timestamp), updated_at (timestamp)

-- direct_messages
id (uuid), sender_id (uuid), recipient_id (uuid), content (text),
is_read (boolean), created_at (timestamp)

-- user_presence
id (uuid), user_id (uuid), is_online (boolean), status (varchar),
last_seen (timestamp)

-- message_reactions
id (uuid), message_id (uuid), user_id (uuid), emoji (text),
created_at (timestamp)
```

## 🐛 Known Issues & Troubleshooting

### 🔴 Username shows "Loading..." in DM window
**Status**: In Progress  
**Cause**: Profile query delay or missing RLS policy  
**Workaround**: Refresh page or wait for connection  
**Debug**: Check browser console for errors

### 🔴 Profile loading slow after time
**Status**: In Progress  
**Cause**: Connection pooling or idle timeout  
**Workaround**: Close and reopen DM window  
**Debug**: Monitor network requests in DevTools

### 🔴 Sign-in stuck on signing in screen
**Status**: In Progress  
**Cause**: Presence initialization error  
**Workaround**: Clear browser cache and try again  
**Debug**: Look for `[PRESENCE] Init error` in console

### 🔴 Presence error: `{}` (empty object)
**Status**: In Progress  
**Cause**: Presence table RLS policy or initialization  
**Workaround**: Manually set presence in database  
**Debug**: Check `user_presence` table RLS policies

### Realtime not updating
- Verify Supabase Realtime is enabled on tables
- Check network connection
- Review browser console for subscription errors
- Check RLS policies allow SELECT access

### Messages not syncing
- Verify direct_messages RLS policies
- Ensure sender_id matches auth.uid()
- Check Supabase real-time subscriptions are active

### Cannot create channels
- Verify auth is working (user logged in)
- Check channels table RLS policies
- Ensure user has permission to create channels

## 🔒 Security

- **Row Level Security (RLS)** enabled on all tables
- **Users** can only access their own data
- **Private messages** only visible to sender/recipient
- **Channel messages** visible to members only
- **Admin actions** logged in audit table
- **Device sessions** tracked for security
- **Environment variables** stored securely (.env.local in .gitignore)

## 📊 Database Documentation

For comprehensive database schema, RLS policies, and useful queries, see:
📖 [SUPABASE_SETUP.md](./SUPABASE_SETUP.md)

Includes:
- Complete table schemas
- RLS policy details
- Relationships & constraints
- Realtime configuration
- Performance tips
- Useful SQL queries
- Troubleshooting guide

## 🤝 Contributing

Contributions are welcome! To contribute:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 🐛 Bug Reports

Found a bug? Please open an issue on GitHub with:

- Description of the bug
- Steps to reproduce
- Expected vs actual behavior
- Screenshots (if applicable)
- Browser & OS info

Known issues tracked in [Troubleshooting](#-known-issues--troubleshooting) section.

## 💡 Feature Requests

Have an idea? Open an issue with the label "enhancement" and describe:

- What you want to add
- Why it would be useful
- How it should work

## 🚧 Roadmap

- [ ] Typing indicators
- [ ] Message search
- [ ] File uploads & sharing
- [ ] Voice/video calls
- [ ] Mobile app (React Native)
- [ ] Dark/light mode toggle
- [ ] Notification system
- [ ] Message threading
- [ ] Custom emojis
- [ ] Calendar integration

## 📄 License

This project is private and not licensed for public use.

## 👥 Team

- **Developer**: NZmikeyG

## 📞 Support & Contact

For issues and questions:

1. 📖 Check [SUPABASE_SETUP.md](./SUPABASE_SETUP.md) troubleshooting section
2. 🔍 Review browser console for error messages
3. 📊 Check Supabase dashboard for database issues
4. 💬 Open a GitHub issue with details

**Repository**: https://github.com/NZmikeyG/messaging-app-web  
**Issues**: https://github.com/NZmikeyG/messaging-app-web/issues

## 🙏 Acknowledgments

- **Next.js** - React framework
- **Supabase** - Backend as a Service
- **Tailwind CSS** - Utility CSS framework
- **Zustand** - State management
- **React 19** - UI library

---

**Last Updated**: December 3, 2025  
**Version**: 0.1.0-dev  
**Status**: 🔴 Beta (debugging presence & auth issues)

Built with ❤️ using Next.js and Supabase. Making real-time communication simple! 🚀
