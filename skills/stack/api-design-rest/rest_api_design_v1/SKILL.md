---
name: rest_api_design_v1
description: RESTful API design patterns, resource modeling, HTTP semantics, versioning, pagination, filtering, and API best practices
version: 1.0.0
tags: [api, rest, api-design, http, restful, web-api, backend]
category: stack
triggers:
  keywords: [rest api, api design, restful, http api, web api, api endpoints]
  filePatterns: [api/*.ts, routes/*.ts, controllers/*.ts, handlers/*.ts]
  commands: [api design, rest implementation, endpoint design]
  projectArchetypes: [api-service, microservices, saas, web-application]
  modes: [greenfield, refactor, api-review]
prerequisites:
  - api_gateway_v1
  - http_basics
recommended_structure:
  directories:
    - src/api/
    - src/api/routes/
    - src/api/controllers/
    - src/api/middleware/
    - src/api/validators/
workflow:
  setup:
    - Define API requirements
    - Design resource model
    - Plan API versioning
    - Set up API framework
  generate:
    - Implement routes
    - Create controllers
    - Add validation
    - Configure middleware
  test:
    - API contract tests
    - Integration tests
    - Load tests
best_practices:
  - Use nouns for resources
  - Use HTTP methods correctly
  - Return appropriate status codes
  - Version APIs from the start
  - Implement pagination
  - Use filtering and sorting
  - Document with OpenAPI
anti_patterns:
  - Verbs in URLs
  - Using GET for mutations
  - Inconsistent naming
  - No versioning strategy
  - Returning all data
  - No error handling
  - Missing documentation
tools:
  - Express / Fastify / NestJS
  - OpenAPI / Swagger
  - Postman / Insomnia
  - API Gateway
metrics:
  - API latency (p50, p95, p99)
  - Error rate by endpoint
  - Request volume
  - Cache hit rate
  - API adoption rate
---

# REST API Design Skill

## Overview

This skill provides comprehensive guidance on RESTful API design, including resource modeling, HTTP semantics, status codes, versioning strategies, pagination, filtering, sorting, error handling, and API documentation best practices.

REST (Representational State Transfer) is an architectural style for designing networked applications. Well-designed REST APIs are intuitive, scalable, and easy to consume.

## When to Use

- **Public APIs** for external developers
- **Microservices** communication
- **Mobile backends** (BFF pattern)
- **Web application** backends
- **Third-party integrations**

## When NOT to Use

- **Real-time requirements** (use WebSocket/gRPC)
- **High-performance internal** services (use gRPC)
- **Complex queries** (consider GraphQL)

---

## Core Concepts

### 1. Resource Modeling

#### Resource Naming
```typescript
// ✅ Good: Nouns, plural, lowercase
GET /api/users
GET /api/users/123
GET /api/users/123/orders
POST /api/orders
GET /api/products?category=electronics

// ❌ Bad: Verbs, singular, mixed case
GET /api/getUsers
GET /api/User/123
POST /api/createOrder
```

#### Resource Hierarchy
```typescript
// ✅ Good: Hierarchical for owned resources
GET /api/users/123/orders      // Orders belonging to user 123
GET /api/orders/456/items      // Items in order 456
POST /api/users/123/addresses  // Add address to user

// ⚠️ Use flat for independent resources
GET /api/orders/456
GET /api/products/789
```

#### Subresource vs Query
```typescript
// Subresource (owned, lifecycle tied to parent)
GET /api/users/123/orders

// Query (independent, filtered)
GET /api/orders?userId=123
GET /api/orders?status=pending&dateFrom=2026-01-01
```

### 2. HTTP Methods

```typescript
interface HTTPMethodSemantics {
  method: string;
  idempotent: boolean;
  safe: boolean;
  cacheable: boolean;
  body: boolean;
}

const httpMethods: Record<string, HTTPMethodSemantics> = {
  GET: {
    method: 'GET',
    idempotent: true,
    safe: true,
    cacheable: true,
    body: false, // Technically allowed but not recommended
    description: 'Retrieve resource(s)'
  },
  POST: {
    method: 'POST',
    idempotent: false,
    safe: false,
    cacheable: false,
    body: true,
    description: 'Create resource or execute operation'
  },
  PUT: {
    method: 'PUT',
    idempotent: true,
    safe: false,
    cacheable: false,
    body: true,
    description: 'Replace entire resource'
  },
  PATCH: {
    method: 'PATCH',
    idempotent: true,
    safe: false,
    cacheable: false,
    body: true,
    description: 'Partially update resource'
  },
  DELETE: {
    method: 'DELETE',
    idempotent: true,
    safe: false,
    cacheable: false,
    body: false,
    description: 'Delete resource'
  }
};

// Usage examples
const apiRoutes = {
  // Create
  'POST /api/users': {
    request: { name: string; email: string },
    response: { id: number; name: string; email: string; createdAt: Date },
    statusCode: 201,
    headers: { Location: '/api/users/{id}' }
  },

  // Read single
  'GET /api/users/123': {
    response: { id: number; name: string; email: string },
    statusCode: 200
  },

  // Read collection
  'GET /api/users': {
    response: {
      data: Array<User>,
      meta: { total: number; page: number; pageSize: number }
    },
    statusCode: 200
  },

  // Replace
  'PUT /api/users/123': {
    request: { name: string; email: string },
    response: { id: number; name: string; email: string },
    statusCode: 200
  },

  // Partial update
  'PATCH /api/users/123': {
    request: { email?: string; name?: string },
    response: { id: number; name: string; email: string },
    statusCode: 200
  },

  // Delete
  'DELETE /api/users/123': {
    statusCode: 204 // No content
  }
};
```

### 3. Status Codes

```typescript
enum HttpStatusCode {
  // Success
  OK = 200,
  Created = 201,
  Accepted = 202,
  NoContent = 204,
  PartialContent = 206,

  // Redirection
  MovedPermanently = 301,
  Found = 302,
  NotModified = 304,

  // Client Errors
  BadRequest = 400,
  Unauthorized = 401,
  Forbidden = 403,
  NotFound = 404,
  MethodNotAllowed = 405,
  Conflict = 409,
  Gone = 410,
  PreconditionFailed = 412,
  PayloadTooLarge = 413,
  UnsupportedMediaType = 415,
  TooManyRequests = 429,

  // Server Errors
  InternalServerError = 500,
  NotImplemented = 501,
  BadGateway = 502,
  ServiceUnavailable = 503,
  GatewayTimeout = 504
}

interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: Record<string, string[]>;
    requestId: string;
    timestamp: string;
  };
}

// Status code selection guide
const statusCodeGuide = {
  // Success scenarios
  'Resource retrieved': 200,
  'Resource created': 201,
  'Async operation accepted': 202,
  'Resource deleted': 204,

  // Client error scenarios
  'Invalid input': 400,
  'Missing authentication': 401,
  'Insufficient permissions': 403,
  'Resource not found': 404,
  'Resource already exists': 409,
  'Rate limit exceeded': 429,

  // Server error scenarios
  'Unexpected error': 500,
  'Dependency unavailable': 503
};
```

### 4. API Versioning

#### URL Path Versioning (Recommended)
```typescript
// ✅ Good: Clear, cacheable
GET /api/v1/users
GET /api/v2/users

// Express example
const v1Router = express.Router();
v1Router.get('/users', v1Controllers.getUsers);

const v2Router = express.Router();
v2Router.get('/users', v2Controllers.getUsers);

app.use('/api/v1', v1Router);
app.use('/api/v2', v2Router);
```

#### Header Versioning
```typescript
// Using Accept header
GET /api/users
Accept: application/vnd.myapi.v1+json

// Using custom header
GET /api/users
X-API-Version: 1
```

#### Version Deprecation Strategy
```typescript
interface VersionLifecycle {
  current: string;
  supported: string[];
  deprecated: { version: string; sunset: Date }[];
}

const versionLifecycle: VersionLifecycle = {
  current: 'v2',
  supported: ['v1', 'v2'],
  deprecated: [
    { version: 'v1', sunset: new Date('2026-12-31') }
  ]
};

// Deprecation header in responses
app.use((req, res, next) => {
  if (req.path.startsWith('/api/v1')) {
    res.setHeader('Deprecation', 'true');
    res.setHeader('Sunset', '2026-12-31');
    res.setHeader('Link', '</api/v2>; rel="successor-version"');
  }
  next();
});
```

### 5. Pagination

#### Offset-Based Pagination
```typescript
interface OffsetPaginationRequest {
  page?: number;
  pageSize?: number;
  offset?: number;
}

interface OffsetPaginationResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  links: {
    self: string;
    first: string;
    prev?: string;
    next?: string;
    last: string;
  };
}

// Implementation
async function paginate<T>(
  query: QueryBuilder<T>,
  req: OffsetPaginationRequest,
  baseUrl: string
): Promise<OffsetPaginationResponse<T>> {
  const page = req.page || 1;
  const pageSize = Math.min(req.pageSize || 20, 100); // Max 100
  const offset = (page - 1) * pageSize;

  const [data, total] = await Promise.all([
    query.limit(pageSize).offset(offset).execute(),
    query.count()
  ]);

  const totalPages = Math.ceil(total / pageSize);

  return {
    data,
    meta: {
      total,
      page,
      pageSize,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1
    },
    links: {
      self: `${baseUrl}?page=${page}&pageSize=${pageSize}`,
      first: `${baseUrl}?page=1&pageSize=${pageSize}`,
      prev: page > 1 ? `${baseUrl}?page=${page - 1}&pageSize=${pageSize}` : undefined,
      next: page < totalPages ? `${baseUrl}?page=${page + 1}&pageSize=${pageSize}` : undefined,
      last: `${baseUrl}?page=${totalPages}&pageSize=${pageSize}`
    }
  };
}
```

#### Cursor-Based Pagination (Recommended for large datasets)
```typescript
interface CursorPaginationRequest {
  cursor?: string; // Base64 encoded offset or ID
  limit?: number;
}

interface CursorPaginationResponse<T> {
  data: T[];
  meta: {
    count: number;
    hasMore: boolean;
  };
  links: {
    self: string;
    next?: string;
    prev?: string;
  };
}

// Implementation with cursor
async function paginateWithCursor<T extends { id: string | number }>(
  query: QueryBuilder<T>,
  req: CursorPaginationRequest,
  baseUrl: string
): Promise<CursorPaginationResponse<T>> {
  const limit = Math.min(req.limit || 20, 100);

  let resultQuery = query.limit(limit + 1); // Fetch one extra to check hasMore

  if (req.cursor) {
    const decodedCursor = Buffer.from(req.cursor, 'base64').toString('utf-8');
    resultQuery = resultQuery.where('id', '>', decodedCursor);
  }

  const items = await resultQuery.execute();

  const hasMore = items.length > limit;
  const data = hasMore ? items.slice(0, -1) : items;

  const nextCursor = hasMore 
    ? Buffer.from(String(data[data.length - 1].id)).toString('base64')
    : null;

  return {
    data,
    meta: {
      count: data.length,
      hasMore
    },
    links: {
      self: `${baseUrl}?limit=${limit}${req.cursor ? `&cursor=${req.cursor}` : ''}`,
      next: nextCursor ? `${baseUrl}?limit=${limit}&cursor=${nextCursor}` : undefined
    }
  };
}
```

### 6. Filtering, Sorting, and Field Selection

#### Filtering
```typescript
// Query parameters for filtering
GET /api/users?status=active&role=admin
GET /api/users?createdAt[gte]=2026-01-01&createdAt[lte]=2026-03-31
GET /api/users?email[contains]=@example.com
GET /api/users?status[in]=active,pending

// Implementation
interface FilterOperators {
  eq: (value: any) => WhereClause;
  ne: (value: any) => WhereClause;
  gt: (value: any) => WhereClause;
  gte: (value: any) => WhereClause;
  lt: (value: any) => WhereClause;
  lte: (value: any) => WhereClause;
  in: (values: any[]) => WhereClause;
  contains: (value: string) => WhereClause;
  startsWith: (value: string) => WhereClause;
  endsWith: (value: string) => WhereClause;
}

function buildFilters(query: QueryBuilder, filters: Record<string, any>): QueryBuilder {
  for (const [field, value] of Object.entries(filters)) {
    if (typeof value === 'object') {
      // Handle operators: { createdAt: { gte: '2026-01-01' } }
      for (const [operator, opValue] of Object.entries(value)) {
        query = query.where(field, operator, opValue);
      }
    } else {
      // Simple equality
      query = query.where(field, 'eq', value);
    }
  }
  return query;
}
```

#### Sorting
```typescript
// Query parameters for sorting
GET /api/users?sort=createdAt
GET /api/users?sort=-createdAt  // Descending
GET /api/users?sort=name,-createdAt  // Multiple

// Implementation
function buildSort(query: QueryBuilder, sortParam: string): QueryBuilder {
  const sortFields = sortParam.split(',');

  for (const field of sortFields) {
    const order = field.startsWith('-') ? 'desc' : 'asc';
    const fieldName = field.replace(/^-/, '');
    query = query.orderBy(fieldName, order);
  }

  return query;
}
```

#### Field Selection
```typescript
// Query parameters for field selection
GET /api/users?fields=id,name,email
GET /api/users/123?fields=id,name

// Implementation
function selectFields<T>(data: T | T[], fields?: string): Partial<T> | Partial<T>[] {
  if (!fields) return data;

  const fieldList = fields.split(',');

  if (Array.isArray(data)) {
    return data.map(item => 
      Object.fromEntries(
        fieldList.map(field => [field, (item as any)[field]])
      ) as Partial<T>
    );
  }

  return Object.fromEntries(
    fieldList.map(field => [field, (data as any)[field]])
  ) as Partial<T>;
}
```

### 7. Error Handling

```typescript
interface ApiError {
  code: string;
  message: string;
  details?: Record<string, string[]>;
  requestId: string;
  timestamp: string;
  helpUrl?: string;
}

class ApiErrorHandler {
  handle(error: Error, req: Request): ApiError {
    const apiError: ApiError = {
      code: this.getErrorCode(error),
      message: this.getUserMessage(error),
      requestId: req.id,
      timestamp: new Date().toISOString()
    };

    // Add validation details
    if (error instanceof ValidationError) {
      apiError.details = error.fields;
      apiError.helpUrl = '/docs/errors/validation';
    }

    return apiError;
  }

  private getErrorCode(error: Error): string {
    const errorCodes: Record<string, string> = {
      ValidationError: 'VALIDATION_ERROR',
      NotFoundError: 'NOT_FOUND',
      AuthenticationError: 'AUTHENTICATION_REQUIRED',
      AuthorizationError: 'FORBIDDEN',
      ConflictError: 'CONFLICT',
      RateLimitError: 'RATE_LIMIT_EXCEEDED'
    };

    return errorCodes[error.constructor.name] || 'INTERNAL_ERROR';
  }
}

// Express error handler middleware
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  const errorHandler = new ApiErrorHandler();
  const apiError = errorHandler.handle(err, req);

  const statusCode = this.getStatusCode(err);

  res.status(statusCode).json({ error: apiError });
});
```

### 8. OpenAPI Documentation

```typescript
// OpenAPI 3.0 specification
const openApiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'My API',
    version: '1.0.0',
    description: 'API for managing users and orders',
    contact: {
      name: 'API Support',
      email: 'support@example.com',
      url: 'https://docs.example.com'
    }
  },
  servers: [
    { url: 'https://api.example.com/v1' },
    { url: 'https://staging-api.example.com/v1' }
  ],
  paths: {
    '/users': {
      get: {
        summary: 'List users',
        operationId: 'listUsers',
        tags: ['Users'],
        parameters: [
          {
            name: 'page',
            in: 'query',
            schema: { type: 'integer', default: 1 }
          },
          {
            name: 'pageSize',
            in: 'query',
            schema: { type: 'integer', default: 20, maximum: 100 }
          }
        ],
        responses: {
          '200': {
            description: 'Successful response',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/UserList' }
              }
            }
          }
        }
      },
      post: {
        summary: 'Create user',
        operationId: 'createUser',
        tags: ['Users'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CreateUserRequest' }
            }
          }
        },
        responses: {
          '201': {
            description: 'User created',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/User' }
              }
            },
            headers: {
              Location: {
                schema: { type: 'string' },
                description: 'URL of the created resource'
              }
            }
          }
        }
      }
    }
  },
  components: {
    schemas: {
      User: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          name: { type: 'string' },
          email: { type: 'string', format: 'email' },
          createdAt: { type: 'string', format: 'date-time' }
        },
        required: ['id', 'name', 'email', 'createdAt']
      },
      CreateUserRequest: {
        type: 'object',
        properties: {
          name: { type: 'string', minLength: 1 },
          email: { type: 'string', format: 'email' }
        },
        required: ['name', 'email']
      }
    }
  }
};
```

---

## Best Practices

### 1. Consistent Naming
```typescript
// ✅ Good: Consistent conventions
GET /api/users
GET /api/users/123
GET /api/users/123/orders
POST /api/orders

// ❌ Bad: Inconsistent
GET /api/users
GET /api/getUser/123
GET /api/ordersList
POST /api/createOrder
```

### 2. Use HATEOAS (Optional but helpful)
```typescript
// ✅ Good: Include links
{
  "id": 123,
  "name": "John",
  "email": "john@example.com",
  "_links": {
    "self": { "href": "/api/users/123" },
    "orders": { "href": "/api/users/123/orders" },
    "update": { "href": "/api/users/123", "method": "PUT" },
    "delete": { "href": "/api/users/123", "method": "DELETE" }
  }
}
```

### 3. Rate Limiting
```typescript
// Include rate limit headers
res.setHeader('X-RateLimit-Limit', '1000');
res.setHeader('X-RateLimit-Remaining', '999');
res.setHeader('X-RateLimit-Reset', '1640000000');
```

---

## Anti-Patterns

### ❌ Verbs in URLs
```typescript
// ❌ Bad
GET /api/getUser/123
POST /api/createUser
POST /api/deleteUser/123

// ✅ Good
GET /api/users/123
POST /api/users
DELETE /api/users/123
```

### ❌ Using GET for Mutations
```typescript
// ❌ Bad: GET with side effects
GET /api/users/123/delete

// ✅ Good: Use appropriate method
DELETE /api/users/123
```

---

## Metrics to Track

| Metric | Target | Why It Matters |
|--------|--------|----------------|
| **API Latency (p99)** | <500ms | User experience |
| **Error Rate** | <1% | Reliability |
| **Cache Hit Rate** | >50% | Efficiency |
| **Request Volume** | Track | Capacity planning |
| **API Adoption** | Track | Success metric |

---

## Tools & Libraries

| Tool | Purpose | Best For |
|------|---------|----------|
| **Express** | Web framework | Node.js APIs |
| **Fastify** | Web framework | High performance |
| **NestJS** | Framework | Enterprise APIs |
| **Swagger/OpenAPI** | Documentation | API specs |
| **Postman** | Testing | API development |

---

## Implementation Checklist

### Design
- [ ] Resource model defined
- [ ] URL conventions established
- [ ] Versioning strategy selected
- [ ] Error handling designed

### Implementation
- [ ] Routes implemented
- [ ] Validation added
- [ ] Pagination implemented
- [ ] Filtering/sorting added

### Documentation
- [ ] OpenAPI spec created
- [ ] Examples provided
- [ ] Changelog maintained
- [ ] Migration guides written

---

## Related Skills

- **API Gateway**: `skills/architecture/api-gateway/api_gateway_v1/SKILL.md`
- **GraphQL Design**: `skills/stack/api-design-graphql/graphql_api_design_v1/SKILL.md`
- **WebSocket**: `skills/stack/real-time-websocket/websocket_realtime_v1/SKILL.md`

---

**Version:** 1.0.0
**Last Updated:** March 29, 2026
**Status:** ✅ Complete
