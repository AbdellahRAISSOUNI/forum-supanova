# Real-time Features Documentation

## Overview

The Forum des Entreprises platform includes comprehensive real-time features to enhance user experience and provide immediate feedback for queue management and interview processes.

## 🔄 Auto-refresh System

### React Query Integration

The platform uses React Query for efficient data fetching and caching:

```typescript
// Student Queue Page - 5 second intervals
const { data: queues = [], isLoading, refetch } = useQuery({
  queryKey: ['student-queues'],
  queryFn: async () => {
    const response = await fetch('/api/student/queues');
    if (!response.ok) throw new Error('Failed to fetch queues');
    return response.json();
  },
  refetchInterval: 5000, // 5 seconds
  enabled: !!session && session.user.role === 'student',
});

// Committee Dashboard - 3 second intervals
const { data: queueData, isLoading, refetch } = useQuery({
  queryKey: ['committee-queue'],
  queryFn: async () => {
    const response = await fetch('/api/committee/queue');
    if (!response.ok) throw new Error('Failed to fetch queue data');
    return response.json();
  },
  refetchInterval: 3000, // 3 seconds
  enabled: !!session && session.user.role === 'committee',
});
```

### Refresh Intervals

| Component | Interval | Purpose |
|-----------|----------|---------|
| Student Queue Page | 5 seconds | Position updates, status changes |
| Committee Dashboard | 3 seconds | Queue management, interview status |
| Student Dashboard | On demand | Statistics and activity feed |

## 🔔 Notification System

### React Hot Toast Integration

```typescript
// Notification Provider
import { Toaster } from 'react-hot-toast';

export default function NotificationProvider() {
  return (
    <Toaster
      position="top-right"
      toastOptions={{
        duration: 4000,
        style: {
          background: '#ffffff',
          color: '#1f2937',
          border: '1px solid #e5e7eb',
          borderRadius: '8px',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
        },
        success: {
          iconTheme: { primary: '#10b981', secondary: '#ffffff' },
          style: { border: '1px solid #10b981', background: '#f0fdf4' },
        },
        error: {
          iconTheme: { primary: '#ef4444', secondary: '#ffffff' },
          style: { border: '1px solid #ef4444', background: '#fef2f2' },
        },
      }}
    />
  );
}
```

### Notification Types

#### Student Notifications
- **Position Changes**: "Vous avez avancé ! Maintenant position #X"
- **Queue Updates**: Success/error messages for join/leave actions
- **Status Changes**: Interview status updates

#### Committee Notifications
- **New Students**: "Nouvel étudiant dans la file d'attente ! Total: X"
- **Student Leaves**: "Étudiant sorti de la file d'attente. Total: X"
- **Next Student Ready**: "Nouvel étudiant prêt ! [Name]"

## 🎨 Visual Indicators

### Position Badges

Color-coded position indicators with animations:

```typescript
const getPositionBadgeColor = (position: number) => {
  if (position === 1) return 'bg-green-500 text-white animate-pulse';
  if (position <= 3) return 'bg-yellow-500 text-white';
  return 'bg-blue-500 text-white';
};
```

| Position | Color | Animation | Meaning |
|----------|-------|-----------|---------|
| 1 | Green | Pulse | Your turn! |
| 2-3 | Yellow | None | Coming soon |
| 4+ | Blue | None | In queue |

### Position Banners

Persistent banners for important position changes:

```typescript
// Position Banner Component
{showPositionBanner && (
  <div className={`mb-6 p-4 rounded-lg border-2 ${
    showPositionBanner.position === 1 
      ? 'bg-green-50 border-green-200 text-green-800 animate-pulse'
      : 'bg-yellow-50 border-yellow-200 text-yellow-800'
  }`}>
    <div className="flex items-center justify-between">
      <div className="flex items-center space-x-3">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
          showPositionBanner.position === 1 ? 'bg-green-500 text-white' : 'bg-yellow-500 text-white'
        }`}>
          #{showPositionBanner.position}
        </div>
        <div>
          {showPositionBanner.position === 1 ? (
            <p className="font-semibold text-lg">Vous êtes le prochain ! Direction Salle {showPositionBanner.room}</p>
          ) : (
            <p className="font-semibold text-lg">Votre tour arrive bientôt ! Position #{showPositionBanner.position}</p>
          )}
        </div>
      </div>
    </div>
  </div>
)}
```

### Progress Bars

Dynamic progress indicators:

```typescript
const calculateProgress = (position: number, totalInQueue: number) => {
  if (totalInQueue === 0) return 100;
  return Math.max(0, Math.min(100, ((totalInQueue - position + 1) / totalInQueue) * 100));
};

