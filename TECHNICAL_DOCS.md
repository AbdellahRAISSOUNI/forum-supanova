# Forum Supanova - Technical Documentation

## New Components & APIs

### 🧩 **New Components**

#### 1. **RoomStatusIndicator**
**File**: `src/components/RoomStatusIndicator.tsx`

**Purpose**: Displays real-time room status, equipment health, and queue information.

**Props**:
```typescript
interface RoomStatusIndicatorProps {
  roomId?: string;           // Specific room ID (optional)
  showDetails?: boolean;     // Show detailed information (default: true)
  compact?: boolean;         // Compact view mode (default: false)
  refreshInterval?: number;  // Auto-refresh interval in ms (default: 10000)
}
```

**Features**:
- Real-time room status (available, in use, waiting, maintenance)
- Equipment monitoring (computer, microphone, camera, lighting)
- Queue statistics and wait times
- Committee member information
- Responsive design with compact and full modes

**Usage**:
```tsx
// Full view
<RoomStatusIndicator roomId="company123" />

// Compact view
<RoomStatusIndicator roomId="company123" compact={true} />

// Auto-refresh every 15 seconds
<RoomStatusIndicator refreshInterval={15000} />
```

#### 2. **AdvancedQueueManagement**
**File**: `src/components/AdvancedQueueManagement.tsx`

**Purpose**: Provides advanced queue management controls for committee members.

**Props**:
```typescript
interface AdvancedQueueManagementProps {
  onQueueUpdate?: () => void;  // Callback when queue is updated
  compact?: boolean;           // Compact view mode (default: false)
}
```

**Features**:
- Manual queue reordering
- Priority override system
- Queue control operations (pause, resume, emergency, clear)
- Student notes management
- Real-time statistics
- Emergency call functionality

**Usage**:
```tsx
<AdvancedQueueManagement 
  onQueueUpdate={() => refetch()} 
  compact={false} 
/>
```

### 🔌 **New API Endpoints**

#### 1. **Room Status API**
**Endpoint**: `/api/rooms/status`

**Methods**:
- `GET` - Retrieve room status
- `PATCH` - Update room status (committee members only)

**GET Parameters**:
```typescript
// Query parameters
{
  room?: string;  // Specific room ID (optional)
}
```

**GET Response**:
```typescript
interface RoomStatusResponse {
  roomStatus?: RoomStatus;      // Single room (if room param provided)
  roomStatuses?: RoomStatus[];  // All rooms (if no room param)
}

interface RoomStatus {
  roomId: string;
  roomName: string;
  companyName: string;
  status: 'available' | 'in_use' | 'waiting' | 'maintenance';
  statusMessage: string;
  estimatedDuration: number;
  currentInterview: {
    studentName: string;
    startedAt: string;
  } | null;
  committeeMember: {
    name: string;
    email: string;
  } | null;
  queueStats: {
    totalWaiting: number;
    estimatedWaitTime: number;
  };
  equipmentStatus: {
    computer: 'operational' | 'warning' | 'error';
    microphone: 'operational' | 'warning' | 'error';
    camera: 'operational' | 'warning' | 'error';
    lighting: 'operational' | 'warning' | 'error';
  };
  lastUpdated: string;
}
```

**PATCH Request Body**:
```typescript
{
  status?: 'available' | 'in_use' | 'waiting' | 'maintenance';
  statusMessage?: string;
  equipmentStatus?: Partial<RoomStatus['equipmentStatus']>;
}
```

#### 2. **Advanced Queue Management API**
**Endpoint**: `/api/committee/queue/management`

**Methods**:
- `GET` - Retrieve queue management data
- `POST` - Perform queue management actions

