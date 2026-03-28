---
name: graphql_api_design_v1
description: GraphQL API design, schema design, resolvers, query optimization, N+1 prevention, and GraphQL best practices
version: 1.0.0
tags: [api, graphql, api-design, schema, resolvers, query-optimization, backend]
category: stack
triggers:
  keywords: [graphql, graphql api, graphql schema, resolvers, graph ql]
  filePatterns: [graphql/*.ts, schema/*.ts, resolvers/*.ts]
  commands: [graphql design, schema implementation]
  projectArchetypes: [api-service, saas, web-application, mobile-backend]
  modes: [greenfield, refactor, api-review]
prerequisites:
  - rest_api_design_v1
  - api_gateway_v1
recommended_structure:
  directories:
    - src/graphql/
    - src/graphql/schema/
    - src/graphql/resolvers/
    - src/graphql/dataloader/
workflow:
  setup:
    - Design GraphQL schema
    - Define types and relationships
    - Plan resolver structure
    - Set up GraphQL server
  generate:
    - Implement resolvers
    - Add data loaders
    - Configure authentication
    - Set up subscriptions
  test:
    - Query tests
    - Resolver tests
    - Performance tests
best_practices:
  - Design schema for client needs
  - Use DataLoader for N+1
  - Implement proper error handling
  - Add query complexity limits
  - Use fragments for reusability
  - Version through schema evolution
  - Document with descriptions
anti_patterns:
  - Exposing database structure directly
  - N+1 query problems
  - No query depth limiting
  - Over-fetching in resolvers
  - Mixing concerns in resolvers
  - No error standardization
tools:
  - Apollo Server / Federation
  - GraphQL Yoga
  - DataLoader
  - GraphQL Code Generator
metrics:
  - Query latency (p50, p95, p99)
  - Resolver execution time
  - Query complexity
  - Cache hit rate
  - Error rate by operation
---

# GraphQL API Design Skill

## Overview

This skill provides comprehensive guidance on GraphQL API design, including schema design patterns, resolver implementation, query optimization, N+1 problem prevention, DataLoader usage, subscriptions, and GraphQL best practices for building efficient, scalable APIs.

GraphQL is a query language and runtime for APIs that allows clients to request exactly the data they need. Well-designed GraphQL APIs are flexible, efficient, and easy to evolve.

## When to Use

- **Multiple client types** with different data needs
- **Mobile applications** requiring bandwidth efficiency
- **Complex domain models** with relationships
- **Rapidly evolving** frontend requirements
- **Aggregating multiple** data sources

## When NOT to Use

- **Simple CRUD** applications (REST may suffice)
- **File uploads** as primary use case
- **Cache-heavy** scenarios where HTTP caching is critical
- **Real-time requirements** only (consider WebSocket)

---

## Core Concepts

### 1. Schema Design

#### Type Definitions
```typescript
// schema.graphql
type User {
  id: ID!
  email: String!
  name: String!
  avatar: String
  role: UserRole!
  posts: [Post!]!
  followers: [User!]!
  following: [User!]!
  followerCount: Int!
  createdAt: DateTime!
  updatedAt: DateTime!
}

enum UserRole {
  USER
  ADMIN
  MODERATOR
}

type Post {
  id: ID!
  title: String!
  content: String!
  slug: String!
  status: PostStatus!
  author: User!
  comments: [Comment!]!
  tags: [Tag!]!
  likeCount: Int!
  viewCount: Int!
  publishedAt: DateTime
  createdAt: DateTime!
  updatedAt: DateTime!
}

enum PostStatus {
  DRAFT
  PUBLISHED
  ARCHIVED
}

type Comment {
  id: ID!
  content: String!
  author: User!
  post: Post!
  parent: Comment
  replies: [Comment!]!
  createdAt: DateTime!
}

type Tag {
  id: ID!
  name: String!
  slug: String!
  postCount: Int!
}

# Input types for mutations
input CreateUserInput {
  email: String!
  name: String!
  password: String!
  role: UserRole
}

input UpdateUserInput {
  email: String
  name: String
  avatar: String
}

input CreatePostInput {
  title: String!
  content: String!
  tags: [String!]
  status: PostStatus
}

# Query and Mutation types
type Query {
  # Single resources
  user(id: ID!): User
  post(id: ID!): Post
  postBySlug(slug: String!): Post
  
  # Collections with pagination
  users(
    filter: UserFilter
    sort: UserSort
    first: Int
    after: String
  ): UserConnection!
  
  posts(
    filter: PostFilter
    sort: PostSort
    first: Int
    after: String
  ): PostConnection!
  
  # Search
  search(query: String!, type: SearchType): [SearchResult!]!
}

type Mutation {
  # User mutations
  createUser(input: CreateUserInput!): UserPayload!
  updateUser(id: ID!, input: UpdateUserInput!): UserPayload!
  deleteUser(id: ID!): DeletePayload!
  
  # Post mutations
  createPost(input: CreatePostInput!): PostPayload!
  updatePost(id: ID!, input: UpdatePostInput!): PostPayload!
  deletePost(id: ID!): DeletePayload!
  
  # Actions
  likePost(postId: ID!): PostPayload!
  followUser(userId: ID!): UserPayload!
}

# Subscriptions
type Subscription {
  postPublished(authorId: ID): Post!
  commentAdded(postId: ID!): Comment!
  userStatusChanged(userId: ID!): UserStatus!
}

# Supporting types
type UserConnection {
  edges: [UserEdge!]!
  pageInfo: PageInfo!
  totalCount: Int!
}

type UserEdge {
  node: User!
  cursor: String!
}

type PageInfo {
  hasNextPage: Boolean!
  hasPreviousPage: Boolean!
  startCursor: String
  endCursor: String
}

union SearchResult = User | Post | Comment | Tag

enum SearchType {
  USER
  POST
  COMMENT
  TAG
}

# Payload types for mutations
type UserPayload {
  user: User
  errors: [Error!]
}

type PostPayload {
  post: Post
  errors: [Error!]
}

type DeletePayload {
  success: Boolean!
  errors: [Error!]
}

type Error {
  field: String
  message: String!
  code: String!
}

scalar DateTime
```

### 2. Resolver Implementation

```typescript
// resolvers.ts
import { DataLoader } from 'dataloader';

interface Context {
  userId: string;
  loaders: {
    user: DataLoader<string, User>;
    post: DataLoader<string, Post>;
    comments: DataLoader<string, Comment[]>;
  };
  pubsub: PubSubEngine;
}

const resolvers = {
  Query: {
    user: async (_, { id }, { loaders }) => {
      return loaders.user.load(id);
    },
    
    users: async (_, { filter, sort, first, after }, ctx) => {
      return paginateUsers(filter, sort, first, after);
    },
    
    post: async (_, { id }, { loaders }) => {
      return loaders.post.load(id);
    },
    
    search: async (_, { query, type }) => {
      return performSearch(query, type);
    }
  },
  
  Mutation: {
    createUser: async (_, { input }, ctx) => {
      try {
        const user = await createUserService.create(input);
        return { user, errors: null };
      } catch (error) {
        return { 
          user: null, 
          errors: formatErrors(error) 
        };
      }
    },
    
    updatePost: async (_, { id, input }, ctx) => {
      // Check authorization
      const post = await ctx.loaders.post.load(id);
      if (post.authorId !== ctx.userId) {
        throw new ForbiddenError('Not authorized');
      }
      
      const updated = await updatePostService.update(id, input);
      return { post: updated, errors: null };
    }
  },
  
  // Field resolvers
  User: {
    posts: async (user, _, { loaders }) => {
      return loaders.userPosts.load(user.id);
    },
    
    followerCount: async (user) => {
      return countFollowers(user.id);
    },
    
    followers: async (user, { first = 20 }) => {
      return getFollowers(user.id, first);
    }
  },
  
  Post: {
    author: async (post, _, { loaders }) => {
      return loaders.user.load(post.authorId);
    },
    
    comments: async (post, _, { loaders }) => {
      return loaders.postComments.load(post.id);
    },
    
    likeCount: async (post) => {
      return countLikes(post.id);
    },
    
    tags: async (post) => {
      return getPostTags(post.id);
    }
  },
  
  Comment: {
    author: async (comment, _, { loaders }) => {
      return loaders.user.load(comment.authorId);
    },
    
    replies: async (comment) => {
      return getCommentReplies(comment.id);
    }
  },
  
  // Union type resolver
  SearchResult: {
    __resolveType(obj) {
      if ('email' in obj) return 'User';
      if ('title' in obj) return 'Post';
      if ('content' in obj && !('title' in obj)) return 'Comment';
      if ('postCount' in obj) return 'Tag';
      return null;
    }
  }
};
```

### 3. DataLoader for N+1 Prevention

```typescript
// dataloaders.ts
import DataLoader from 'dataloader';

function createLoaders() {
  return {
    user: new DataLoader(async (ids: string[]) => {
      const users = await db.user.findMany({
        where: { id: { in: ids } }
      });
      return ids.map(id => users.find(u => u.id === id));
    }),
    
    post: new DataLoader(async (ids: string[]) => {
      const posts = await db.post.findMany({
        where: { id: { in: ids } }
      });
      return ids.map(id => posts.find(p => p.id === id));
    }),
    
    userPosts: new DataLoader(async (userIds: string[]) => {
      const posts = await db.post.findMany({
        where: { authorId: { in: userIds } }
      });
      
      return userIds.map(userId => 
        posts.filter(p => p.authorId === userId)
      );
    }),
    
    postComments: new DataLoader(async (postIds: string[]) => {
      const comments = await db.comment.findMany({
        where: { 
          postId: { in: postIds },
          parentId: null // Only top-level comments
        }
      });
      
      return postIds.map(postId => 
        comments.filter(c => c.postId === postId)
      );
    }),
    
    // Batch with caching disabled for user-specific data
    userPermissions: new DataLoader(async (userIds: string[]) => {
      const permissions = await db.permission.findMany({
        where: { userId: { in: userIds } }
      });
      
      return userIds.map(userId => 
        permissions.filter(p => p.userId === userId)
      );
    }, {
      cache: false // Don't cache across requests
    })
  };
}

// Usage in context
const context = async ({ req }) => {
  const user = await authenticate(req);
  
  return {
    userId: user?.id,
    loaders: createLoaders(),
    pubsub
  };
};
```

### 4. Query Complexity Analysis

```typescript
// complexity.ts
import { fieldExtensionsEstimator, simpleEstimator } from 'graphql-query-complexity';

const complexityConfig = {
  maximumComplexity: 1000,
  estimators: [
    fieldExtensionsEstimator(),
    simpleEstimator({ defaultComplexity: 1 })
  ]
};

// Schema with complexity annotations
const typeDefs = gql`
  type Query {
    users(first: Int): [User!]! @complexity(value: 10)
    user(id: ID!): User @complexity(value: 1)
    search(query: String!): [SearchResult!]! @complexity(value: 50)
  }
  
  type User {
    posts: [Post!]! @complexity(multiplier: "first", value: 2)
    followers(first: Int): [User!]! @complexity(multiplier: "first", value: 1)
  }
`;

// Middleware to enforce complexity
const complexityMiddleware = (schema) => {
  return useServer({
    schema,
    plugins: [
      useQueryComplexity({
        maximumComplexity: 1000,
        onQueryComplexity: ({ complexity, maxComplexity }) => {
          if (complexity > maxComplexity) {
            throw new Error(
              `Query complexity ${complexity} exceeds maximum ${maxComplexity}`
            );
          }
        }
      })
    ]
  });
};
```

### 5. Error Handling

```typescript
// errors.ts
import { GraphQLError, ApolloError } from 'apollo-server-core';

class ApplicationError extends GraphQLError {
  constructor(
    message: string,
    public code: string,
    public fields?: Record<string, string>,
    extensions?: Record<string, any>
  ) {
    super(message, {
      extensions: {
        code,
        fields,
        ...extensions
      }
    });
  }
}

class ValidationError extends ApplicationError {
  constructor(fields: Record<string, string>) {
    super('Validation failed', 'VALIDATION_ERROR', fields);
  }
}

class NotFoundError extends ApplicationError {
  constructor(resource: string, id: string) {
    super(`${resource} with id ${id} not found`, 'NOT_FOUND');
  }
}

class ForbiddenError extends ApplicationError {
  constructor(message: string = 'Access denied') {
    super(message, 'FORBIDDEN');
  }
}

class AuthenticationError extends ApplicationError {
  constructor() {
    super('Authentication required', 'UNAUTHENTICATED');
  }
}

// Error formatting
const formatError = (error: GraphQLError) => {
  const formatted = {
    message: error.message,
    path: error.path,
    locations: error.locations,
    extensions: {
      code: error.extensions?.code || 'INTERNAL_SERVER_ERROR',
      ...(error.extensions?.fields && { fields: error.extensions.fields })
    }
  };

  // Don't expose internal errors in production
  if (error.extensions?.code === 'INTERNAL_SERVER_ERROR') {
    console.error('Internal error:', error);
    formatted.message = 'Internal server error';
  }

  return formatted;
};
```

### 6. Subscriptions

```typescript
// subscriptions.ts
import { PubSubEngine } from 'graphql-subscriptions';

const pubsub = new PubSub();

const resolvers = {
  Subscription: {
    postPublished: {
      subscribe: (_, { authorId }, { pubsub }) => {
        const channel = authorId 
          ? `POST_PUBLISHED:${authorId}` 
          : 'POST_PUBLISHED:ALL';
        return pubsub.asyncIterator(channel);
      }
    },
    
    commentAdded: {
      subscribe: (_, { postId }, { pubsub }) => {
        return pubsub.asyncIterator(`COMMENT_ADDED:${postId}`);
      },
      resolve: (payload) => payload.commentAdded
    },
    
    userStatusChanged: {
      subscribe: (_, { userId }, { pubsub }) => {
        return pubsub.asyncIterator(`USER_STATUS:${userId}`);
      }
    }
  }
};

// Publishing events
const publishPostPublished = async (post: Post) => {
  await pubsub.publish('POST_PUBLISHED:ALL', {
    postPublished: post
  });
  
  await pubsub.publish(`POST_PUBLISHED:${post.authorId}`, {
    postPublished: post
  });
};

const publishCommentAdded = async (comment: Comment) => {
  await pubsub.publish(`COMMENT_ADDED:${comment.postId}`, {
    commentAdded: comment
  });
};
```

### 7. Authentication & Authorization

```typescript
// auth.ts
import { AuthenticationError, ForbiddenError } from 'apollo-server-core';

// Context with authentication
const context = async ({ req }) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  let user: User | null = null;
  if (token) {
    try {
      user = await verifyToken(token);
    } catch (error) {
      // Token invalid, user will be null
    }
  }
  
  return {
    userId: user?.id,
    user,
    loaders: createLoaders(),
    pubsub,
    // Authorization helper
    authorize: (resource: string, action: string) => {
      if (!user) {
        throw new AuthenticationError();
      }
      if (!hasPermission(user, resource, action)) {
        throw new ForbiddenError();
      }
    }
  };
};

// Directive-based authorization
import { SchemaDirectiveVisitor } from 'apollo-server-core';

class AuthDirective extends SchemaDirectiveVisitor {
  visitFieldDefinition(field: any) {
    const { requiresAuth, roles } = this.args;
    
    const originalResolve = field.resolve || defaultFieldResolver;
    
    field.resolve = async (root, args, context, info) => {
      if (requiresAuth && !context.user) {
        throw new AuthenticationError();
      }
      
      if (roles && !roles.includes(context.user?.role)) {
        throw new ForbiddenError('Insufficient permissions');
      }
      
      return originalResolve(root, args, context, info);
    };
  }
}

// Usage in schema
const typeDefs = gql`
  directive @auth(requiresAuth: Boolean!, roles: [UserRole!]) on FIELD_DEFINITION
  
  type Query {
    publicData: String
    privateData: String @auth(requiresAuth: true)
    adminData: String @auth(requiresAuth: true, roles: [ADMIN])
  }
`;
```

---

## Best Practices

### 1. Design for Client Needs
```typescript
// ✅ Good: Client-driven schema
type Query {
  # What the client actually needs
  dashboardData(userId: ID!): DashboardData!
}

type DashboardData {
  recentPosts: [Post!]!
  notifications: [Notification!]!
  stats: UserStats!
}

// ❌ Bad: Database-driven schema
type Query {
  posts(limit: Int, offset: Int): [Post!]!
  notifications(userId: ID!): [Notification!]!
  userStats(userId: ID!): UserStats!
}
```

### 2. Use Connection Pattern for Pagination
```typescript
// ✅ Good: Relay-style cursor pagination
type Query {
  users(first: Int, after: String): UserConnection!
}

type UserConnection {
  edges: [UserEdge!]!
  pageInfo: PageInfo!
  totalCount: Int!
}
```

### 3. Implement Proper Caching
```typescript
// Use DataLoader's built-in caching
const userLoader = new DataLoader(async (ids) => {
  // This batch function is called once per tick
  // Results are cached for the request
  return batchGetUsers(ids);
});

// For cross-request caching, use external cache
const userLoader = new DataLoader(async (ids) => {
  const cached = await redis.mget(ids.map(id => `user:${id}`));
  const missing = ids.filter((_, i) => !cached[i]);
  
  if (missing.length > 0) {
    const fromDb = await db.user.findMany({ where: { id: { in: missing } } });
    // Cache for 5 minutes
    for (const user of fromDb) {
      await redis.setex(`user:${user.id}`, 300, JSON.stringify(user));
    }
  }
  
  // Return in same order as ids
  return ids.map((id, i) => cached[i] ? JSON.parse(cached[i]) : fromDb.find(u => u.id === id));
});
```

---

## Anti-Patterns

### ❌ N+1 Queries
```typescript
// ❌ Bad: N+1 problem
const resolvers = {
  Post: {
    author: async (post) => {
      // Called once per post!
      return db.user.findById(post.authorId);
    }
  }
};

// ✅ Good: Use DataLoader
const resolvers = {
  Post: {
    author: async (post, _, { loaders }) => {
      return loaders.user.load(post.authorId);
    }
  }
};
```

### ❌ Exposing Database Structure
```typescript
// ❌ Bad: Direct database exposure
type User {
  id: ID!
  passwordHash: String!  # Never expose!
  internalNotes: String  # Internal data
}

// ✅ Good: Curated API
type User {
  id: ID!
  email: String!
  name: String!
  avatar: String
}
```

---

## Metrics to Track

| Metric | Target | Why It Matters |
|--------|--------|----------------|
| **Query Latency (p99)** | <500ms | User experience |
| **Resolver Execution Time** | Track | Performance hotspots |
| **Query Complexity** | <1000 | Prevent abuse |
| **Cache Hit Rate** | >70% | Efficiency |
| **Error Rate** | <1% | Reliability |

---

## Tools & Libraries

| Tool | Purpose | Best For |
|------|---------|----------|
| **Apollo Server** | GraphQL server | Full-featured |
| **GraphQL Yoga** | GraphQL server | Easy setup |
| **DataLoader** | Batching/caching | N+1 prevention |
| **GraphQL Code Generator** | Type generation | TypeScript |
| **Apollo Federation** | Schema composition | Microservices |

---

## Implementation Checklist

### Schema Design
- [ ] Types defined
- [ ] Relationships modeled
- [ ] Input types created
- [ ] Descriptions added

### Implementation
- [ ] Resolvers implemented
- [ ] DataLoaders configured
- [ ] Error handling added
- [ ] Authentication integrated

### Optimization
- [ ] N+1 queries prevented
- [ ] Query complexity limited
- [ ] Caching configured
- [ ] Subscriptions implemented

---

## Related Skills

- **REST API Design**: `skills/stack/api-design-rest/rest_api_design_v1/SKILL.md`
- **API Gateway**: `skills/architecture/api-gateway/api_gateway_v1/SKILL.md`
- **PostgreSQL**: `skills/stack/postgresql/postgresql_advanced_skill_v1/SKILL.md`

---

**Version:** 1.0.0
**Last Updated:** March 29, 2026
**Status:** ✅ Complete
