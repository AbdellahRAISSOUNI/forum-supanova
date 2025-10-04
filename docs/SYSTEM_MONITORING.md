# System Monitoring & Maintenance

## Overview

The Forum des Entreprises system includes comprehensive monitoring tools and automated maintenance capabilities to ensure optimal performance and data integrity.

## Database Consistency Monitoring

### Automated Consistency Checks

The system includes automated database consistency validation and repair:

```typescript
// Check and fix database consistency issues
const result = await checkAndFixDatabaseConsistency();
```

### Consistency Check Types

1. **Duplicate Queue Positions**
   - Detects multiple interviews with same queue position
   - Automatically reassigns positions based on priority

2. **Orphaned Interviews**
   - Finds interviews with invalid student/company references
   - Marks orphaned interviews as cancelled

3. **Invalid Queue Positions**
   - Detects negative, zero, or non-integer positions
   - Recalculates positions based on priority scores

4. **Missing Queue Positions**
   - Finds interviews without assigned positions
   - Assigns correct positions based on priority

5. **Inconsistent Statuses**
   - Fixes interviews with missing timestamp fields
   - Ensures status transitions are properly recorded

## Admin Monitoring API

### Endpoints

#### Check Database Consistency
```http
GET /api/admin/consistency
```

**Response:**
```json
{
  "isValid": true,
  "issues": [],
  "fixed": 0
}
```

#### Fix Database Issues
```http
POST /api/admin/consistency
```

**Response:**
```json
{
  "message": "Correction terminée",
  "isValid": true,
  "issues": ["Fixed 3 duplicate queue positions"],
  "fixed": 3
}
```

#### Check Specific Company Queue
```http
GET /api/admin/consistency?companyId=64f7a1b2c3d4e5f6a7b8c9d0
```

**Response:**
```json
{
  "isValid": true,
  "issues": [],
  "companyId": "64f7a1b2c3d4e5f6a7b8c9d0"
}
```

## Queue Integrity Validation

### Real-time Validation

The system provides real-time queue integrity validation:

```typescript
// Validate queue integrity for a specific company
const result = await validateQueueIntegrity(companyId);
```

### Validation Checks

1. **Queue Position Gaps**
   - Ensures positions are sequential (1, 2, 3, ...)
   - Detects missing positions in sequence

2. **Duplicate Positions**
   - Checks for multiple interviews with same position
   - Validates position uniqueness within company

3. **Priority Ordering**
   - Verifies queue is ordered by priority score
   - Checks tie-breaking by join time

4. **In-progress Interview Count**
   - Ensures only one interview per company is in progress
   - Detects multiple concurrent interviews

## System Health Monitoring

### Key Metrics

Monitor these metrics for system health:

1. **Queue Response Times**
   - Join queue operations: < 500ms
   - Position updates: < 200ms
   - Consistency checks: < 2s

2. **Error Rates**
   - API error rate: < 1%
   - Database error rate: < 0.1%
   - Race condition occurrences: 0

3. **Database Performance**
   - Query execution time: < 100ms
   - Index usage: > 95%
   - Connection pool utilization: < 80%

### Monitoring Script

Use the provided test script for system validation:

```bash
# Run system consistency tests
npx tsx scripts/test-queue-fixes.ts
```

## Maintenance Procedures

### Daily Maintenance

1. **Consistency Check**
   ```bash
   curl -X GET "https://your-domain.com/api/admin/consistency"
   ```

2. **Monitor Error Logs**
   - Check for rate limit violations
   - Monitor database connection issues
   - Review security alerts

### Weekly Maintenance

1. **Database Optimization**
   - Run consistency checks with fix enabled
   - Monitor index performance
   - Review slow query logs

2. **Security Review**
   - Check rate limiting statistics
   - Review input sanitization logs
   - Validate error message sanitization

### Monthly Maintenance

1. **Performance Analysis**
   - Review queue operation metrics
   - Analyze peak usage patterns
   - Optimize database indexes

2. **Security Audit**
   - Review access logs
   - Check for suspicious activity
   - Validate security headers

## Troubleshooting Guide

### Common Issues

#### High Error Rates
- Check database connection pool
- Verify MongoDB Atlas connectivity
- Review rate limiting configuration

#### Queue Position Inconsistencies
- Run consistency check with fix enabled
- Verify atomic operations are working
- Check for concurrent access issues

#### Performance Degradation
- Monitor database query performance
- Check index usage statistics
- Review connection pool metrics

### Recovery Procedures

#### Database Corruption
1. Run full consistency check
2. Restore from latest backup if needed
3. Rebuild indexes if necessary

#### Queue System Issues
1. Stop all queue operations
2. Run consistency repair
3. Restart queue services
4. Validate system integrity

## Alert Configuration

### Recommended Alerts

1. **High Error Rate**
   - Threshold: > 5% error rate
   - Action: Investigate immediately

2. **Database Connection Issues**
   - Threshold: > 3 connection failures/minute
   - Action: Check MongoDB Atlas status

3. **Queue Position Inconsistencies**
   - Threshold: Any inconsistencies detected
   - Action: Run automated repair

4. **Performance Degradation**
   - Threshold: Response time > 2s
   - Action: Investigate and optimize

## Security Monitoring

### Security Metrics

1. **Rate Limiting Violations**
   - Track excessive API requests
   - Monitor for potential abuse

2. **Input Validation Failures**
   - Log sanitization attempts
   - Monitor for injection attempts

3. **Authentication Failures**
   - Track failed login attempts
   - Monitor for brute force attacks

### Security Alerts

1. **Suspicious Activity**
   - Multiple failed logins from same IP
   - Unusual API usage patterns

2. **Security Violations**
   - Input sanitization bypass attempts
   - Unauthorized access attempts

## Best Practices

### Monitoring

1. **Automate Consistency Checks**
   - Run daily consistency validation
   - Set up automated alerts

2. **Monitor Performance Metrics**
   - Track response times
   - Monitor error rates

3. **Regular Security Reviews**
   - Review access logs weekly
   - Check for security violations

### Maintenance

1. **Proactive Monitoring**
   - Set up performance baselines
   - Monitor trends over time

2. **Regular Updates**
   - Keep dependencies updated
   - Apply security patches promptly

3. **Backup Strategy**
   - Regular database backups
   - Test restore procedures

## Integration with External Monitoring

### Prometheus Metrics

The system can be integrated with Prometheus for advanced monitoring:

```typescript
// Example metrics to expose
const metrics = {
  queue_operations_total: 'Total queue operations',
  queue_errors_total: 'Total queue errors',
  database_connections_active: 'Active database connections',
  consistency_check_duration: 'Consistency check duration'
};
```

### Grafana Dashboards

Recommended Grafana dashboard panels:

1. **Queue Operations**
   - Operations per minute
   - Success/failure rates
   - Average response time

2. **Database Health**
   - Connection pool utilization
   - Query performance
   - Consistency check results

3. **Security Metrics**
   - Rate limiting violations
   - Authentication failures
   - Input validation errors

