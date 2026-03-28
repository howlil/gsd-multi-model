---
name: authorization_v1
description: Authorization patterns, RBAC, ABAC, policy engines, permission management, and access control implementation
version: 1.0.0
tags: [security, authorization, rbac, abac, access-control, permissions, policy-engine]
category: security
triggers:
  keywords: [authorization, rbac, abac, permissions, access control, policy, entitlement]
  filePatterns: [authz/*.ts, authorization/*.ts, permissions/*.ts, policies/*.ts]
  commands: [authorization setup, rbac configuration, policy definition]
  projectArchetypes: [saas, enterprise-system, multi-tenant, api-service]
  modes: [greenfield, security-review, compliance]
prerequisites:
  - authentication_v1
  - appsec_v1
recommended_structure:
  directories:
    - src/authz/
    - src/authz/policies/
    - src/authz/roles/
    - src/authz/permissions/
workflow:
  setup:
    - Define authorization model
    - Identify resources and actions
    - Design role hierarchy
    - Select policy engine
  generate:
    - Implement policy evaluation
    - Create role management
    - Build permission checks
    - Add audit logging
  test:
    - Authorization unit tests
    - Policy evaluation tests
    - Penetration testing
    - Compliance validation
best_practices:
  - Least privilege by default
  - Centralized authorization logic
  - Policy as code
  - Regular access reviews
  - Attribute-based for fine-grained control
  - Cache policy decisions
  - Log all authorization decisions
anti_patterns:
  - Hardcoded authorization checks
  - Authorization in client only
  - Overly permissive defaults
  - No audit trail
  - Mixing authz with business logic
  - Stale permission caches
tools:
  - Open Policy Agent (OPA)
  - Cedar (AWS)
  - Permit.io
  - Casbin
  - Keycloak (RBAC)
metrics:
  - Authorization decision latency
  - Policy evaluation count
  - Denied request rate
  - Permission changes frequency
  - Access review completion
---

# Authorization Skill

## Overview

This skill provides comprehensive guidance on implementing authorization systems, including Role-Based Access Control (RBAC), Attribute-Based Access Control (ABAC), policy engines, permission management, and access control patterns for secure applications.

Authorization determines what authenticated users can do. This skill covers industry-standard patterns for building scalable, maintainable authorization systems.

## When to Use

- **Multi-user applications** with different access levels
- **Multi-tenant SaaS** requiring tenant isolation
- **Enterprise systems** with complex permission needs
- **Compliance requirements** (SOC2, HIPAA require access controls)
- **APIs** protecting resources
- **Admin interfaces** with elevated privileges

## When NOT to Use

- **Single-user applications** (no authorization needed)
- **Public resources only** (no access restrictions)
- **Network-level access sufficient** (use firewall rules)

---

## Core Concepts

### 1. RBAC (Role-Based Access Control)

```typescript
interface Role {
  id: string;
  name: string;
  description: string;
  permissions: Permission[];
  inherits?: Role[]; // Role hierarchy
}

interface Permission {
  resource: string;
  actions: Action[];
  conditions?: Condition[];
}

type Action = 'create' | 'read' | 'update' | 'delete' | 'execute';

class RBACService {
  private roles: Map<string, Role> = new Map();
  private userRoles: Map<string, Set<string>> = new Map();

  async checkPermission(
    userId: string,
    resource: string,
    action: Action
  ): Promise<boolean> {
    const userRoleIds = this.userRoles.get(userId) || new Set();
    
    for (const roleId of userRoleIds) {
      const role = this.roles.get(roleId);
      if (!role) continue;

      // Check role permissions (including inherited)
      for (const permission of this.getAllPermissions(role)) {
        if (permission.resource === resource && 
            permission.actions.includes(action)) {
          return true;
        }
      }
    }

    return false;
  }

  private getAllPermissions(role: Role, visited = new Set<string>()): Permission[] {
    if (visited.has(role.id)) return [];
    visited.add(role.id);

    const permissions = [...role.permissions];

    // Include inherited role permissions
    if (role.inherits) {
      for (const inherited of role.inherits) {
        permissions.push(...this.getAllPermissions(inherited, visited));
      }
    }

    return permissions;
  }

  // Common role hierarchy example
  createStandardRoles(): void {
    const viewer: Role = {
      id: 'viewer',
      name: 'Viewer',
      description: 'Read-only access',
      permissions: [
        { resource: 'documents', actions: ['read'] },
        { resource: 'reports', actions: ['read'] }
      ]
    };

    const editor: Role = {
      id: 'editor',
      name: 'Editor',
      description: 'Create and edit content',
      permissions: [
        { resource: 'documents', actions: ['create', 'read', 'update'] },
        { resource: 'reports', actions: ['create', 'read', 'update'] }
      ],
      inherits: [viewer]
    };

    const admin: Role = {
      id: 'admin',
      name: 'Admin',
      description: 'Full access',
      permissions: [
        { resource: 'documents', actions: ['create', 'read', 'update', 'delete'] },
        { resource: 'reports', actions: ['create', 'read', 'update', 'delete'] },
        { resource: 'users', actions: ['create', 'read', 'update', 'delete'] },
        { resource: 'settings', actions: ['read', 'update'] }
      ],
      inherits: [editor]
    };

    this.roles.set(viewer.id, viewer);
    this.roles.set(editor.id, editor);
    this.roles.set(admin.id, admin);
  }
}
```

### 2. ABAC (Attribute-Based Access Control)

```typescript
interface ABACPolicy {
  id: string;
  name: string;
  effect: 'allow' | 'deny';
  conditions: Condition[];
}

interface Condition {
  attribute: string;
  operator: 'equals' | 'not_equals' | 'in' | 'not_in' | 'greater_than' | 'less_than';
  value: any;
}

interface AuthorizationContext {
  subject: {
    id: string;
    attributes: Record<string, any>;
  };
  action: string;
  resource: {
    type: string;
    id: string;
    attributes: Record<string, any>;
  };
  environment: {
    time: Date;
    ip: string;
    location?: string;
  };
}

class ABACEngine {
  private policies: ABACPolicy[] = [];

  async evaluate(context: AuthorizationContext): Promise<boolean> {
    let decision = false;

    for (const policy of this.policies) {
      if (this.evaluatePolicy(policy, context)) {
        if (policy.effect === 'deny') {
          return false; // Explicit deny always wins
        }
        decision = true;
      }
    }

    return decision;
  }

  private evaluatePolicy(policy: ABACPolicy, context: AuthorizationContext): boolean {
    return policy.conditions.every(condition => 
      this.evaluateCondition(condition, context)
    );
  }

  private evaluateCondition(condition: Condition, context: AuthorizationContext): boolean {
    const value = this.getAttributeValue(condition.attribute, context);

    switch (condition.operator) {
      case 'equals':
        return value === condition.value;
      case 'not_equals':
        return value !== condition.value;
      case 'in':
        return condition.value.includes(value);
      case 'not_in':
        return !condition.value.includes(value);
      case 'greater_than':
        return value > condition.value;
      case 'less_than':
        return value < condition.value;
      default:
        return false;
    }
  }

  private getAttributeValue(attribute: string, context: AuthorizationContext): any {
    const parts = attribute.split('.');
    const root = parts[0];

    let obj: any;
    switch (root) {
      case 'subject':
        obj = context.subject.attributes;
        break;
      case 'resource':
        obj = context.resource.attributes;
        break;
      case 'environment':
        obj = context.environment;
        break;
      default:
        return undefined;
    }

    for (let i = 1; i < parts.length; i++) {
      obj = obj?.[parts[i]];
    }

    return obj;
  }

  // Example policies
  createPolicies(): void {
    // Policy: Managers can approve expenses up to $10,000
    this.policies.push({
      id: 'manager-expense-approval',
      name: 'Manager Expense Approval',
      effect: 'allow',
      conditions: [
        { attribute: 'subject.role', operator: 'equals', value: 'manager' },
        { attribute: 'action', operator: 'equals', value: 'approve' },
        { attribute: 'resource.type', operator: 'equals', value: 'expense' },
        { attribute: 'resource.attributes.amount', operator: 'less_than', value: 10000 },
        { attribute: 'resource.attributes.department', operator: 'equals', value: 'subject.attributes.department' }
      ]
    });

    // Policy: Users can only access their own data
    this.policies.push({
      id: 'own-data-access',
      name: 'Access Own Data',
      effect: 'allow',
      conditions: [
        { attribute: 'action', operator: 'equals', value: 'read' },
        { attribute: 'resource.attributes.ownerId', operator: 'equals', value: 'subject.id' }
      ]
    });

    // Policy: No access outside business hours
    this.policies.push({
      id: 'business-hours-only',
      name: 'Business Hours Access',
      effect: 'deny',
      conditions: [
        { 
          attribute: 'environment.time.getHours', 
          operator: 'or', 
          value: { 
            conditions: [
              { operator: 'less_than', value: 9 },
              { operator: 'greater_than', value: 18 }
            ]
          } 
        }
      ]
    });
  }
}
```

### 3. ReBAC (Relationship-Based Access Control)

```typescript
interface Relationship {
  subject: string; // User or group ID
  relation: string; // 'owner', 'member', 'viewer', etc.
  resource: string; // Resource ID
  resourceType: string;
}

class ReBACService {
  private relationships: Relationship[] = [];

  async checkAccess(
    userId: string,
    action: string,
    resourceType: string,
    resourceId: string
  ): Promise<boolean> {
    // Get all relationships for this user and resource
    const userRels = this.relationships.filter(r => 
      r.subject === userId && 
      r.resourceType === resourceType &&
      r.resource === resourceId
    );

    // Check if any relationship grants the action
    for (const rel of userRels) {
      if (this.relationGrantsAction(rel.relation, action)) {
        return true;
      }
    }

    // Check group memberships
    const groupMemberships = await this.getUserGroups(userId);
    for (const groupId of groupMemberships) {
      const groupRels = this.relationships.filter(r =>
        r.subject === groupId &&
        r.resourceType === resourceType &&
        r.resource === resourceId
      );

      for (const rel of groupRels) {
        if (this.relationGrantsAction(rel.relation, action)) {
          return true;
        }
      }
    }

    return false;
  }

  private relationGrantsAction(relation: string, action: string): boolean {
    const permissionMap: Record<string, string[]> = {
      'owner': ['read', 'write', 'delete', 'admin'],
      'editor': ['read', 'write'],
      'commenter': ['read', 'comment'],
      'viewer': ['read']
    };

    return permissionMap[relation]?.includes(action) || false;
  }

  // Example: Google Docs-style permissions
  async createDocument(ownerId: string, documentId: string): Promise<void> {
    // Owner has full access
    this.relationships.push({
      subject: ownerId,
      relation: 'owner',
      resource: documentId,
      resourceType: 'document'
    });
  }

  async shareDocument(
    documentId: string,
    userId: string,
    relation: 'viewer' | 'commenter' | 'editor'
  ): Promise<void> {
    this.relationships.push({
      subject: userId,
      relation,
      resource: documentId,
      resourceType: 'document'
    });
  }
}
```

### 4. Policy Engine Integration (OPA)

```typescript
// Rego policy example
const regoPolicy = `
package authz

import future.keywords.in
import future.keywords.every

# Allow if user has required role
allow if {
    some role in input.user.roles
    role == required_role
}

# Allow if user is resource owner
allow if {
    input.user.id == input.resource.owner_id
}

# Deny if request is outside business hours
deny if {
    input.environment.hour < 9
    input.environment.hour > 18
}

# Required role based on action
required_role == "admin" if {
    input.action == "delete"
}

required_role == "editor" if {
    input.action == "update"
}

required_role == "viewer" if {
    input.action == "read"
}
`;

class OPAAuthorizer {
  private opaClient: OPAClient;

  async check(request: AuthorizationRequest): Promise<AuthorizationResult> {
    const response = await this.opaClient.evaluate({
      input: request,
      policy: 'authz'
    });

    return {
      allowed: response.result.allow === true,
      denied: response.result.deny === true,
      reason: response.reason
    };
  }
}
```

### 5. Middleware Implementation

```typescript
// Express middleware for authorization
function authorize(
  resource: string,
  action: Action,
  options?: { checkOwner?: boolean }
) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user.id;
      const resourceId = options?.checkOwner 
        ? await getResourceOwnerId(req.params.id)
        : undefined;

      // Check permission
      const allowed = await authzService.checkPermission(
        userId,
        resource,
        action,
        resourceId
      );

      if (!allowed) {
        return res.status(403).json({
          error: 'Forbidden',
          message: `Insufficient permissions to ${action} ${resource}`
        });
      }

      // Attach permission info to request
      req.permission = { resource, action, granted: true };
      next();
    } catch (error) {
      next(error);
    }
  };
}

// Usage example
app.get('/documents/:id', 
  authenticate,
  authorize('documents', 'read', { checkOwner: false }),
  async (req, res) => {
    const document = await getDocument(req.params.id);
    res.json(document);
  }
);

app.delete('/documents/:id',
  authenticate,
  authorize('documents', 'delete'),
  async (req, res) => {
    await deleteDocument(req.params.id);
    res.status(204).send();
  }
);
```

### 6. Audit Logging

```typescript
interface AuthorizationAuditLog {
  timestamp: Date;
  userId: string;
  action: string;
  resource: string;
  resourceId: string;
  decision: 'allowed' | 'denied';
  policyId?: string;
  reason?: string;
  context: {
    ip: string;
    userAgent: string;
    sessionId: string;
  };
}

class AuthorizationAuditor {
  private logger: AuditLogger;

  async log(decision: AuthorizationDecision, request: AuthorizationRequest): Promise<void> {
    await this.logger.write('authorization', {
      timestamp: new Date(),
      userId: request.subject.id,
      action: request.action,
      resource: request.resource.type,
      resourceId: request.resource.id,
      decision: decision.allowed ? 'allowed' : 'denied',
      policyId: decision.policyId,
      reason: decision.reason,
      context: {
        ip: request.environment.ip,
        userAgent: request.environment.userAgent,
        sessionId: request.subject.sessionId
      }
    });
  }

  async getAccessHistory(
    userId: string,
    resourceType: string,
    startTime: Date,
    endTime: Date
  ): Promise<AuthorizationAuditLog[]> {
    return await this.logger.query({
      type: 'authorization',
      filters: {
        userId,
        resource: resourceType,
        timestamp: { gte: startTime, lte: endTime }
      }
    });
  }

  async getDeniedAttempts(
    startTime: Date,
    endTime: Date
  ): Promise<AuthorizationAuditLog[]> {
    return await this.logger.query({
      type: 'authorization',
      filters: {
        decision: 'denied',
        timestamp: { gte: startTime, lte: endTime }
      }
    });
  }
}
```

---

## Best Practices

### 1. Centralize Authorization Logic
```typescript
// ✅ Good: Centralized service
class AuthorizationService {
  async check(ctx: AuthzContext): Promise<boolean> {
    // All authorization logic in one place
  }
}

// ❌ Bad: Scattered checks
if (user.role === 'admin') { ... }
if (user.id === doc.ownerId) { ... }
```

### 2. Default Deny
```typescript
// ✅ Good: Explicit allow required
class PolicyEngine {
  evaluate(): boolean {
    // Default: deny
    // Only allow if policy matches
  }
}
```

### 3. Cache Policy Decisions
```typescript
class CachedAuthorizer {
  private cache: LRUCache<string, boolean>;

  async check(ctx: AuthzContext): Promise<boolean> {
    const key = this.cacheKey(ctx);
    
    const cached = this.cache.get(key);
    if (cached !== undefined) return cached;

    const result = await this.engine.evaluate(ctx);
    this.cache.set(key, result, 60000); // 1 min cache
    
    return result;
  }
}
```

---

## Anti-Patterns

### ❌ Hardcoded Authorization
```typescript
// ❌ Bad
if (user.role === 'admin') {
  // do admin thing
}

// ✅ Good
if (await authz.check(user, 'admin', 'dashboard')) {
  // do admin thing
}
```

### ❌ Client-Side Only Authorization
```typescript
// ❌ Bad: Only checks in UI
<button *ngIf="user.role === 'admin'">Delete</button>

// ✅ Good: Also check on server
app.delete('/items/:id', authenticate, authorize('items', 'delete'), handler);
```

---

## Metrics to Track

| Metric | Target | Why It Matters |
|--------|--------|----------------|
| **Decision Latency (p99)** | <10ms | Performance |
| **Denied Request Rate** | Monitor | Security/UX |
| **Policy Evaluation Count** | Track | Complexity |
| **Permission Changes** | Track | Churn |
| **Access Review Completion** | 100% | Compliance |

---

## Tools & Libraries

| Tool | Purpose | Best For |
|------|---------|----------|
| **OPA** | Policy engine | General purpose |
| **Cedar** | Policy engine | AWS ecosystem |
| **Casbin** | Authorization library | Multi-language |
| **Permit.io** | Managed authz | SaaS option |
| **Keycloak** | IAM with RBAC | Full IAM |

---

## Implementation Checklist

### Core Authorization
- [ ] Authorization model defined
- [ ] Policy engine selected
- [ ] RBAC/ABAC implemented
- [ ] Middleware created
- [ ] Default deny configured

### Policy Management
- [ ] Policies as code
- [ ] Policy versioning
- [ ] Policy testing
- [ ] Policy documentation

### Audit & Compliance
- [ ] Decision logging
- [ ] Access history
- [ ] Denied attempt tracking
- [ ] Regular access reviews

### Performance
- [ ] Decision caching
- [ ] Policy optimization
- [ ] Latency monitoring

---

## Related Skills

- **Authentication**: `skills/security/authentication/authentication_v1/SKILL.md`
- **Application Security**: `skills/security/appsec/appsec_v1/SKILL.md`
- **RBAC Authorization**: `skills/architecture/rbac-authorization/rbac_authorization_v1/SKILL.md`

---

**Version:** 1.0.0
**Last Updated:** March 29, 2026
**Status:** ✅ Complete
