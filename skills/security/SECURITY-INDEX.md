# Security Skills Index

**Version:** 1.0
**Category:** security

## Overview

Security skills provide comprehensive guidance on application security, authentication, authorization, threat modeling, and DevSecOps practices for building secure software systems.

## Available Security Skills

| Skill | Directory | Focus Area | Status |
|-------|-----------|------------|--------|
| **DevSecOps** | `devsecops/devsecops_skill_v1/` | Security in CI/CD | ✅ Complete |
| **AppSec** | `appsec/appsec_v1/` | Application security, OWASP Top 10 | ✅ Complete |
| **Authentication** | `authentication/authentication_v1/` | OAuth2, OIDC, JWT, MFA | ✅ Complete |
| **Authorization** | `authorization/authorization_v1/` | RBAC, ABAC, policy engines | ✅ Complete |
| **Threat Modeling** | `threat-modeling/threat_modeling_v1/` | STRIDE, attack trees, risk assessment | ✅ Complete |
| **Cryptography** | `cryptography/cryptography_v1/` | Encryption, hashing, key management | 📁 Directory Ready |

## Security Skill Categories

### Application Security
- **AppSec**: OWASP Top 10 prevention, secure coding
- **Threat Modeling**: Proactive threat identification and mitigation

### Identity & Access
- **Authentication**: User identity verification, MFA
- **Authorization**: Access control, permissions, policies

### Operations
- **DevSecOps**: Security automation in CI/CD

### Foundation
- **Cryptography**: Encryption, hashing, key management (Directory Ready)

## Usage

```javascript
const { SkillRegistry } = require('./ez-agents/bin/lib/skill-registry');
const registry = new SkillRegistry();
await registry.load();

// Get all security skills
const securitySkills = registry.findByCategory('security');

// Get specific skill
const appsecSkill = registry.get('appsec_v1');
const authSkill = registry.get('authentication_v1');
const threatModelingSkill = registry.get('threat_modeling_v1');
```

## Security Integration Points

| Phase | Skills to Apply |
|-------|-----------------|
| **Design** | Threat Modeling, Authentication, Authorization |
| **Development** | AppSec, Cryptography |
| **CI/CD** | DevSecOps |
| **Operations** | All security skills |

## Related Categories

- **Governance**: `governance/GOVERNANCE-INDEX.md` (compliance, privacy)
- **Testing**: `testing/TESTING-INDEX.md` (security testing)
- **DevOps**: `devops/DEVOPS-INDEX.md` (secure deployment)
- **Architecture**: `architecture/ARCHITECTURE-INDEX.md` (security patterns)

---

**Last Updated:** March 29, 2026
**Total Skills:** 5 Complete, 1 Directory Ready
