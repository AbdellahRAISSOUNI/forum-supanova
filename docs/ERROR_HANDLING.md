# Error Handling & Transaction Management

## Overview

The Forum des Entreprises application implements a comprehensive error handling system with MongoDB transactions to ensure data integrity, prevent race conditions, and provide clear user feedback.

## Error Handling System

### Custom Error Classes

The application uses custom error classes that extend the base `QueueError` class:

```typescript
export class QueueError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
}
```

#### Error Types

1. **ValidationError** (400)
   - Input validation failures
   - Missing required fields
   - Invalid data formats

2. **NotFoundError** (404)
   - Resource not found
   - Invalid IDs
   - Missing entities

3. **ConflictError** (409)
   - Business logic conflicts
   - Duplicate resources
   - State conflicts

4. **ForbiddenError** (403)
   - Authorization failures
   - Access denied
   - Permission issues

5. **QueueConflictError** (409)
   - Queue-specific conflicts
   - Multiple queue restrictions
   - Interview conflicts

6. **DatabaseError** (500)
   - Database operation failures
   - Transaction errors
   - Connection issues

### Error Response Format

All API endpoints return consistent error responses:

```json
{
  "error": "Error message in French",
  "code": "ERROR_CODE",
  "statusCode": 400
}
```

### Validation Utilities

The system includes comprehensive validation utilities:

```typescript
// ObjectId validation
validateObjectId(id, 'ID entreprise');

// Required field validation
validateRequired(value, 'Nom de l\'entreprise');

// Enum validation
validateEnum(role, ['student', 'committee', 'admin'], 'Rôle');
```

## Transaction Management

### Transaction Wrapper

All critical operations use the `withTransaction` wrapper:

```typescript
export async function withTransaction<T>(
  fn: (session: mongoose.ClientSession) => Promise<T>
): Promise<T>
```

### Critical Operations with Transactions

#### Queue Operations
- **Join Queue**: Atomic join + reorder
- **Leave Queue**: Atomic leave + reorder
- **Cancel Interview**: Atomic cancel + reorder
- **Reschedule Interview**: Atomic reschedule + reorder

#### Interview Management
- **Start Interview**: Atomic start with validation
- **End Interview**: Atomic end + reorder

#### Company Management
- **Create Company**: Atomic create with duplicate check
- **Update Company**: Atomic update with validation
- **Delete Company**: Atomic soft delete

### Transaction Benefits

1. **Atomicity**: Either all operations succeed or all fail
2. **Consistency**: Database remains in valid state
3. **Isolation**: Concurrent operations don't interfere
4. **Durability**: Committed changes are permanent

## Queue System Reliability

### Consistent Ordering Algorithm

The queue system uses a single, predictable ordering algorithm:

```typescript
// Priority calculation
const priorityScore = calculatePriorityScore(student, opportunityType);

// Consistent sorting
.sort({ priorityScore: 1, joinedAt: 1 })
```

### Conflict Prevention

The system prevents various types of conflicts:

1. **Duplicate Active Interviews**
   - Prevents multiple active interviews for same student-company
   - Unique index on `{ studentId, companyId, status }` for waiting interviews

2. **Queue Position Conflicts**
   - Prevents joining new queues when in priority positions (≤3)
   - Prevents rescheduling when in position 1

3. **Room Access Conflicts**
   - Committee members can only manage interviews in their assigned room
   - Validates room assignment before operations

### Race Condition Prevention

All concurrent operations are protected:

- **Session-aware queries**: All database operations use the same session
- **Atomic updates**: Position updates and status changes are atomic
- **Lock-free design**: Uses MongoDB's native concurrency control

## Implementation Examples

### API Route with Error Handling

```typescript
export async function POST(request: NextRequest) {
  try {
    // Validate inputs
    validateObjectId(companyId, 'ID entreprise');
    
    // Execute in transaction
    const result = await withTransaction(async (session) => {
      // Check for conflicts
      const conflictCheck = await checkQueueConflicts(studentId, companyId);
      if (!conflictCheck.canJoin) {
        throw new QueueConflictError(conflictCheck.message, conflictCheck.conflicts);
      }
      
      // Perform operations
      const interview = await createInterview({ session });
      await reorderQueueWithSession(companyId, session);
      
      return interview;
    });
    
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    const errorResponse = handleError(error);
    return NextResponse.json(
      { error: errorResponse.message },
      { status: errorResponse.statusCode }
    );
  }
}
```

### Service Function with Transactions

```typescript
export async function joinQueue(studentId: string, companyId: string, opportunityType: string) {
  try {
    await connectDB();
    
    // Pre-validation (outside transaction for performance)
    const existingInterview = await Interview.findOne({
      studentId, companyId, status: { $in: ['waiting', 'in_progress'] }
    });
    
    if (existingInterview) {
      throw new ConflictError('Vous êtes déjà dans la file d\'attente pour cette entreprise');
    }
    
    // Main operation in transaction
    const result = await withTransaction(async (session) => {
      const student = await User.findById(studentId).session(session);
      const company = await Company.findById(companyId).session(session);
      
      const newInterview = new Interview({ studentId, companyId, opportunityType });
      await newInterview.save({ session });
      
      await reorderQueueWithSession(companyId, session);
      
      return { success: true, interviewId: newInterview._id };
    });
    
    return result;
  } catch (error) {
    return handleError(error);
  }
}
```

## Best Practices

### Error Handling
1. **Use specific error types** for different scenarios
2. **Provide clear, actionable error messages** in French
3. **Log errors** with context for debugging
4. **Validate inputs early** to prevent unnecessary processing

### Transaction Management
1. **Keep transactions short** to reduce lock time
2. **Do pre-validation outside transactions** when possible
3. **Use proper session handling** for all database operations
4. **Handle rollback scenarios** gracefully

### Queue Operations
1. **Always reorder queues** after modifications
2. **Check for conflicts** before allowing operations
3. **Use consistent ordering algorithms** throughout
4. **Validate permissions** before operations

## Monitoring and Debugging

### Error Logging
All errors are logged with context:
- User information
- Operation details
- Error stack traces
- Timestamp and request ID

### Performance Monitoring
- Transaction duration tracking
- Queue operation metrics
- Database query performance
- Error rate monitoring

### Debugging Tools
- Detailed error responses in development
- Transaction rollback information
- Queue state snapshots
- Conflict detection logs
