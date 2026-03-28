---
name: authentication_v1
description: Authentication patterns, OAuth2, OIDC, JWT, session management, MFA, and secure identity verification
version: 1.0.0
tags: [security, authentication, oauth2, oidc, jwt, session, mfa, identity]
category: security
triggers:
  keywords: [authentication, login, oauth, oidc, jwt, session, mfa, 2fa, saml]
  filePatterns: [auth/*.ts, authentication/*.ts, identity/*.ts, oauth/*.ts]
  commands: [auth implementation, oauth setup, sso configuration]
  projectArchetypes: [web-application, api-service, saas, enterprise-system]
  modes: [greenfield, security-review, integration]
prerequisites:
  - appsec_v1
  - security_owasp_skill_v1
recommended_structure:
  directories:
    - src/auth/
    - src/auth/providers/
    - src/auth/middleware/
    - src/auth/tokens/
    - src/auth/sessions/
workflow:
  setup:
    - Define authentication requirements
    - Select authentication providers
    - Configure identity providers
    - Set up token management
  generate:
    - Implement auth middleware
    - Create login/logout flows
    - Add MFA support
    - Configure session management
  test:
    - Authentication flow tests
    - Token validation tests
    - MFA verification tests
    - Security penetration tests
best_practices:
  - Use established protocols (OAuth2, OIDC)
  - Implement MFA for sensitive operations
  - Short-lived access tokens with refresh
  - Secure session storage
  - Rate limit authentication attempts
  - Log all authentication events
  - Implement account recovery securely
anti_patterns:
  - Rolling custom authentication
  - Long-lived access tokens
  - Storing tokens in localStorage
  - No rate limiting on auth endpoints
  - Weak password policies
  - Insecure password recovery
  - Missing MFA for sensitive ops
tools:
  - Auth0 / Okta
  - Keycloak (self-hosted)
  - NextAuth.js / Auth.js
  - Passport.js
  - jose (JWT handling)
metrics:
  - Authentication success rate
  - Failed login attempts
  - MFA adoption rate
  - Token refresh rate
  - Session duration distribution
  - Account lockout incidents
---

# Authentication Skill

## Overview

This skill provides comprehensive guidance on implementing secure authentication systems, including OAuth2, OpenID Connect (OIDC), JWT tokens, session management, multi-factor authentication (MFA), and identity verification patterns for modern applications.

Authentication verifies user identity and is the foundation of application security. This skill covers industry-standard protocols and patterns for building secure, scalable authentication systems.

## When to Use

- **User login required** for application access
- **Single Sign-On (SSO)** needs across applications
- **API authentication** for service-to-service communication
- **Compliance requirements** (SOC2, HIPAA require strong auth)
- **Multi-tenant applications** with isolated user bases
- **Mobile + Web** applications needing unified auth

## When NOT to Use

- **Public-only content** with no user-specific features
- **Internal tools** with network-level security
- **Proof-of-concept** where auth can be added later

---

## Core Concepts

### 1. Authentication Protocols

#### OAuth2 Flows

```typescript
// Authorization Code Flow (Recommended for web apps)
class OAuth2AuthorizationCode {
  private clientId: string;
  private clientSecret: string;
  private redirectUri: string;
  private authorizationEndpoint: string;
  private tokenEndpoint: string;

  // Step 1: Redirect to authorization server
  getAuthorizationUrl(state: string, scopes: string[]): string {
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      response_type: 'code',
      scope: scopes.join(' '),
      state, // CSRF protection
      code_challenge: this.generatePKCE(), // PKCE for public clients
      code_challenge_method: 'S256'
    });

    return `${this.authorizationEndpoint}?${params}`;
  }

  // Step 2: Exchange code for tokens
  async exchangeCode(code: string, codeVerifier: string): Promise<OAuth2Tokens> {
    const response = await fetch(this.tokenEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: this.clientId,
        client_secret: this.clientSecret,
        code,
        redirect_uri: this.redirectUri,
        code_verifier: codeVerifier
      })
    });

    if (!response.ok) {
      throw new OAuth2Error('Token exchange failed');
    }

    return await response.json();
  }

  // Step 3: Refresh access token
  async refreshAccessToken(refreshToken: string): Promise<OAuth2Tokens> {
    const response = await fetch(this.tokenEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: this.clientId,
        client_secret: this.clientSecret,
        refresh_token: refreshToken
      })
    });

    return await response.json();
  }
}
```

#### OpenID Connect (OIDC)

```typescript
interface IDToken {
  iss: string; // Issuer
  sub: string; // Subject (user ID)
  aud: string | string[]; // Audience
  exp: number; // Expiration
  iat: number; // Issued at
  nonce: string; // Nonce from auth request
  email?: string;
  email_verified?: boolean;
  name?: string;
  picture?: string;
}

class OIDCClient {
  private oauth2: OAuth2AuthorizationCode;
  private issuer: string;
  private jwksUri: string;

  async authenticate(code: string): Promise<AuthenticatedUser> {
    // Exchange code for tokens
    const tokens = await this.oauth2.exchangeCode(code);
    
    // Validate ID token
    const idToken = await this.validateIDToken(tokens.id_token);
    
    // Get user info
    const userInfo = await this.getUserInfo(tokens.access_token);

    return {
      id: idToken.sub,
      email: idToken.email || userInfo.email,
      name: idToken.name || userInfo.name,
      picture: idToken.picture || userInfo.picture,
      emailVerified: idToken.email_verified || false,
      tokens
    };
  }

  private async validateIDToken(idToken: string): Promise<IDToken> {
    // Decode without verification (for header)
    const { header } = decodeJwt(idToken);
    
    // Get signing key from JWKS
    const key = await this.getSigningKey(header.kid);
    
    // Verify signature
    const payload = await verifyJwt(idToken, key);
    
    // Validate claims
    this.validateClaims(payload);
    
    return payload as IDToken;
  }

  private validateClaims(token: IDToken): void {
    const now = Math.floor(Date.now() / 1000);
    
    if (token.iss !== this.issuer) {
      throw new Error('Invalid issuer');
    }
    
    if (!Array.isArray(token.aud) ? token.aud !== this.clientId : 
        !token.aud.includes(this.clientId)) {
      throw new Error('Invalid audience');
    }
    
    if (token.exp < now) {
      throw new Error('Token expired');
    }
    
    if (token.iat > now) {
      throw new Error('Token issued in future');
    }
  }
}
```

### 2. JWT Token Management

```typescript
interface JWTPayload {
  sub: string; // Subject
  iat: number; // Issued at
  exp: number; // Expiration
  iss: string; // Issuer
  aud: string; // Audience
  jti: string; // JWT ID (unique identifier)
  // Custom claims
  email: string;
  role: string;
  permissions: string[];
}

class TokenService {
  private accessSecret: string;
  private refreshSecret: string;
  private accessTokenExpiry: string = '15m';
  private refreshTokenExpiry: string = '7d';

  async generateTokens(user: User): Promise<TokenPair> {
    const accessToken = await this.generateAccessToken(user);
    const refreshToken = await this.generateRefreshToken(user);

    // Store refresh token hash in database
    await this.tokenStore.saveRefreshToken({
      userId: user.id,
      tokenHash: await this.hash(refreshToken),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      userAgent: user.lastUserAgent
    });

    return { accessToken, refreshToken };
  }

  private async generateAccessToken(user: User): Promise<string> {
    return sign(
      {
        sub: user.id,
        email: user.email,
        role: user.role,
        permissions: user.permissions,
        jti: crypto.randomUUID()
      },
      this.accessSecret,
      { expiresIn: this.accessTokenExpiry }
    );
  }

  private async generateRefreshToken(user: User): Promise<string> {
    return sign(
      {
        sub: user.id,
        jti: crypto.randomUUID(),
        type: 'refresh'
      },
      this.refreshSecret,
      { expiresIn: this.refreshTokenExpiry }
    );
  }

  async refreshAccessToken(refreshToken: string): Promise<TokenPair> {
    // Verify refresh token
    const payload = await verify(refreshToken, this.refreshSecret);
    
    // Check if token is revoked
    const isValid = await this.tokenStore.verifyRefreshToken(
      payload.sub,
      await this.hash(refreshToken)
    );
    
    if (!isValid) {
      throw new TokenError('Invalid or revoked refresh token');
    }

    // Get user
    const user = await this.userService.getById(payload.sub);
    
    // Revoke old refresh token (rotation)
    await this.tokenStore.revokeRefreshToken(payload.sub, await this.hash(refreshToken));
    
    // Generate new token pair
    return await this.generateTokens(user);
  }

  async validateAccessToken(token: string): Promise<JWTPayload> {
    try {
      const payload = await verify(token, this.accessSecret);
      
      // Check if token is in blocklist (for logout)
      const isBlocked = await this.tokenStore.isAccessTokenBlocked(payload.jti);
      if (isBlocked) {
        throw new TokenError('Token has been revoked');
      }
      
      return payload as JWTPayload;
    } catch (error) {
      if (error instanceof TokenExpiredError) {
        throw new TokenError('Access token expired');
      }
      throw error;
    }
  }

  async revokeTokens(userId: string, tokenId?: string): Promise<void> {
    if (tokenId) {
      // Revoke specific access token
      await this.tokenStore.blockAccessToken(tokenId);
    } else {
      // Revoke all refresh tokens (full logout)
      await this.tokenStore.revokeAllRefreshTokens(userId);
    }
  }
}
```

### 3. Session Management

```typescript
interface Session {
  id: string;
  userId: string;
  createdAt: Date;
  expiresAt: Date;
  lastActivity: Date;
  userAgent: string;
  ip: string;
  deviceFingerprint?: string;
  data: Record<string, any>;
}

class SessionManager {
  private store: SessionStore; // Redis, database
  private sessionTimeout: number = 30 * 60 * 1000; // 30 minutes
  private absoluteTimeout: number = 8 * 60 * 60 * 1000; // 8 hours

  async createSession(userId: string, context: SessionContext): Promise<Session> {
    const session: Session = {
      id: crypto.randomUUID(),
      userId,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + this.absoluteTimeout),
      lastActivity: new Date(),
      userAgent: context.userAgent,
      ip: context.ip,
      deviceFingerprint: await this.fingerprint(context),
      data: {}
    };

    await this.store.set(session.id, session, this.absoluteTimeout);
    return session;
  }

  async getSession(sessionId: string): Promise<Session | null> {
    const session = await this.store.get(sessionId);
    
    if (!session) {
      return null;
    }

    // Check absolute timeout
    if (new Date() > session.expiresAt) {
      await this.destroySession(sessionId);
      return null;
    }

    // Check idle timeout
    if (new Date().getTime() - session.lastActivity.getTime() > this.sessionTimeout) {
      await this.destroySession(sessionId);
      return null;
    }

    // Update last activity (sliding expiration)
    session.lastActivity = new Date();
    await this.store.set(sessionId, session, this.absoluteTimeout);

    return session;
  }

  async destroySession(sessionId: string): Promise<void> {
    await this.store.delete(sessionId);
  }

  async extendSession(sessionId: string): Promise<void> {
    const session = await this.getSession(sessionId);
    if (session) {
      session.lastActivity = new Date();
      await this.store.set(sessionId, session, this.absoluteTimeout);
    }
  }

  async destroyAllUserSessions(userId: string): Promise<void> {
    const sessionIds = await this.store.getUserSessions(userId);
    await Promise.all(sessionIds.map(id => this.destroySession(id)));
  }

  private async fingerprint(context: SessionContext): Promise<string> {
    // Create device fingerprint from various signals
    const data = [
      context.userAgent,
      context.platform,
      context.timezone,
      context.language
    ].join('|');
    
    return crypto.createHash('sha256').update(data).digest('hex');
  }
}
```

### 4. Multi-Factor Authentication (MFA)

```typescript
interface MFAConfig {
  enabled: boolean;
  methods: MFAMethod[];
  requiredForOperations?: string[];
}

type MFAMethod = 'totp' | 'sms' | 'email' | 'webauthn' | 'backup_codes';

class MFAService {
  private totpSecret: string;

  // TOTP Setup
  async setupTOTP(userId: string): Promise<MFASetup> {
    const secret = randomBytes(32);
    const uri = otpauth({
      secret: secret.toString('base32'),
      issuer: 'MyApp',
      user: userId
    });

    // Store secret encrypted
    await this.userStore.setMFASecret(userId, 'totp', secret);

    return {
      secret: secret.toString('base32'),
      qrCode: await this.generateQR(uri),
      backupCodes: await this.generateBackupCodes(userId, 10)
    };
  }

  // TOTP Verification
  async verifyTOTP(userId: string, token: string): Promise<boolean> {
    const secret = await this.userStore.getMFASecret(userId, 'totp');
    
    // Verify with window of ±1 for clock skew
    const isValid = totp.verify({
      secret: secret.toString('base32'),
      token,
      window: 1
    });

    if (isValid) {
      await this.mfaLog.record(userId, 'totp_success');
    } else {
      await this.mfaLog.record(userId, 'totp_failure');
    }

    return isValid;
  }

  // WebAuthn (Passkey) Registration
  async registerWebAuthn(userId: string): Promise<RegistrationOptions> {
    const options = await generateRegistrationOptions({
      rpName: 'MyApp',
      rpID: 'myapp.com',
      userID: userId,
      userName: userId,
      authenticatorSelection: {
        residentKey: 'preferred',
        userVerification: 'preferred'
      }
    });

    // Store challenge for verification
    await this.challengeStore.set(userId, options.challenge, 300000); // 5 min

    return options;
  }

  // WebAuthn Verification
  async verifyWebAuthnRegistration(
    userId: string,
    response: CredentialDeviceType,
    expectedChallenge: string
  ): Promise<Credential> {
    const verification = await verifyRegistrationResponse({
      response,
      expectedChallenge,
      expectedOrigin: 'https://myapp.com',
      expectedRPID: 'myapp.com'
    });

    if (!verification.verified) {
      throw new MFAError('WebAuthn registration failed');
    }

    // Store credential
    const credential: Credential = {
      id: verification.registrationInfo!.credential.id,
      publicKey: verification.registrationInfo!.credential.publicKey,
      counter: verification.registrationInfo!.credential.counter,
      createdAt: new Date()
    };

    await this.credentialStore.save(userId, credential);
    return credential;
  }

  // MFA Challenge for Sensitive Operations
  async requireMFA(userId: string, operation: string): Promise<MFAChallenge> {
    const userConfig = await this.userStore.getMFAConfig(userId);
    
    if (!userConfig.enabled) {
      throw new MFAError('MFA not enabled');
    }

    // Generate challenge based on preferred method
    const challenge = crypto.randomBytes(32).toString('hex');
    await this.challengeStore.set(`${userId}:${operation}`, challenge, 300000);

    return {
      challengeId: crypto.randomUUID(),
      methods: userConfig.methods,
      expiresAt: new Date(Date.now() + 300000)
    };
  }
}
```

### 5. Password Management

```typescript
class PasswordService {
  private readonly MIN_LENGTH = 12;
  private readonly MAX_AGE_DAYS = 90;

  async hashPassword(password: string): Promise<string> {
    // Use argon2id (recommended) or bcrypt
    return await argon2.hash(password, {
      type: argon2.argon2id,
      memoryCost: 65536, // 64 MB
      timeCost: 3,
      parallelism: 4
    });
  }

  async verifyPassword(password: string, hash: string): Promise<boolean> {
    return await argon2.verify(hash, password);
  }

  validatePassword(password: string): PasswordValidation {
    const requirements = [
      { 
        test: (p: string) => p.length >= this.MIN_LENGTH,
        message: `At least ${this.MIN_LENGTH} characters`
      },
      { 
        test: (p: string) => /[A-Z]/.test(p),
        message: 'One uppercase letter'
      },
      { 
        test: (p: string) => /[a-z]/.test(p),
        message: 'One lowercase letter'
      },
      { 
        test: (p: string) => /[0-9]/.test(p),
        message: 'One number'
      },
      { 
        test: (p: string) => /[^A-Za-z0-9]/.test(p),
        message: 'One special character'
      },
      { 
        test: (p: string) => !/(.)\1{2,}/.test(p),
        message: 'No three consecutive identical characters'
      }
    ];

    const errors: string[] = [];
    for (const req of requirements) {
      if (!req.test(password)) {
        errors.push(req.message);
      }
    }

    // Check against breached passwords (HaveIBeenPwned API)
    const isBreached = await this.checkBreach(password);
    if (isBreached) {
      errors.push('This password has been in a data breach');
    }

    return {
      valid: errors.length === 0,
      errors,
      strength: this.calculateStrength(password)
    };
  }

  async resetPassword(userId: string, token: string, newPassword: string): Promise<void> {
    // Verify token
    const resetRequest = await this.resetStore.get(token);
    
    if (!resetRequest || resetRequest.userId !== userId) {
      throw new AuthError('Invalid reset token');
    }

    // Check token expiration
    if (new Date() > resetRequest.expiresAt) {
      throw new AuthError('Reset token expired');
    }

    // Validate new password
    const validation = this.validatePassword(newPassword);
    if (!validation.valid) {
      throw new ValidationError(validation.errors);
    }

    // Check password history (don't allow reuse of last 5)
    const history = await this.passwordHistory.get(userId, 5);
    for (const oldHash of history) {
      if (await this.verifyPassword(newPassword, oldHash)) {
        throw new ValidationError('Cannot reuse recent passwords');
      }
    }

    // Update password
    const newHash = await this.hashPassword(newPassword);
    await this.userStore.updatePassword(userId, newHash);
    
    // Invalidate all sessions
    await this.sessionManager.destroyAllUserSessions(userId);
    
    // Invalidate reset token
    await this.resetStore.delete(token);
    
    // Log the event
    await this.auditLog.record(userId, 'password_reset');
  }

  async generateResetToken(userId: string): Promise<string> {
    const token = crypto.randomBytes(32).toString('hex');
    
    await this.resetStore.set(token, {
      userId,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 3600000) // 1 hour
    });

    return token;
  }

  private async checkBreach(password: string): Promise<boolean> {
    // Use k-anonymity: send only first 5 chars of SHA1 hash
    const hash = crypto.createHash('sha1').update(password).digest('hex').toUpperCase();
    const prefix = hash.slice(0, 5);
    const suffix = hash.slice(5);

    const response = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`);
    const data = await response.text();

    return data.includes(suffix);
  }

  private calculateStrength(password: string): 'weak' | 'medium' | 'strong' {
    let score = 0;
    
    if (password.length >= 12) score++;
    if (password.length >= 16) score++;
    if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;

    if (score <= 2) return 'weak';
    if (score <= 4) return 'medium';
    return 'strong';
  }
}
```

### 6. Account Lockout Protection

```typescript
class AccountLockoutService {
  private maxAttempts: number = 5;
  private lockoutDuration: number = 15 * 60 * 1000; // 15 minutes
  private windowMs: number = 30 * 60 * 1000; // 30 minute window

  async recordAttempt(identifier: string, success: boolean): Promise<void> {
    const key = `auth_attempts:${identifier}`;
    
    if (success) {
      // Reset on successful login
      await this.redis.del(key);
      return;
    }

    // Increment attempt counter
    const attempts = await this.redis.incr(key);
    await this.redis.expire(key, this.windowMs / 1000);

    if (attempts >= this.maxAttempts) {
      // Lock account
      await this.lockAccount(identifier);
    }
  }

  async isLocked(identifier: string): Promise<boolean> {
    const lockKey = `auth_lock:${identifier}`;
    const ttl = await this.redis.ttl(lockKey);
    
    if (ttl === -2) {
      // Not locked
      return false;
    }

    if (ttl === -1) {
      // Locked without expiration (manual lock)
      return true;
    }

    return true;
  }

  private async lockAccount(identifier: string): Promise<void> {
    const lockKey = `auth_lock:${identifier}`;
    
    await this.redis.set(lockKey, 'locked', 'PX', this.lockoutDuration);
    
    // Send notification
    await this.notificationService.send({
      type: 'account_lockout',
      identifier,
      timestamp: new Date()
    });
  }

  async unlockAccount(identifier: string): Promise<void> {
    await this.redis.del(`auth_lock:${identifier}`);
    await this.redis.del(`auth_attempts:${identifier}`);
  }

  async getAttemptCount(identifier: string): Promise<number> {
    const count = await this.redis.get(`auth_attempts:${identifier}`);
    return parseInt(count || '0');
  }
}
```

---

## Best Practices

### 1. Use Established Providers
```typescript
// ✅ Good: Use Auth0, Okta, or similar
const auth0 = new Auth0Client({
  domain: process.env.AUTH0_DOMAIN,
  clientId: process.env.AUTH0_CLIENT_ID
});

// ❌ Bad: Rolling your own auth from scratch
```

### 2. Secure Token Storage
```typescript
// ✅ Good: HttpOnly cookies for web
res.cookie('access_token', accessToken, {
  httpOnly: true,
  secure: true,
  sameSite: 'strict',
  maxAge: 15 * 60 * 1000
});

// ❌ Bad: localStorage (XSS vulnerable)
localStorage.setItem('token', accessToken);
```

### 3. Implement Token Rotation
```typescript
// ✅ Good: Rotate refresh tokens
async refreshTokens(oldRefreshToken: string) {
  const newTokens = await tokenService.refreshAccessToken(oldRefreshToken);
  // Old refresh token is now invalid
  return newTokens;
}
```

---

## Anti-Patterns

### ❌ Long-Lived Access Tokens
```typescript
// ❌ Bad: Access token valid for 30 days
jwt.sign(payload, secret, { expiresIn: '30d' });

// ✅ Good: Short-lived access + refresh tokens
jwt.sign(payload, secret, { expiresIn: '15m' }); // Access
jwt.sign(payload, refreshSecret, { expiresIn: '7d' }); // Refresh
```

### ❌ No CSRF Protection
```typescript
// ❌ Bad: No state parameter
const authUrl = `https://provider.com/oauth?client_id=${id}`;

// ✅ Good: With state and PKCE
const state = crypto.randomBytes(32).toString('hex');
const authUrl = `https://provider.com/oauth?state=${state}&code_challenge=${challenge}`;
```

---

## Metrics to Track

| Metric | Target | Why It Matters |
|--------|--------|----------------|
| **Auth Success Rate** | >99% | User experience |
| **Failed Login Attempts** | Monitor | Attack detection |
| **MFA Adoption Rate** | >80% | Security posture |
| **Token Refresh Rate** | Track | Token health |
| **Session Duration** | Track | Usage patterns |
| **Account Lockouts** | Monitor | Attack/UX issues |

---

## Tools & Libraries

| Tool | Purpose | Best For |
|------|---------|----------|
| **Auth0** | Identity platform | Managed auth |
| **Okta** | Identity platform | Enterprise SSO |
| **Keycloak** | Identity platform | Self-hosted |
| **NextAuth.js** | Auth for Next.js | Next.js apps |
| **Passport.js** | Auth middleware | Node.js/Express |
| **jose** | JWT handling | Token operations |
| **node-webauthn** | WebAuthn/Passkeys | Passwordless auth |

---

## Implementation Checklist

### Core Authentication
- [ ] OAuth2/OIDC flow implemented
- [ ] JWT token generation/validation
- [ ] Refresh token rotation
- [ ] Session management
- [ ] Logout (single + all sessions)

### Security
- [ ] Password hashing (argon2/bcrypt)
- [ ] Rate limiting on auth endpoints
- [ ] Account lockout protection
- [ ] CSRF protection
- [ ] PKCE for public clients

### MFA
- [ ] TOTP setup and verification
- [ ] Backup codes generation
- [ ] WebAuthn/Passkey support (optional)
- [ ] MFA enforcement for sensitive ops

### Integration
- [ ] Identity provider configured
- [ ] User info sync
- [ ] Role/claim mapping
- [ ] Logout URL configured

### Monitoring
- [ ] Auth event logging
- [ ] Failed attempt alerting
- [ ] Token usage metrics
- [ ] Session analytics

---

## Related Skills

- **Application Security**: `skills/security/appsec/appsec_v1/SKILL.md`
- **Authorization**: `skills/security/authorization/authorization_v1/SKILL.md`
- **OWASP Security**: `skills/governance/security-owasp/security_owasp_skill_v1/SKILL.md`
- **DevSecOps**: `skills/security/devsecops/devsecops_skill_v1/SKILL.md`

---

**Version:** 1.0.0
**Last Updated:** March 29, 2026
**Status:** ✅ Complete
