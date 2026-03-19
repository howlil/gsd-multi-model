# Setup Error Tracking

Sentry error tracking integration for EZ Agents projects.

## Description

This command sets up error tracking for your EZ Agents project using Sentry. It provides:

- **Automatic error capture** for unhandled exceptions
- **Error classification** (retryable vs non-retryable)
- **User context** and breadcrumbs for debugging
- **Performance monitoring** with distributed tracing
- **Graceful degradation** when DSN not configured

## Requirements

- OBSERVE-09: Error tracking integration (Sentry, Rollbar, Bugsnag)

## Usage

```javascript
const ErrorTracker = require('./ez-agents/bin/lib/error-tracker.cjs');

// Create error tracker instance
const tracker = new ErrorTracker({
  dsn: 'https://publicKey@o0.ingest.sentry.io/0',
  environment: 'production',
  release: '1.0.0',
  tracesSampleRate: 0.1,      // 10% of transactions
  profilesSampleRate: 0.1     // 10% of profiles
});

// Add middleware to Express app
app.use(tracker.middleware());

// Add error handler (must be last middleware)
app.use(tracker.errorHandler());

// Capture exceptions manually
tracker.captureException(error, { userId: '123' });
```

## Examples

### Basic Integration

```javascript
const express = require('express');
const ErrorTracker = require('./ez-agents/bin/lib/error-tracker.cjs');

const app = express();

// Initialize error tracker
const tracker = new ErrorTracker({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV || 'development',
  release: process.env.npm_package_version || '1.0.0'
});

// Add request handler (must be before routes)
app.use(tracker.middleware());

// Your routes
app.get('/api/users', async (req, res, next) => {
  try {
    const users = await fetchUsers();
    res.json({ users });
  } catch (error) {
    next(error);  // Sentry will capture this
  }
});

// Add error handler (must be last)
app.use(tracker.errorHandler());

// Fallback error handler
app.use((err, req, res, next) => {
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(3000);
```

### Manual Error Capture

```javascript
// Capture exception with context
try {
  await riskyOperation();
} catch (error) {
  tracker.captureException(error, {
    userId: '123',
    operation: 'riskyOperation',
    attempt: 1
  });
}

// Capture message
tracker.captureMessage('User logged in', 'info', {
  userId: '123',
  ip: req.ip
});

// Capture warning
tracker.captureMessage('High memory usage detected', 'warning', {
  memoryUsage: process.memoryUsage().heapUsed
});
```

### User Context

```javascript
// Set user context (after authentication)
tracker.setUserContext({
  id: user.id,
  username: user.username,
  email: user.email
});

// Clear user context (on logout)
tracker.clearUserContext();
```

### Breadcrumbs

```javascript
// Add breadcrumbs for debugging context
tracker.addBreadcrumb('User clicked button', 'ui', {
  buttonId: 'submit-form',
  page: '/checkout'
});

tracker.addBreadcrumb('Database query executed', 'db', {
  query: 'SELECT * FROM users',
  duration: 50
});

tracker.addBreadcrumb('API call failed', 'http', {
  url: 'https://api.example.com/data',
  status: 500
});

// Clear breadcrumbs
tracker.clearBreadcrumbs();
```

### Tags and Context

```javascript
// Set tags (persist across events)
tracker.setTag('environment', 'production');
tracker.setTag('service', 'api-gateway');

// Set multiple tags
tracker.setTags({
  version: '1.0.0',
  region: 'us-east-1'
});

// Set context (structured data)
tracker.setContext('database', {
  type: 'postgresql',
  version: '14.0',
  connections: {
    active: 10,
    idle: 5
  }
});
```

### Sessions (Release Health)

```javascript
// Start session (e.g., on user login)
tracker.startSession();

// End session (e.g., on user logout)
tracker.endSession();

// Sessions are automatically tracked for HTTP requests
```

### Error Classification

```javascript
// Classify error as retryable or non-retryable
const classification = tracker.classifyError(error);

if (classification.retryable) {
  console.log(`Retryable error: ${classification.reason}`);
  console.log(`Suggested delay: ${classification.suggestedDelay}ms`);
  // Retry logic here
} else {
  console.log(`Non-retryable error: ${classification.reason}`);
  // Handle client error
}
```