**GET Response**:
```typescript
interface QueueManagementData {
  company: {
    _id: string;
    name: string;
    room: string;
    estimatedDuration: number;
  };
  currentInterview: {
    interviewId: string;
    studentName: string;
    studentEmail: string;
    studentPhone: string;
    studentStatus: string;
    opportunityType: string;
    startedAt: string;
  } | null;
  waitingQueue: Array<{
    interviewId: string;
    position: number;
    studentName: string;
    studentEmail: string;
    studentPhone: string;
    studentStatus: string;
    opportunityType: string;
    joinedAt: string;
    priorityScore: number;
    estimatedWaitTime: number;
  }>;
  statistics: {
    totalWaiting: number;
    averagePriorityScore: number;
    oldestWaitTime: string | null;
    todayCompleted: number;
    averageDuration: number;
    estimatedNextCall: number;
  };
}
```

**POST Request Body**:
```typescript
{
  action: 'reorder' | 'priority_override' | 'pause_queue' | 'resume_queue' | 
          'emergency_mode' | 'clear_queue' | 'add_notes';
  interviewId?: string;      // Required for reorder, priority_override, add_notes
  newPosition?: number;      // Required for reorder
  notes?: string;           // Required for add_notes
}
```

#### 3. **Enhanced Committee Statistics API**
**Endpoint**: `/api/committee/stats`

**Method**: `GET`

**Query Parameters**:
```typescript
{
  time?: 'today' | 'all';  // Time filter (default: 'today')
}
```

**Response**:
```typescript
interface CommitteeStatsResponse {
  stats: {
    timeFilter: 'today' | 'all';
    company: {
      name: string;
      room: string;
      estimatedDuration: number;
    };
    main: {
      completed: number;
      averageDuration: number;
      currentInterview: {
        studentName: string;
        studentStatus: string;
        duration: number;
      } | null;
    };
    week: {
      completed: number;
      averageDuration: number;
    };
    queue: {
      waiting: number;
      inProgress: number;
    };
    distribution: {
      opportunities: Record<string, number>;
      studentStatus: Record<string, number>;
    };
  };
}
```

#### 4. **Enhanced Committee History API**
**Endpoint**: `/api/committee/history`

**Method**: `GET`

**Query Parameters**:
```typescript
{
  page?: number;        // Page number (default: 1)
  limit?: number;       // Items per page (default: 20)
  status?: string;      // Filter by status (completed, passed, cancelled)
  date?: string;        // Filter by date (YYYY-MM-DD format)
}
```

**Response**:
```typescript
interface CommitteeHistoryResponse {
  interviews: Array<{
    id: string;
    studentName: string;
    studentEmail: string;
    studentStatus: string;
    opportunityType: string;
    status: string;
    joinedAt: string;
    startedAt: string;
    completedAt: string | null;
    passedAt: string | null;
    activityDate: string;  // Most recent activity timestamp
    duration: number | null;
    queuePosition: number;
    priorityScore: number;
  }>;
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  stats: Record<string, { count: number; averageDuration: number | null }>;
}
```

### 🗄️ **Database Schema Updates**

#### 1. **Interview Model Enhancements**
```typescript
// New fields added
interface Interview {
  // ... existing fields
  activityDate?: Date;        // Most recent activity timestamp
  equipmentStatus?: {         // Equipment status during interview
    computer: string;
    microphone: string;
    camera: string;
    lighting: string;
  };
  notes?: string;            // Committee member notes
  priorityOverride?: boolean; // Emergency priority flag
}
```

#### 2. **User Model Updates**
```typescript
// Enhanced committee member fields
interface User {
  // ... existing fields
  assignedRoom?: string;     // Room assignment for committee members
  equipmentAccess?: string[]; // Equipment access permissions
}
```

#### 3. **Company Model Enhancements**
```typescript
// Room management fields
interface Company {
  // ... existing fields
  roomStatus?: 'available' | 'in_use' | 'waiting' | 'maintenance';
  equipmentStatus?: {
    computer: 'operational' | 'warning' | 'error';
    microphone: 'operational' | 'warning' | 'error';
    camera: 'operational' | 'warning' | 'error';
    lighting: 'operational' | 'warning' | 'error';
  };
  lastMaintenance?: Date;
}
```

