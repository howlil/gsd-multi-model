# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 6.0.x   | :white_check_mark: Yes |
| 5.0.x   | :white_check_mark: Yes |
| < 5.0   | :x: No |

---

## Reporting a Vulnerability

We take the security of EZ Agents seriously. If you believe you've found a security vulnerability, please follow these guidelines.

### How to Report

**Preferred Method:** Email us at [security email]

**Alternative:** Create a [draft security advisory](https://github.com/howlil/ez-agents/security/advisories/new)

### What to Include

Please provide as much information as possible:

1. **Description** — Detailed description of the vulnerability
2. **Impact** — What an attacker could achieve
3. **Reproduction Steps** — Step-by-step instructions to reproduce
4. **Affected Versions** — Which versions are affected
5. **Suggested Fix** — If you have one (optional)

### Response Timeline

- **Within 48 hours** — Initial acknowledgment
- **Within 7 days** — Preliminary assessment
- **Within 30 days** — Fix developed or mitigation plan
- **Within 90 days** — Public disclosure (coordinated)

---

## Security Best Practices

### For Users

**AI Runtime Security:**
- Use official AI runtimes (Claude Code, Qwen Code, etc.)
- Keep runtimes updated
- Review agent permissions
- Don't share API keys

**Project Security:**
- Use `.env` files for secrets (never commit)
- Enable branch protection
- Review generated code before deploying
- Run security audits (`npm audit`)

**Deployment Security:**
- Use production environment variables
- Enable HTTPS
- Implement rate limiting
- Monitor for anomalies

---

### For Contributors

**Code Security:**
- No hardcoded secrets
- Validate all inputs
- Use parameterized queries
- Implement proper error handling
- Follow OWASP guidelines

**Dependency Security:**
- Keep dependencies updated
- Review security advisories
- Use `npm audit` before submitting PRs
- Pin dependency versions

---

## Security Features

### Built-in Security

**Authentication:**
- JWT with refresh rotation
- HttpOnly cookies
- CSRF protection
- Session management

**Authorization:**
- Role-based access control (RBAC)
- Permission checks
- Resource ownership validation

**Data Protection:**
- Input validation
- Output encoding
- SQL injection prevention
- XSS prevention

---

## Security Checks

### Automated Security

**CI/CD Security:**
- Dependency scanning
- Code analysis
- Secret detection
- Container scanning

**Pre-commit Hooks:**
- Secret scanning
- Code formatting
- Linting

---

## Known Limitations

### Current Limitations

1. **AI-Generated Code** — Review before deploying
2. **Third-Party Dependencies** — Monitor for vulnerabilities
3. **Configuration Files** — Secure your `.env` files

### Mitigation Strategies

1. **Code Review** — Always review AI-generated code
2. **Dependency Updates** — Regular `npm update`
3. **Environment Security** — Use `.env.example` pattern

---

## Security Resources

### Recommended Reading

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)
- [GitHub Security Features](https://docs.github.com/en/code-security)

### Tools

- `npm audit` — Dependency auditing
- `eslint-plugin-security` — Security linting
- `snyk` — Vulnerability scanning

---

## Security Updates

### Notification Channels

- **GitHub Security Advisories** — Subscribe for notifications
- **Release Notes** — Security fixes documented in changelog
- **Email** — Critical vulnerabilities announced via email

### Update Process

```bash
# Check for updates
npm view @howlil/ez-agents version

# Update EZ Agents
npm install -g @howlil/ez-agents@latest

# Verify installation
ez-agents --version
```

---

## Responsible Disclosure

We follow responsible disclosure practices:

1. **Reporter** — Reports vulnerability privately
2. **Maintainers** — Develop fix privately
3. **Reporter** — Validates fix (optional)
4. **Public** — Coordinated disclosure after fix available

### Recognition

We acknowledge security researchers who responsibly disclose vulnerabilities (with permission).

---

## Contact

**Security Team:** [security email]
**PGP Key:** [PGP key if available]

**For non-security issues:** Use [GitHub Issues](https://github.com/howlil/ez-agents/issues)

---

**Last Updated:** March 28, 2026
**Policy Version:** 1.0