// Progress Bar
<div className="w-full bg-gray-200 rounded-full h-2">
  <div 
    className={`h-2 rounded-full transition-all duration-300 ${
      queue.status === 'in_progress' 
        ? 'bg-green-500' 
        : queue.position === 1 && queue.status === 'waiting'
        ? 'bg-blue-500'
        : 'bg-[#2880CA]'
    }`}
    style={{ width: `${calculateProgress(queue.position, queue.position + 5)}%` }}
  ></div>
</div>
```

### Wait Time Estimates

Real-time wait time calculations:

```typescript
const getEstimatedWaitTime = (position: number, estimatedDuration: number) => {
  return Math.max(0, (position - 1) * estimatedDuration);
};

// Display
<p className="text-xs text-gray-600 font-medium">
  Temps d'attente estimé: {getEstimatedWaitTime(queue.position, queue.estimatedDuration)} min
</p>
```

## 📊 Enhanced Dashboard Features

### Student Dashboard Statistics

Real-time statistics cards:

```typescript
// Statistics API
export async function GET(request: NextRequest) {
  const stats = {
    totalQueues: await Interview.countDocuments({ studentId: session.user.id }),
    activeInterviews: await Interview.countDocuments({ studentId: session.user.id, status: 'in_progress' }),
    completedToday: await Interview.countDocuments({ 
      studentId: session.user.id, 
      status: 'completed',
      completedAt: { $gte: today, $lt: tomorrow }
    }),
    waitingQueues: await Interview.countDocuments({ studentId: session.user.id, status: 'waiting' }),
    totalCompanies: await Company.countDocuments({ isActive: true }),
    averageDuration: Math.round(avgDuration[0]?.avgDuration || 20)
  };
}
```

### Recent Activity Feed

```typescript
// Activity API
export async function GET(request: NextRequest) {
  const recentActivity = await Interview.find({
    studentId: session.user.id,
  })
  .populate('companyId', 'name room')
  .sort({ updatedAt: -1 })
  .limit(10)
  .select('status opportunityType joinedAt startedAt completedAt companyId queuePosition');
}
```

## 🔧 Implementation Details

### Position Change Detection

```typescript
// Track position changes and show notifications
useEffect(() => {
  if (queues.length === 0) return;

  queues.forEach((queue: Queue) => {
    const previousPosition = previousPositions[queue._id];
    
    if (previousPosition && previousPosition !== queue.position) {
      if (queue.position < previousPosition) {
        toast.success(`Vous avez avancé ! Maintenant position #${queue.position}`);
      }
    }

    // Update position banner based on current position
    if (queue.position === 1 && queue.status === 'waiting') {
      setShowPositionBanner({ queueId: queue._id, position: queue.position, room: queue.room });
    } else if (queue.position <= 3 && queue.status === 'waiting') {
      setShowPositionBanner({ queueId: queue._id, position: queue.position, room: queue.room });
    } else {
      setShowPositionBanner(null);
    }
  });

  // Update previous positions
  const newPreviousPositions: Record<string, number> = {};
  queues.forEach((queue: Queue) => {
    newPreviousPositions[queue._id] = queue.position;
  });
  setPreviousPositions(newPreviousPositions);
}, [queues, previousPositions]);
```

### Committee Queue Monitoring

```typescript
// Track queue changes and show notifications
useEffect(() => {
  if (!queueData) return;

  const currentQueueSize = queueData.totalWaiting;
  const currentWaitingQueue = queueData.waitingQueue.map((student: any) => student.interviewId);

  // Check for new students joining
  if (previousQueueSize > 0 && currentQueueSize > previousQueueSize) {
    toast.success(`Nouvel étudiant dans la file d'attente ! Total: ${currentQueueSize}`);
  }

  // Check for students leaving
  if (previousQueueSize > 0 && currentQueueSize < previousQueueSize) {
    toast.info(`Étudiant sorti de la file d'attente. Total: ${currentQueueSize}`);
  }

  // Check for next student ready
  if (queueData.nextUp && !queueData.currentInterview) {
    const isNewNextUp = !previousWaitingQueue.includes(queueData.nextUp.interviewId);
    if (isNewNextUp && previousWaitingQueue.length > 0) {
      toast.success(`Nouvel étudiant prêt ! ${queueData.nextUp.studentName}`, {
        duration: 6000,
      });
      // Optional: Play sound notification
      // const audio = new Audio('/notification.mp3');
      // audio.play().catch(() => {});
    }
  }

  setPreviousQueueSize(currentQueueSize);
  setPreviousWaitingQueue(currentWaitingQueue);
}, [queueData, previousQueueSize, previousWaitingQueue]);
```

## 🎵 Sound Notifications (Optional)

### Implementation

```typescript
// Sound notification for committee members
if (isNewNextUp && previousWaitingQueue.length > 0) {
  toast.success(`Nouvel étudiant prêt ! ${queueData.nextUp.studentName}`, {
    duration: 6000,
  });
  
  // Play sound notification
  const audio = new Audio('/notification.mp3');
  audio.play().catch(() => {}); // Ignore errors if audio fails
}
```

### Audio File Requirements

- **Format**: MP3, WAV, or OGG
- **Duration**: 1-3 seconds
- **Volume**: Moderate level
- **Location**: `/public/notification.mp3`

## 🚀 Performance Considerations

### Optimizations

1. **React Query Caching**: Prevents unnecessary API calls
2. **Background Updates**: No page refresh required
3. **Efficient Re-renders**: Only update changed components
4. **Memory Management**: Clean up intervals and listeners

### Monitoring

- **API Response Times**: Monitor endpoint performance
- **Memory Usage**: Watch for memory leaks with auto-refresh
- **Network Traffic**: Optimize data transfer
- **User Experience**: Ensure smooth animations

## 🧪 Testing

### Manual Testing Checklist

#### Student Queue Page
- [ ] Auto-refresh every 5 seconds
- [ ] Position change notifications appear
- [ ] Position banners show correctly (≤3 yellow, =1 green)
- [ ] Position badges are color-coded
- [ ] Wait time estimates are accurate
- [ ] Progress bars update dynamically

#### Committee Dashboard
- [ ] Auto-refresh every 3 seconds
- [ ] Queue change notifications appear
- [ ] Interview timer works correctly
- [ ] Sound notifications work (if enabled)
- [ ] Queue updates in real-time

#### Student Dashboard
- [ ] Statistics cards show correct data
- [ ] Recent activity feed updates
- [ ] Quick access buttons work
- [ ] Real-time updates function properly

### Performance Testing
- [ ] No memory leaks with auto-refresh
- [ ] Efficient API calls with React Query
- [ ] Smooth animations and transitions
- [ ] Responsive design on all devices

## 🔧 Configuration

### Environment Variables

No additional environment variables required for real-time features.

### Dependencies

```json
{
  "@tanstack/react-query": "^5.90.2",
  "react-hot-toast": "^2.6.0"
}
```

## 📱 Mobile Responsiveness

All real-time features are fully responsive and work on:
- Desktop computers
- Tablets
- Mobile phones
- Touch devices

## 🔒 Security Considerations

- **Rate Limiting**: Consider implementing for production
- **Data Validation**: All real-time data is validated
- **Authentication**: Real-time features respect user roles
- **Privacy**: No sensitive data exposed in notifications

## 🚀 Future Enhancements

### Planned Features
- WebSocket integration for true real-time updates
- Push notifications for mobile devices
- Advanced analytics and reporting
- Customizable notification preferences
- Multi-language support for notifications
- Advanced sound customization options

### Performance Improvements
- Server-Sent Events (SSE) for better real-time updates
- WebSocket connections for instant updates
- Advanced caching strategies
- Optimized database queries
- CDN integration for static assets