### 🔧 **Configuration & Environment**

#### 1. **Environment Variables**
```bash
# Existing variables
MONGODB_URI=your_mongodb_connection_string
NEXTAUTH_SECRET=your_nextauth_secret

# Optional new variables for advanced features
QUEUE_REFRESH_INTERVAL=5000        # Queue refresh interval (ms)
ROOM_STATUS_REFRESH_INTERVAL=10000 # Room status refresh interval (ms)
EMERGENCY_QUEUE_TIMEOUT=300000     # Emergency queue timeout (ms)
```

#### 2. **Database Indexes**
```javascript
// Recommended indexes for performance
db.interviews.createIndex({ "companyId": 1, "status": 1, "updatedAt": -1 });
db.interviews.createIndex({ "companyId": 1, "completedAt": -1 });
db.interviews.createIndex({ "companyId": 1, "createdAt": -1 });
db.users.createIndex({ "assignedRoom": 1, "role": 1 });
db.companies.createIndex({ "room": 1, "isActive": 1 });
```

### 🚀 **Performance Optimizations**

#### 1. **React Query Configuration**
```typescript
// Recommended query configurations
const queueQuery = {
  queryKey: ['committee-queue'],
  refetchInterval: 3000,  // 3 seconds for real-time updates
  staleTime: 2000,        // 2 seconds stale time
};

const statsQuery = {
  queryKey: ['committee-stats', timeFilter],
  refetchInterval: 10000, // 10 seconds for statistics
  staleTime: 5000,        // 5 seconds stale time
};

const historyQuery = {
  queryKey: ['committee-history', page, filters],
  refetchInterval: 30000, // 30 seconds for history
  staleTime: 10000,       // 10 seconds stale time
};
```

#### 2. **Component Optimization**
- Use `React.memo` for expensive components
- Implement proper dependency arrays in `useEffect`
- Use `useCallback` for event handlers
- Optimize re-renders with proper state management

### 🔒 **Security Considerations**

#### 1. **Access Control**
- Committee members can only access their assigned room
- Room status updates require committee role
- Queue management actions are logged for audit

#### 2. **Data Validation**
- All API inputs validated with Zod schemas
- SQL injection prevention with parameterized queries
- XSS protection with proper input sanitization

#### 3. **Rate Limiting**
- API endpoints have built-in rate limiting
- Queue operations limited to prevent abuse
- Emergency actions have additional restrictions

### 📱 **Mobile Optimization**

#### 1. **Responsive Design**
- Mobile-first CSS approach
- Touch-friendly button sizes (minimum 44px)
- Optimized layouts for small screens

#### 2. **Performance**
- Lazy loading for heavy components
- Optimized images and assets
- Efficient data fetching strategies

### 🧪 **Testing Guidelines**

#### 1. **Component Testing**
```typescript
// Example test structure
describe('RoomStatusIndicator', () => {
  it('should display room status correctly', () => {
    // Test implementation
  });
  
  it('should handle compact mode', () => {
    // Test implementation
  });
});
```

#### 2. **API Testing**
```typescript
// Example API test
describe('/api/rooms/status', () => {
  it('should return room status for valid room ID', async () => {
    // Test implementation
  });
  
  it('should handle unauthorized access', async () => {
    // Test implementation
  });
});
```

### 🔄 **Migration Guide**

#### 1. **Database Migration**
```javascript
// Add new fields to existing documents
db.interviews.updateMany(
  { activityDate: { $exists: false } },
  { $set: { activityDate: "$updatedAt" } }
);

// Update committee members with room assignments
db.users.updateMany(
  { role: "committee", assignedRoom: { $exists: false } },
  { $set: { assignedRoom: "Salle A1" } } // Default room
);
```

#### 2. **Component Migration**
- Update existing components to use new props
- Replace old statistics components with new ones
- Update API calls to use new endpoints

---

*This technical documentation provides comprehensive information about all new components, APIs, and system enhancements. For implementation details, refer to the source code and inline comments.*

