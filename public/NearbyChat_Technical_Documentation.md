# NearbyChat - Technical Documentation
## Anonymous Location-Based Public Chat Application

---

## Table of Contents
1. [Project Overview](#1-project-overview)
2. [Technology Stack](#2-technology-stack)
3. [Frontend Architecture](#3-frontend-architecture)
4. [Backend Architecture](#4-backend-architecture)
5. [Database Schema](#5-database-schema)
6. [Screen-by-Screen Breakdown](#6-screen-by-screen-breakdown)
7. [Custom Hooks Explained](#7-custom-hooks-explained)
8. [Real-Time Features](#8-real-time-features)
9. [Design System](#9-design-system)
10. [Key Packages Used](#10-key-packages-used)

---

## 1. Project Overview

**NearbyChat** is an anonymous, location-based public chat application that allows users to:
- Chat with people within a 5km radius
- Create and join public chat groups
- Remain completely anonymous with auto-generated usernames
- Experience real-time messaging and live user counts

### Key Features:
- **No Authentication Required**: Users are assigned random, anonymous usernames
- **Location-Based Discovery**: Groups are filtered by proximity (5km radius)
- **Real-Time Messaging**: Messages appear instantly using WebSocket subscriptions
- **Live User Counts**: Active users are tracked and displayed in real-time
- **Session-Based Identity**: Uses browser sessionStorage for temporary identity
- **Auto-Cleanup**: Inactive sessions and empty groups are automatically removed

---

## 2. Technology Stack

### Frontend Framework
| Technology | Version | Purpose |
|------------|---------|---------|
| **React** | ^18.3.1 | Core UI library for building component-based interfaces |
| **TypeScript** | Latest | Type-safe JavaScript for better development experience |
| **Vite** | Latest | Fast build tool and development server with HMR |

### Styling & UI
| Technology | Version | Purpose |
|------------|---------|---------|
| **Tailwind CSS** | Latest | Utility-first CSS framework for rapid styling |
| **shadcn/ui** | Latest | Pre-built accessible UI components |
| **Lucide React** | ^0.462.0 | Beautiful, consistent icon library |
| **tailwindcss-animate** | ^1.0.7 | Animation utilities for Tailwind |

### Backend & Database
| Technology | Purpose |
|------------|---------|
| **Lovable Cloud (Supabase)** | Backend-as-a-Service for database, real-time, and API |
| **PostgreSQL** | Relational database (via Supabase) |
| **Supabase Realtime** | WebSocket-based real-time data synchronization |

### State Management & Data Fetching
| Technology | Version | Purpose |
|------------|---------|---------|
| **@tanstack/react-query** | ^5.83.0 | Server state management and caching |
| **@supabase/supabase-js** | ^2.89.0 | JavaScript client for Supabase |

### Routing
| Technology | Version | Purpose |
|------------|---------|---------|
| **react-router-dom** | ^6.30.1 | Client-side routing for single-page application |

### Utilities
| Technology | Version | Purpose |
|------------|---------|---------|
| **clsx** | ^2.1.1 | Conditional className utility |
| **tailwind-merge** | ^2.6.0 | Merge Tailwind classes intelligently |
| **class-variance-authority** | ^0.7.1 | Creating component variants |
| **date-fns** | ^3.6.0 | Date manipulation utilities |
| **sonner** | ^1.7.4 | Toast notifications |

---

## 3. Frontend Architecture

### Project Structure
```
src/
├── components/           # Reusable UI components
│   ├── ui/              # shadcn/ui components (Button, Input, etc.)
│   ├── CloudBackground.tsx   # Animated cloud background
│   ├── GlassCard.tsx    # Glassmorphism card component
│   └── NavLink.tsx      # Navigation link component
├── hooks/               # Custom React hooks
│   ├── useSession.ts    # User session management
│   ├── useGroups.ts     # Group fetching and creation
│   ├── useMessages.ts   # Message handling
│   └── useActiveUsers.ts # Live user count tracking
├── pages/               # Screen components
│   ├── SplashScreen.tsx
│   ├── OnboardingScreen.tsx
│   ├── LocationPermissionScreen.tsx
│   ├── GroupsDiscoveryScreen.tsx
│   ├── CreateGroupScreen.tsx
│   └── ChatRoomScreen.tsx
├── lib/                 # Utility functions
│   ├── utils.ts         # General utilities (cn function)
│   └── usernameGenerator.ts # Random username generation
├── integrations/        # External service integrations
│   └── supabase/
│       ├── client.ts    # Supabase client instance
│       └── types.ts     # Auto-generated TypeScript types
├── index.css            # Global styles and design tokens
└── App.tsx              # Main app with routing
```

### Component Architecture
The app follows a **container/presentational** pattern:
- **Pages**: Handle business logic and state
- **Components**: Focus on presentation and reusability
- **Hooks**: Encapsulate complex logic (database operations, real-time subscriptions)

---

## 4. Backend Architecture

### Lovable Cloud (Supabase) Services Used

#### 1. **PostgreSQL Database**
- Stores all persistent data (groups, messages, sessions)
- Uses Row Level Security (RLS) for data protection
- Supports real-time subscriptions

#### 2. **Supabase Realtime**
- WebSocket connections for instant updates
- Listens to `postgres_changes` events
- Enables live message delivery and user count updates

#### 3. **Database Functions**
```sql
-- Cleanup inactive sessions (runs periodically)
CREATE OR REPLACE FUNCTION public.cleanup_inactive_sessions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  DELETE FROM public.active_sessions
  WHERE last_seen < now() - interval '5 minutes';
END;
$function$
```

### API Layer
The app uses **Supabase JavaScript Client** directly from the frontend:
- No custom API endpoints required
- Built-in authentication and authorization via RLS
- Real-time subscriptions handled automatically

---

## 5. Database Schema

### Tables

#### 1. `groups` Table
Stores chat group information:
```sql
CREATE TABLE public.groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  latitude NUMERIC NOT NULL,
  longitude NUMERIC NOT NULL,
  creator_session_id TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
```

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Unique group identifier |
| name | TEXT | Group display name |
| latitude | NUMERIC | Group creation latitude |
| longitude | NUMERIC | Group creation longitude |
| creator_session_id | TEXT | Session ID of creator |
| created_at | TIMESTAMP | Creation timestamp |

#### 2. `messages` Table
Stores chat messages:
```sql
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
  sender_name TEXT NOT NULL,
  content TEXT NOT NULL,
  session_id TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
```

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Unique message identifier |
| group_id | UUID | Reference to parent group |
| sender_name | TEXT | Displayed username |
| content | TEXT | Message text content |
| session_id | TEXT | Sender's session ID |
| created_at | TIMESTAMP | Message timestamp |

#### 3. `active_sessions` Table
Tracks online users:
```sql
CREATE TABLE public.active_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL UNIQUE,
  username TEXT NOT NULL,
  group_id UUID REFERENCES groups(id),
  last_seen TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
```

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Unique session record ID |
| session_id | TEXT | Browser session identifier |
| username | TEXT | Auto-generated username |
| group_id | UUID | Current group (nullable) |
| last_seen | TIMESTAMP | Last heartbeat time |
| created_at | TIMESTAMP | Session creation time |

### Entity Relationship Diagram
```
┌─────────────────┐       ┌─────────────────┐
│     groups      │       │    messages     │
├─────────────────┤       ├─────────────────┤
│ id (PK)         │◄──────│ group_id (FK)   │
│ name            │       │ id (PK)         │
│ latitude        │       │ sender_name     │
│ longitude       │       │ content         │
│ creator_session │       │ session_id      │
│ created_at      │       │ created_at      │
└─────────────────┘       └─────────────────┘
         │
         │
         ▼
┌─────────────────┐
│ active_sessions │
├─────────────────┤
│ id (PK)         │
│ session_id      │
│ username        │
│ group_id (FK)   │
│ last_seen       │
│ created_at      │
└─────────────────┘
```

---

## 6. Screen-by-Screen Breakdown

### Screen 1: Splash Screen (`SplashScreen.tsx`)

**Purpose**: Initial loading screen with branding

**Components Used**:
- `CloudBackground` - Animated floating clouds
- Custom CSS animations

**Logic**:
- Displays app logo and name
- Auto-redirects to onboarding after 2 seconds
- Uses `useNavigate` for programmatic navigation

**Packages**:
- `react-router-dom` (navigation)
- `lucide-react` (Cloud icon)

---

### Screen 2: Onboarding Screen (`OnboardingScreen.tsx`)

**Purpose**: Welcome screen and location permission request

**Components Used**:
- `CloudBackground` - Animated background
- `GlassCard` - Glassmorphism container
- `Button` - Primary action button

**Logic**:
1. Checks if session already exists in `sessionStorage`
2. If exists, redirects to groups discovery
3. Button triggers navigation to location permission

**Packages**:
- `react-router-dom` (navigation)
- `lucide-react` (MapPin, MessageCircle icons)

---

### Screen 3: Location Permission Screen (`LocationPermissionScreen.tsx`)

**Purpose**: Request and handle geolocation permission

**Components Used**:
- `GlassCard` - Permission request card
- `Button` - Allow/Retry button

**Logic**:
```typescript
// Request location permission
navigator.geolocation.getCurrentPosition(
  (position) => {
    const { latitude, longitude } = position.coords;
    // Create session with location
    await createSession(latitude, longitude);
    navigate('/groups');
  },
  (error) => {
    setPermissionState('denied');
  }
);
```

**Key Features**:
- Handles permission granted, denied, and loading states
- Uses `useSession` hook to create anonymous session
- Generates random username via `usernameGenerator.ts`

**Packages**:
- Browser Geolocation API (native)
- `react-router-dom`

---

### Screen 4: Groups Discovery Screen (`GroupsDiscoveryScreen.tsx`)

**Purpose**: Display nearby chat groups within 5km

**Components Used**:
- `GlassCard` - Group list items
- `Button` - Join and Create buttons
- Header with live user count

**Hooks Used**:
- `useSession` - Current user session
- `useGroups` - Fetch and filter groups by distance
- `useActiveUsers` - Live total online count

**Logic**:
```typescript
// Haversine formula for distance calculation
function calculateDistance(lat1, lon1, lat2, lon2): number {
  const R = 6371; // Earth's radius in km
  // ... spherical geometry calculation
  return distanceInKm;
}

// Filter groups within 5km
const nearbyGroups = groups.filter(g => g.distance <= 5);
```

**Real-Time Features**:
- Subscribes to `groups` table changes
- Subscribes to `active_sessions` for user counts
- Polls every 10 seconds for live count updates

**Packages**:
- `@supabase/supabase-js` (real-time subscriptions)
- `lucide-react` (MapPin, Users, Plus icons)

---

### Screen 5: Create Group Screen (`CreateGroupScreen.tsx`)

**Purpose**: Form to create new chat group

**Components Used**:
- `GlassCard` - Form container
- `Input` - Group name input
- `Button` - Create button with loading state

**Logic**:
```typescript
const handleCreate = async () => {
  // Create group in database
  const newGroup = await createGroup(
    groupName,
    session.sessionId,
    session.latitude,
    session.longitude
  );
  
  // Join the newly created group
  await updateSessionGroup(newGroup.id);
  
  // Navigate to chat room
  navigate(`/chat/${newGroup.id}`);
};
```

**Features**:
- Quick suggestion buttons for group names
- Input validation (max 50 characters)
- Loading state during creation

---

### Screen 6: Chat Room Screen (`ChatRoomScreen.tsx`)

**Purpose**: Main chat interface with real-time messaging

**Components Used**:
- `CloudBackground` - Ambient background
- `Input` - Message input
- `Button` - Send, Leave buttons
- `AlertDialog` - Leave confirmation modal
- Message bubbles (own vs others)

**Hooks Used**:
- `useSession` - Current user identity
- `useMessages` - Fetch, send, delete messages
- `useActiveUsers` - Group-specific online count

**Logic Flow**:
```typescript
// On join: Delete previous messages from this user
await deleteUserMessages(session.sessionId);
await updateSessionGroup(groupId);

// Send message
await sendMessage(content, username, sessionId);

// On leave: Delete all messages, send system message
await deleteAllMessages();
await sendSystemMessage(`${username} left the group`);
await updateSessionGroup(null);
```

**Real-Time Features**:
- Subscribes to message `INSERT` events
- Auto-scroll to newest message
- Live "X in chat" counter
- Heartbeat every 20 seconds

**Message Types**:
1. **Own messages**: Blue gradient bubble, right-aligned
2. **Others' messages**: Glassmorphism bubble, left-aligned
3. **System messages**: Centered, muted styling

---

## 7. Custom Hooks Explained

### `useSession.ts`
**Purpose**: Manage anonymous user session

**State Stored in sessionStorage**:
- `nearbyChat_sessionId` - Unique session identifier
- `nearbyChat_username` - Auto-generated display name
- `nearbyChat_latitude` - User's latitude
- `nearbyChat_longitude` - User's longitude

**Functions**:
| Function | Purpose |
|----------|---------|
| `createSession(lat, lon)` | Create new session with location |
| `updateSessionGroup(groupId)` | Join or leave a group |
| `heartbeat()` | Update `last_seen` timestamp |
| `endSession()` | Delete session and cleanup |
| `checkAndDeleteEmptyGroup(groupId)` | Remove group if no users left |

---

### `useGroups.ts`
**Purpose**: Fetch and manage chat groups

**Key Features**:
- **Haversine Formula**: Calculate spherical distance
- **5km Filter**: Only show nearby groups
- **Active User Count**: Join with `active_sessions` table
- **Real-Time Updates**: Subscribe to group changes

**Functions**:
| Function | Purpose |
|----------|---------|
| `fetchGroups()` | Get all groups with distances |
| `createGroup(name, sessionId, lat, lon)` | Create new group |
| `refetch()` | Manually refresh group list |

---

### `useMessages.ts`
**Purpose**: Handle chat messages with real-time sync

**State**:
- `messages` - Array of messages with ownership flag
- `isLoading` - Loading state

**Functions**:
| Function | Purpose |
|----------|---------|
| `sendMessage(content, senderName, sessionId)` | Send new message |
| `sendSystemMessage(content)` | Send system notification |
| `deleteUserMessages(sessionId)` | Delete specific user's messages |
| `deleteAllMessages()` | Clear all messages in group |

**Real-Time Subscription**:
```typescript
supabase
  .channel(`messages-${groupId}`)
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'messages',
    filter: `group_id=eq.${groupId}`,
  }, (payload) => {
    // Add new message to state
  })
  .subscribe();
```

---

### `useActiveUsers.ts`
**Purpose**: Track live online user counts

**Returns**:
- `totalActiveUsers` - Total users online (app-wide)
- `groupActiveUsers` - Users in current group

**Logic**:
- Counts sessions where `last_seen` is within 5 minutes
- Polls every 10 seconds for accuracy
- Subscribes to `active_sessions` real-time changes

---

## 8. Real-Time Features

### How Real-Time Works

1. **Supabase Realtime** uses PostgreSQL's `LISTEN/NOTIFY`
2. Client subscribes to specific table changes
3. When data changes, server pushes to connected clients

### Implementation Pattern:
```typescript
useEffect(() => {
  // Create unique channel
  const channel = supabase
    .channel('channel-name')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'table_name' },
      (payload) => {
        // Handle change
      }
    )
    .subscribe();

  // Cleanup on unmount
  return () => {
    supabase.removeChannel(channel);
  };
}, []);
```

### Real-Time Events Used:
| Table | Events | Purpose |
|-------|--------|---------|
| `messages` | INSERT | New message notification |
| `groups` | INSERT, UPDATE, DELETE | Group list updates |
| `active_sessions` | * | User count changes |

---

## 9. Design System

### Color Palette (HSL)
```css
--primary: 199 89% 48%;        /* Sky blue */
--primary-light: 199 89% 65%;  /* Light sky blue */
--background: 200 60% 98%;     /* Off-white sky */
--foreground: 210 40% 20%;     /* Dark blue-gray */
--muted: 200 30% 94%;          /* Light gray */
--destructive: 0 84% 60%;      /* Red for warnings */
```

### Typography
- **Font Family**: Nunito (Google Fonts)
- **Weights Used**: 400, 500, 600, 700, 800

### Glassmorphism Effects
```css
.glass-card {
  background: rgba(255, 255, 255, 0.6);
  backdrop-filter: blur(24px);
  border: 1px solid rgba(255, 255, 255, 0.3);
  box-shadow: 0 8px 32px rgba(14, 165, 233, 0.1);
}
```

### Custom Animations
| Animation | Duration | Purpose |
|-----------|----------|---------|
| `float` | 6-9s | Cloud floating effect |
| `fade-in-up` | 0.6s | Element entry animation |
| `pulse-soft` | 3s | Subtle pulse effect |
| `scale-in` | 0.4s | Modal/card appearance |

---

## 10. Key Packages Used

### UI Component Library
```json
{
  "@radix-ui/react-dialog": "Dialog/Modal primitives",
  "@radix-ui/react-alert-dialog": "Confirmation dialogs",
  "@radix-ui/react-slot": "Component composition"
}
```

### Why shadcn/ui?
- **Accessible**: Built on Radix UI primitives
- **Customizable**: Source code in project
- **TypeScript**: Full type support
- **Tailwind**: Seamless integration

### Database Client
```json
{
  "@supabase/supabase-js": "^2.89.0"
}
```
- Handles authentication, database, real-time
- TypeScript types auto-generated
- Works with Row Level Security

### State Management
```json
{
  "@tanstack/react-query": "^5.83.0"
}
```
- Server state management
- Caching and background refetching
- Optimistic updates support

---

## Summary

**NearbyChat** is built with a modern, production-ready stack:

| Layer | Technology | Why |
|-------|------------|-----|
| **Frontend** | React + TypeScript | Type-safe, component-based UI |
| **Styling** | Tailwind + shadcn/ui | Rapid, consistent styling |
| **Backend** | Lovable Cloud (Supabase) | Zero-config database + real-time |
| **Real-Time** | Supabase Realtime | WebSocket-based live updates |
| **Routing** | React Router | Client-side SPA navigation |
| **Build** | Vite | Fast HMR development |

The architecture prioritizes:
- **Simplicity**: Minimal backend code
- **Real-Time**: Instant message delivery
- **Privacy**: Anonymous sessions
- **Performance**: Optimized subscriptions and polling
- **UX**: Beautiful glassmorphism design

---

*Document generated for NearbyChat v1.0*
*Last updated: December 2024*
