---
name: appsec_v1
description: Application security best practices, OWASP Top 10, secure coding, vulnerability prevention, and security engineering patterns
version: 1.0.0
tags: [security, appsec, application-security, owasp, secure-coding, vulnerability, threat-prevention]
category: security
triggers:
  keywords: [security, owasp, vulnerability, secure coding, application security, security review]
  filePatterns: [security/*.ts, auth/*.ts, middleware/security/*.ts]
  commands: [security review, threat modeling, security audit]
  projectArchetypes: [web-application, api-service, enterprise-system, fintech, healthcare]
  modes: [greenfield, security-review, compliance]
prerequisites:
  - devsecops_skill_v1
  - security_owasp_skill_v1
  - code_quality_standards_skill_v1
recommended_structure:
  directories:
    - src/security/
    - src/security/middleware/
    - src/security/validators/
    - src/security/encryption/
    - src/security/audit/
workflow:
  setup:
    - Define security requirements
    - Establish threat model
    - Set up security tooling
    - Create security baseline
  generate:
    - Implement security middleware
    - Add input validation
    - Configure security headers
    - Implement logging and monitoring
  test:
    - Security unit tests
    - Penetration testing
    - SAST/DAST scanning
    - Dependency vulnerability scanning
best_practices:
  - Shift-left security (integrate early)
  - Defense in depth (multiple layers)
  - Principle of least privilege
  - Secure by default configuration
  - Input validation on all boundaries
  - Output encoding for context
  - Centralized security logging
  - Regular dependency updates
anti_patterns:
  - Security as afterthought
  - Rolling custom cryptography
  - Trusting client-side validation only
  - Logging sensitive data
  - Hardcoded credentials
  - Ignoring security headers
  - No rate limiting
tools:
  - SAST: SonarQube, Semgrep, CodeQL
  - DAST: OWASP ZAP, Burp Suite
  - SCA: Snyk, Dependabot, npm audit
  - Secrets: HashiCorp Vault, AWS Secrets Manager
metrics:
  - Security test coverage
  - Vulnerability count by severity
  - Mean time to remediate
  - Dependency update frequency
  - Security incident count
  - False positive rate
---

# Application Security Skill

## Overview

This skill provides comprehensive guidance on application security (AppSec), including OWASP Top 10 prevention, secure coding practices, vulnerability prevention, security architecture patterns, and security engineering for building secure software systems.

Application security focuses on protecting applications from threats and vulnerabilities throughout the software development lifecycle, from design through deployment and maintenance.

## When to Use

- **Building new applications** (integrate security from start)
- **Security reviews and audits** (assess current state)
- **Compliance requirements** (SOC2, HIPAA, PCI-DSS)
- **After security incidents** (prevent recurrence)
- **Handling sensitive data** (PII, financial, health)
- **Public-facing applications** (higher threat exposure)

## When NOT to Use

- **Internal prototypes only** (minimal security may suffice)
- **Offline/single-user tools** (reduced attack surface)
- **When security requirements explicitly excluded** (document this)

---

## Core Concepts

### 1. OWASP Top 10 2025 Prevention

#### A01: Broken Access Control
```typescript
// ❌ Bad: Client-side only checks
app.delete('/users/:id', (req, res) => {
  // Trusting client-provided userId
  db.delete('users', { id: req.params.id });
});

// ✅ Good: Server-side enforcement with RBAC
app.delete('/users/:id', authenticate, authorize('admin'), async (req, res) => {
  const userId = req.params.id;
  
  // Verify ownership or admin rights
  const user = await db.getUser(userId);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  
  // Check authorization
  if (req.user.role !== 'admin' && req.user.id !== userId) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  
  await db.delete('users', { id: userId });
  res.status(204).send();
});

// ✅ Best: Centralized authorization service
class AuthorizationService {
  async checkPermission(
    subject: Principal,
    action: string,
    resource: Resource
  ): Promise<boolean> {
    const policy = await this.policyEngine.evaluate({
      subject,
      action,
      resource
    });
    
    if (!policy.allowed) {
      await this.auditLog.denied(subject, action, resource);
      return false;
    }
    
    return true;
  }
}
```

#### A02: Cryptographic Failures
```typescript
// ❌ Bad: Weak/insecure cryptography
const hash = crypto.createHash('md5').update(password).digest('hex');
const encrypted = crypto.createCipher('aes-128-ecb', key).update(data);

// ✅ Good: Strong, modern cryptography
import { scrypt, randomBytes, createCipheriv } from 'crypto';

// Password hashing with scrypt
async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  const derivedKey = await scrypt(password, salt, 64);
  return `${salt}:${derivedKey.toString('hex')}`;
}

// Encryption with AES-GCM
function encrypt(data: string, key: Buffer): { ciphertext: string; iv: string; tag: string } {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  
  let ciphertext = cipher.update(data, 'utf8', 'hex');
  ciphertext += cipher.final('hex');
  
  return {
    ciphertext,
    iv: iv.toString('hex'),
    tag: cipher.getAuthTag().toString('hex')
  };
}

// ✅ Best: Use established libraries
import { argon2 } from 'argon2';
import { sealedbox } from 'tweetnacl';

const hash = await argon2.hash(password, { type: argon2.argon2id });
```

#### A03: Injection
```typescript
// ❌ Bad: SQL injection vulnerable
const user = await db.query(
  `SELECT * FROM users WHERE email = '${email}' AND password = '${password}'`
);

// ✅ Good: Parameterized queries
const user = await db.query(
  'SELECT * FROM users WHERE email = $1 AND password = $2',
  [email, password]
);

// ✅ Best: ORM with built-in protection
const user = await User.findOne({ where: { email, password } });

// ❌ Bad: Command injection
const result = execSync(`cat ${userInput}`);

// ✅ Good: Input validation + safe execution
const sanitized = path.basename(userInput); // Remove path traversal
const result = await execFile('cat', [sanitized]);

// ❌ Bad: NoSQL injection
const user = await db.collection('users').findOne({
  $where: `this.username === '${username}'`
});

// ✅ Good: Safe NoSQL queries
const user = await db.collection('users').findOne({ username });
```

#### A04: Insecure Design
```typescript
// ❌ Bad: No rate limiting allows brute force
app.post('/login', async (req, res) => {
  const user = await authenticate(req.body);
  // Unlimited attempts possible
});

// ✅ Good: Rate limiting + account lockout
class LoginService {
  private rateLimiter: RateLimiter;
  private lockoutService: AccountLockout;

  async login(credentials: Credentials): Promise<AuthToken> {
    // Check rate limit
    const rateLimitKey = `login:${credentials.ip}`;
    await this.rateLimiter.check(rateLimitKey, { limit: 5, window: '1m' });

    // Check account lockout
    if (await this.lockoutService.isLocked(credentials.username)) {
      throw new AccountLockedError();
    }

    try {
      const user = await this.authenticate(credentials);
      await this.lockoutService.reset(credentials.username);
      return this.generateToken(user);
    } catch (error) {
      await this.lockoutService.recordFailure(credentials.username);
      throw error;
    }
  }
}
```

#### A05: Security Misconfiguration
```typescript
// ❌ Bad: Verbose error messages in production
app.use((err, req, res, next) => {
  res.status(500).json({
    error: err.message,
    stack: err.stack,
    details: err.details
  });
});

// ✅ Good: Generic errors in production
app.use((err, req, res, next) => {
  // Log full error internally
  logger.error('Request error', { err, requestId: req.id });

  // Return generic error to client
  res.status(500).json({
    error: 'Internal server error',
    requestId: req.id
  });
});

// ✅ Best: Security headers configured
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"]
    }
  },
  hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
  noSniff: true,
  xssFilter: true
}));
```

#### A06: Vulnerable and Outdated Components
```typescript
// ❌ Bad: No dependency scanning
// package.json with known vulnerabilities

// ✅ Good: Automated dependency updates
// .github/dependabot.yml
version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "daily"
    open-pull-requests-limit: 10

// ✅ Best: CI/CD security gates
// .github/workflows/security.yml
jobs:
  security-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Run npm audit
        run: npm audit --audit-level=moderate
      - name: Run Snyk
        uses: snyk/actions/node@master
        env:
          SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
```

#### A07: Identification and Authentication Failures
```typescript
// ❌ Bad: Weak password policy
app.post('/register', async (req, res) => {
  const user = await User.create({
    email: req.body.email,
    password: req.body.password // No validation
  });
});

// ✅ Good: Strong authentication
class AuthenticationService {
  async register(userData: RegisterData): Promise<User> {
    // Validate password strength
    this.validatePassword(userData.password);
    
    // Hash password
    const passwordHash = await argon2.hash(userData.password);
    
    // Create user
    return await User.create({
      ...userData,
      password: passwordHash
    });
  }

  private validatePassword(password: string): void {
    const requirements = [
      { regex: /.{12,}/, message: 'At least 12 characters' },
      { regex: /[A-Z]/, message: 'One uppercase letter' },
      { regex: /[a-z]/, message: 'One lowercase letter' },
      { regex: /[0-9]/, message: 'One number' },
      { regex: /[^A-Za-z0-9]/, message: 'One special character' }
    ];

    for (const req of requirements) {
      if (!req.regex.test(password)) {
        throw new ValidationError(req.message);
      }
    }
  }
}

// ✅ Best: Multi-factor authentication
class MFAService {
  async enableMFA(userId: string): Promise<MFASetup> {
    const secret = randomBytes(32);
    const uri = otpauth({ secret, issuer: 'MyApp', user: userId });
    
    await this.userStore.setMFASecret(userId, secret);
    
    return {
      secret: secret.toString('base64'),
      qrCode: await this.generateQR(uri),
      backupCodes: await this.generateBackupCodes(10)
    };
  }

  async verifyMFA(userId: string, token: string): Promise<boolean> {
    const secret = await this.userStore.getMFASecret(userId);
    return totp.verify({ secret, token, window: 1 });
  }
}
```

#### A08: Software and Data Integrity Failures
```typescript
// ❌ Bad: No integrity verification
const updateScript = await fetch('https://cdn.example.com/update.js');
eval(updateScript);

// ✅ Good: Subresource Integrity
// <script src="https://cdn.example.com/update.js" 
//         integrity="sha384-..." crossorigin="anonymous"></script>

// ✅ Best: Signed artifacts
class ArtifactVerifier {
  private publicKey: CryptoKey;

  async verifySignature(artifact: Buffer, signature: Buffer): Promise<boolean> {
    return await crypto.subtle.verify(
      'RSASSA-PKCS1-v1_5',
      this.publicKey,
      signature,
      artifact
    );
  }

  async loadVerifiedArtifact(url: string, expectedSig: string): Promise<any> {
    const [artifact, signature] = await Promise.all([
      fetch(url).then(r => r.arrayBuffer()),
      fetch(expectedSig).then(r => r.arrayBuffer())
    ]);

    const isValid = await this.verifySignature(
      Buffer.from(artifact),
      Buffer.from(signature)
    );

    if (!isValid) {
      throw new IntegrityError('Artifact signature verification failed');
    }

    return JSON.parse(Buffer.from(artifact).toString());
  }
}
```

#### A09: Security Logging and Monitoring Failures
```typescript
// ❌ Bad: No security logging
app.post('/login', async (req, res) => {
  try {
    const user = await authenticate(req.body);
    res.json({ token: generateToken(user) });
  } catch (error) {
    res.status(401).json({ error: 'Invalid credentials' });
  }
});

// ✅ Good: Comprehensive security logging
class SecurityLogger {
  async logAuthenticationAttempt(
    username: string,
    ip: string,
    success: boolean,
    details?: Record<string, any>
  ): Promise<void> {
    await this.logger.info('authentication_attempt', {
      event: 'AUTH_ATTEMPT',
      username,
      ip,
      success,
      timestamp: new Date().toISOString(),
      ...details
    });

    // Alert on suspicious activity
    if (!success) {
      await this.checkForBruteForce(username, ip);
    }
  }

  async logAuthorizationDecision(
    userId: string,
    action: string,
    resource: string,
    allowed: boolean
  ): Promise<void> {
    await this.logger.info('authorization_decision', {
      event: 'AUTHZ_DECISION',
      userId,
      action,
      resource,
      allowed,
      timestamp: new Date().toISOString()
    });
  }
}
```

#### A10: Server-Side Request Forgery (SSRF)
```typescript
// ❌ Bad: Unvalidated URL fetch
app.post('/fetch', async (req, res) => {
  const url = req.body.url;
  const response = await fetch(url); // SSRF vulnerability!
  res.send(await response.text());
});

// ✅ Good: URL validation
import { isIP } from 'net';
import { parse } from 'url';

class SSRFProtection {
  private blockedIPs = ['127.0.0.1', '::1', '0.0.0.0'];
  private allowedHosts: string[];

  async safeFetch(url: string): Promise<Response> {
    // Parse and validate URL
    const parsed = parse(url);
    
    if (!parsed.protocol || !parsed.hostname) {
      throw new Error('Invalid URL');
    }

    // Check protocol
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      throw new Error('Invalid protocol');
    }

    // Check against allowlist
    if (this.allowedHosts && !this.allowedHosts.includes(parsed.hostname)) {
      throw new Error('Host not allowed');
    }

    // Resolve and check IP
    const addresses = await dns.promises.lookup(parsed.hostname, { all: true });
    
    for (const addr of addresses) {
      if (this.isPrivateIP(addr.address)) {
        throw new Error('Private IP not allowed');
      }
    }

    // Safe to fetch
    return await fetch(url);
  }

  private isPrivateIP(ip: string): boolean {
    // Check for private IP ranges
    const privateRanges = [
      /^10\./,
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
      /^192\.168\./,
      /^127\./,
      /^::1$/,
      /^fc00:/,
      /^fe80:/
    ];
    
    return privateRanges.some(regex => regex.test(ip));
  }
}
```

### 2. Security Architecture Patterns

#### Defense in Depth
```typescript
class DefenseInDepth {
  // Layer 1: Network security
  private firewall: Firewall;
  
  // Layer 2: Authentication
  private auth: AuthenticationService;
  
  // Layer 3: Authorization
  private authorization: AuthorizationService;
  
  // Layer 4: Input validation
  private validator: InputValidator;
  
  // Layer 5: Business logic security
  private businessLogic: SecureBusinessLogic;

  async handleRequest(request: Request): Promise<Response> {
    // Each layer provides independent protection
    await this.firewall.check(request.ip);
    const user = await this.auth.authenticate(request);
    await this.authorization.check(user, request.action);
    const validatedInput = await this.validator.validate(request.input);
    return await this.businessLogic.execute(user, validatedInput);
  }
}
```

#### Zero Trust Architecture
```typescript
class ZeroTrustMiddleware {
  async handle(request: Request, next: NextFunction): Promise<void> {
    // Never trust, always verify
    const identity = await this.verifyIdentity(request);
    const device = await this.verifyDevice(request.deviceId);
    const context = await this.assessContext(request);

    // Continuous verification
    const trustScore = this.calculateTrustScore({
      identity,
      device,
      context,
      behavior: await this.analyzeBehavior(identity)
    });

    if (trustScore < this.threshold) {
      await this.requireStepUpAuth(identity);
    }

    request.trustScore = trustScore;
    request.identity = identity;
    
    next();
  }
}
```

---

## Best Practices

### 1. Shift-Left Security
```typescript
// Integrate security early in development
const securityGates = {
  preCommit: ['secret-scan', 'lint-security'],
  pullRequest: ['sast', 'dependency-check', 'iac-scan'],
  preDeploy: ['dast', 'container-scan', 'compliance-check']
};
```

### 2. Secure by Default
```typescript
// ✅ Good: Secure defaults
const defaultConfig = {
  https: true,
  secureCookies: true,
  csrfProtection: true,
  rateLimiting: true,
  logging: 'verbose',
  debugMode: false
};
```

### 3. Principle of Least Privilege
```typescript
// ✅ Good: Minimal permissions
const serviceAccount = {
  permissions: [
    'storage.objects.get',
    'storage.objects.create'
    // NOT: 'storage.*'
  ],
  resources: [
    'projects/my-project/buckets/specific-bucket'
    // NOT: 'projects/my-project'
  ]
};
```

---

## Anti-Patterns

### ❌ Custom Cryptography
```typescript
// ❌ Never roll your own crypto
function customEncrypt(data: string): string {
  return data.split('').map(c => 
    String.fromCharCode(c.charCodeAt(0) + 3)
  ).join('');
}

// ✅ Use established libraries
import { sealedbox } from 'tweetnacl';
const encrypted = sealedbox(message, publicKey);
```

### ❌ Logging Sensitive Data
```typescript
// ❌ Bad: Logging credentials
logger.info('Login attempt', { username, password });

// ✅ Good: Log only necessary info
logger.info('Login attempt', { 
  username, 
  timestamp: new Date(),
  ip: req.ip,
  success: true 
});
```

---

## Metrics to Track

| Metric | Target | Why It Matters |
|--------|--------|----------------|
| **Vulnerability Count (Critical)** | 0 | Security posture |
| **Mean Time to Remediate** | <7 days | Response capability |
| **Security Test Coverage** | >80% | Test completeness |
| **Dependency Update Lag** | <30 days | Freshness |
| **Security Incident Count** | 0 | Actual breaches |
| **False Positive Rate** | <10% | Tool effectiveness |

---

## Tools & Libraries

| Tool | Purpose | Best For |
|------|---------|----------|
| **SonarQube** | SAST | Code quality + security |
| **Semgrep** | SAST | Custom rules |
| **OWASP ZAP** | DAST | Automated scanning |
| **Snyk** | SCA | Dependency scanning |
| **HashiCorp Vault** | Secrets | Secret management |
| **Helmet** | Headers | Express security |
| **express-rate-limit** | Rate limiting | API protection |
| **validator.js** | Validation | Input sanitization |

---

## Implementation Checklist

### Security Controls
- [ ] Authentication implemented
- [ ] Authorization enforced
- [ ] Input validation on all inputs
- [ ] Output encoding configured
- [ ] Security headers set
- [ ] Rate limiting enabled
- [ ] CORS configured properly

### Cryptography
- [ ] Passwords hashed (argon2/bcrypt)
- [ ] Data encrypted at rest
- [ ] TLS for data in transit
- [ ] Secure random generation
- [ ] Key management configured

### Monitoring
- [ ] Security logging enabled
- [ ] Alerting configured
- [ ] Audit trail maintained
- [ ] Anomaly detection active

### Testing
- [ ] SAST in CI/CD
- [ ] DAST scheduled
- [ ] Dependency scanning enabled
- [ ] Penetration testing planned

---

## Related Skills

- **OWASP Security**: `skills/governance/security-owasp/security_owasp_skill_v1/SKILL.md`
- **DevSecOps**: `skills/security/devsecops/devsecops_skill_v1/SKILL.md`
- **Authentication**: `skills/security/authentication/authentication_v1/SKILL.md`
- **Authorization**: `skills/security/authorization/authorization_v1/SKILL.md`

---

**Version:** 1.0.0
**Last Updated:** March 29, 2026
**Status:** ✅ Complete