### Performance Monitoring

```javascript
// Performance monitoring is enabled with tracesSampleRate
const tracker = new ErrorTracker({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: 0.1,  // 10% of transactions
  profilesSampleRate: 0.1 // 10% of profiles (requires @sentry/profiling-node)
});

// Transactions are automatically created for HTTP requests
// View in Sentry > Performance
```

### Custom Integrations

```javascript
// Database error tracking
db.on('error', (error) => {
  tracker.captureException(error, {
    source: 'database',
    connection: db.config.host
  });
});

// Redis error tracking
redisClient.on('error', (error) => {
  tracker.captureException(error, {
    source: 'redis',
    command: 'GET'
  });
});

// Third-party API error tracking
async function fetchExternalData() {
  try {
    return await fetch('https://api.example.com/data');
  } catch (error) {
    tracker.captureException(error, {
      source: 'external-api',
      url: 'https://api.example.com/data'
    });
    throw error;
  }
}
```

## Configuration Options

```javascript
const tracker = new ErrorTracker({
  dsn: 'https://...',           // Sentry DSN (required)
  environment: 'production',     // Environment name
  release: '1.0.0',             // Release version
  tracesSampleRate: 0.1,        // Tracing sample rate (0.0-1.0)
  profilesSampleRate: 0.1,      // Profiling sample rate (0.0-1.0)
  expressApp: app               // Express app for integration
});
```

### Environment Variables

```bash
# .env
SENTRY_DSN=https://publicKey@o0.ingest.sentry.io/0
SENTRY_ENVIRONMENT=production
SENTRY_RELEASE=1.0.0
```

## Getting a Sentry DSN

1. Create a Sentry account at https://sentry.io
2. Create a new project (select Node.js)
3. Copy the DSN from Project Settings > Client Keys (DSN)
4. Add to your `.env` file

### Self-Hosted Sentry

```javascript
const tracker = new ErrorTracker({
  dsn: 'https://key@your-sentry-instance.com/project-id',
  environment: 'production'
});
```

## Error Filtering

The error tracker automatically filters sensitive data:

```javascript
// beforeSend hook removes:
// - request.cookies
// - request.headers.authorization
// - request.headers.cookie
// - request.headers['set-cookie']
```

### Custom Filtering

```javascript
const Sentry = require('@sentry/node');

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  beforeSend(event, hint) {
    // Remove sensitive data
    if (event.request) {
      delete event.request.cookies;
    }

    // Filter specific errors
    if (event.exception) {
      const error = hint.originalException;
      if (error.message?.includes('password')) {
        return null;  // Drop event
      }
    }

    return event;
  }
});
```

## Related Commands

- `/ez:setup-observability` - Complete observability stack setup
- `/ez:setup-alerting` - Alerting configuration
- `/ez:setup-tracing` - Distributed tracing setup
- `/ez:health` - Health check command

## Troubleshooting

### Errors not appearing in Sentry

1. Verify DSN is correct
2. Check network connectivity to Sentry
3. Ensure error handler middleware is added
4. Check Sentry dashboard filters
5. Review console logs for Sentry errors

### Too many errors being captured

1. Reduce `tracesSampleRate` (e.g., 0.01 for 1%)
2. Add error filtering in `beforeSend`
3. Use `captureException` manually instead of auto-capture
4. Configure sample rates per environment

### Sensitive data in events

1. Review `beforeSend` hook
2. Check `beforeSendTransaction` for performance data
3. Verify PII scrubbing is enabled
4. Use custom integrations to filter data

### Performance impact

1. Reduce sample rates
2. Disable profiling in production
3. Use async error reporting
4. Configure transport options

```javascript
const tracker = new ErrorTracker({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: 0.01,  // 1% sampling
  profilesSampleRate: 0,   // Disable profiling
  beforeSendTransaction(event) {
    // Filter transaction data
    return event;
  }
});
```

### Flush pending events

```javascript
// Before shutdown
await tracker.flush(2000);  // 2 second timeout

// Close Sentry
await tracker.close(2000);
```
