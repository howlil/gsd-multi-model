---
name: threat_modeling_v1
description: Threat modeling methodologies, STRIDE, attack trees, risk assessment, and security threat analysis patterns
version: 1.0.0
tags: [security, threat-modeling, stride, risk-assessment, attack-trees, security-design, threat-analysis]
category: security
triggers:
  keywords: [threat modeling, stride, attack tree, threat analysis, security assessment, risk assessment]
  filePatterns: [security/*.ts, threat-model/*.ts, risk/*.ts]
  commands: [threat modeling, security review, risk assessment]
  projectArchetypes: [enterprise-system, fintech, healthcare, critical-infrastructure]
  modes: [greenfield, architecture-review, security-audit]
prerequisites:
  - appsec_v1
  - security_owasp_skill_v1
recommended_structure:
  directories:
    - src/security/
    - src/security/threats/
    - src/security/risks/
    - src/security/mitigations/
workflow:
  setup:
    - Define system boundaries
    - Create data flow diagrams
    - Identify trust boundaries
    - Select threat modeling methodology
  generate:
    - Identify threats using STRIDE
    - Create attack trees
    - Assess risks
    - Define mitigations
  test:
    - Validate mitigations
    - Penetration testing
    - Security verification
best_practices:
  - Start threat modeling early (design phase)
  - Involve cross-functional teams
  - Update models when architecture changes
  - Prioritize by risk severity
  - Document all threats and mitigations
  - Review after security incidents
  - Make it iterative, not one-time
anti_patterns:
  - Threat modeling as checkbox exercise
  - Only security team involved
  - Not updating when system changes
  - Focusing only on technical threats
  - No prioritization of risks
  - Mitigations not implemented
tools:
  - Microsoft Threat Modeling Tool
  - OWASP Threat Dragon
  - IriusRisk
  - PyTM (Python Threat Modeling)
metrics:
  - Threats identified count
  - High-risk threats count
  - Mitigation coverage
  - Time to mitigate
  - Residual risk score
---

# Threat Modeling Skill

## Overview

This skill provides comprehensive guidance on threat modeling, including STRIDE methodology, attack trees, risk assessment, threat analysis, and security design patterns for identifying and mitigating security threats in software systems.

Threat modeling is a structured approach to identifying, quantifying, and addressing security threats in a system. It helps teams think like attackers and proactively address security concerns during design.

## When to Use

- **New system design** (identify threats early)
- **Major architecture changes** (reassess threats)
- **After security incidents** (prevent recurrence)
- **Compliance requirements** (risk assessment)
- **Before production deployment** (security validation)
- **Third-party integration** (assess new attack surfaces)

## When NOT to Use

- **Simple systems** with minimal security requirements
- **Proof-of-concept** not handling sensitive data
- **When security is explicitly out of scope**

---

## Core Concepts

### 1. STRIDE Threat Classification

```typescript
enum STRIDE {
  SPOOFING = 'Spoofing',
  TAMPERING = 'Tampering',
  REPUDIATION = 'Repudiation',
  INFORMATION_DISCLOSURE = 'Information Disclosure',
  DENIAL_OF_SERVICE = 'Denial of Service',
  ELEVATION_OF_PRIVILEGE = 'Elevation of Privilege'
}

interface STRIDEThreat {
  id: string;
  category: STRIDE;
  title: string;
  description: string;
  affectedComponent: string;
  attackVector: string;
  impact: 'low' | 'medium' | 'high' | 'critical';
  likelihood: 'low' | 'medium' | 'high';
  riskScore: number;
  mitigations: Mitigation[];
  status: 'identified' | 'mitigated' | 'accepted' | 'transferred';
}

class STRIDEAnalyzer {
  analyze(component: SystemComponent): STRIDEThreat[] {
    const threats: STRIDEThreat[] = [];

    // SPOOFING: Can an attacker impersonate a user/system?
    threats.push(...this.analyzeSpoofing(component));

    // TAMPERING: Can data/code be maliciously modified?
    threats.push(...this.analyzeTampering(component));

    // REPUDIATION: Can actions be denied?
    threats.push(...this.analyzeRepudiation(component));

    // INFORMATION DISCLOSURE: Can sensitive data be exposed?
    threats.push(...this.analyzeInformationDisclosure(component));

    // DENIAL OF SERVICE: Can service availability be impacted?
    threats.push(...this.analyzeDenialOfService(component));

    // ELEVATION OF PRIVILEGE: Can privileges be escalated?
    threats.push(...this.analyzeElevationOfPrivilege(component));

    return threats;
  }

  private analyzeSpoofing(component: SystemComponent): STRIDEThreat[] {
    const threats: STRIDEThreat[] = [];

    // Authentication endpoints
    if (component.type === 'auth-endpoint') {
      threats.push({
        id: this.generateId(),
        category: STRIDE.SPOOFING,
        title: 'Credential Stuffing Attack',
        description: 'Attacker uses stolen credentials from other breaches',
        affectedComponent: component.name,
        attackVector: 'Automated login attempts with known credentials',
        impact: 'high',
        likelihood: 'high',
        riskScore: this.calculateRisk('high', 'high'),
        mitigations: [
          { name: 'Multi-factor authentication', implemented: false },
          { name: 'Rate limiting', implemented: false },
          { name: 'Credential breach checking', implemented: false }
        ],
        status: 'identified'
      });

      threats.push({
        id: this.generateId(),
        category: STRIDE.SPOOFING,
        title: 'Session Hijacking',
        description: 'Attacker steals or predicts session tokens',
        affectedComponent: component.name,
        attackVector: 'XSS, network sniffing, session prediction',
        impact: 'high',
        likelihood: 'medium',
        riskScore: this.calculateRisk('high', 'medium'),
        mitigations: [
          { name: 'Secure session tokens', implemented: false },
          { name: 'HTTPS only', implemented: false },
          { name: 'Session timeout', implemented: false }
        ],
        status: 'identified'
      });
    }

    // API endpoints
    if (component.type === 'api') {
      threats.push({
        id: this.generateId(),
        category: STRIDE.SPOOFING,
        title: 'API Key Theft',
        description: 'Attacker obtains and uses API keys',
        affectedComponent: component.name,
        attackVector: 'Log exposure, client-side storage, MITM',
        impact: 'high',
        likelihood: 'medium',
        riskScore: this.calculateRisk('high', 'medium'),
        mitigations: [
          { name: 'API key rotation', implemented: false },
          { name: 'Key scoping', implemented: false },
          { name: 'Request signing', implemented: false }
        ],
        status: 'identified'
      });
    }

    return threats;
  }

  private analyzeTampering(component: SystemComponent): STRIDEThreat[] {
    const threats: STRIDEThreat[] = [];

    // Data stores
    if (component.type === 'database') {
      threats.push({
        id: this.generateId(),
        category: STRIDE.TAMPERING,
        title: 'SQL Injection',
        description: 'Attacker modifies database queries',
        affectedComponent: component.name,
        attackVector: 'Malicious input in queries',
        impact: 'critical',
        likelihood: 'medium',
        riskScore: this.calculateRisk('critical', 'medium'),
        mitigations: [
          { name: 'Parameterized queries', implemented: false },
          { name: 'Input validation', implemented: false },
          { name: 'ORM usage', implemented: false }
        ],
        status: 'identified'
      });

      threats.push({
        id: this.generateId(),
        category: STRIDE.TAMPERING,
        title: 'Data Integrity Attack',
        description: 'Unauthorized modification of stored data',
        affectedComponent: component.name,
        attackVector: 'Direct database access, backup tampering',
        impact: 'critical',
        likelihood: 'low',
        riskScore: this.calculateRisk('critical', 'low'),
        mitigations: [
          { name: 'Database access controls', implemented: false },
          { name: 'Data integrity checks', implemented: false },
          { name: 'Audit logging', implemented: false }
        ],
        status: 'identified'
      });
    }

    // Configuration
    if (component.type === 'config') {
      threats.push({
        id: this.generateId(),
        category: STRIDE.TAMPERING,
        title: 'Configuration Tampering',
        description: 'Modification of system configuration',
        affectedComponent: component.name,
        attackVector: 'File system access, environment variable injection',
        impact: 'high',
        likelihood: 'low',
        riskScore: this.calculateRisk('high', 'low'),
        mitigations: [
          { name: 'Configuration signing', implemented: false },
          { name: 'Immutable infrastructure', implemented: false },
          { name: 'Configuration encryption', implemented: false }
        ],
        status: 'identified'
      });
    }

    return threats;
  }

  private analyzeRepudiation(component: SystemComponent): STRIDEThreat[] {
    const threats: STRIDEThreat[] = [];

    // Transaction systems
    if (component.type === 'transaction') {
      threats.push({
        id: this.generateId(),
        category: STRIDE.REPUDIATION,
        title: 'Transaction Denial',
        description: 'User denies making a transaction',
        affectedComponent: component.name,
        attackVector: 'Claim unauthorized action',
        impact: 'high',
        likelihood: 'medium',
        riskScore: this.calculateRisk('high', 'medium'),
        mitigations: [
          { name: 'Transaction audit trail', implemented: false },
          { name: 'Digital signatures', implemented: false },
          { name: 'User confirmation logs', implemented: false }
        ],
        status: 'identified'
      });
    }

    // Admin actions
    if (component.type === 'admin') {
      threats.push({
        id: this.generateId(),
        category: STRIDE.REPUDIATION,
        title: 'Admin Action Denial',
        description: 'Admin denies performing privileged action',
        affectedComponent: component.name,
        attackVector: 'Claim compromised credentials',
        impact: 'high',
        likelihood: 'low',
        riskScore: this.calculateRisk('high', 'low'),
        mitigations: [
          { name: 'Admin action logging', implemented: false },
          { name: 'MFA for admin actions', implemented: false },
          { name: 'Approval workflows', implemented: false }
        ],
        status: 'identified'
      });
    }

    return threats;
  }

  private analyzeInformationDisclosure(component: SystemComponent): STRIDEThreat[] {
    const threats: STRIDEThreat[] = [];

    // Data stores with sensitive data
    if (component.type === 'database' && component.containsSensitiveData) {
      threats.push({
        id: this.generateId(),
        category: STRIDE.INFORMATION_DISCLOSURE,
        title: 'Data Breach',
        description: 'Unauthorized access to sensitive data',
        affectedComponent: component.name,
        attackVector: 'SQL injection, backup theft, insider threat',
        impact: 'critical',
        likelihood: 'medium',
        riskScore: this.calculateRisk('critical', 'medium'),
        mitigations: [
          { name: 'Encryption at rest', implemented: false },
          { name: 'Access controls', implemented: false },
          { name: 'Data masking', implemented: false },
          { name: 'Database activity monitoring', implemented: false }
        ],
        status: 'identified'
      });
    }

    // API responses
    if (component.type === 'api') {
      threats.push({
        id: this.generateId(),
        category: STRIDE.INFORMATION_DISCLOSURE,
        title: 'Data Overexposure',
        description: 'API returns more data than needed',
        affectedComponent: component.name,
        attackVector: 'API enumeration, response analysis',
        impact: 'medium',
        likelihood: 'high',
        riskScore: this.calculateRisk('medium', 'high'),
        mitigations: [
          { name: 'Response filtering', implemented: false },
          { name: 'GraphQL field limits', implemented: false },
          { name: 'API response schemas', implemented: false }
        ],
        status: 'identified'
      });

      threats.push({
        id: this.generateId(),
        category: STRIDE.INFORMATION_DISCLOSURE,
        title: 'Error Information Leakage',
        description: 'Error messages reveal system details',
        affectedComponent: component.name,
        attackVector: 'Error message analysis',
        impact: 'medium',
        likelihood: 'high',
        riskScore: this.calculateRisk('medium', 'high'),
        mitigations: [
          { name: 'Generic error messages', implemented: false },
          { name: 'Error logging separate from responses', implemented: false }
        ],
        status: 'identified'
      });
    }

    return threats;
  }

  private analyzeDenialOfService(component: SystemComponent): STRIDEThreat[] {
    const threats: STRIDEThreat[] = [];

    // Public endpoints
    if (component.public) {
      threats.push({
        id: this.generateId(),
        category: STRIDE.DENIAL_OF_SERVICE,
        title: 'Resource Exhaustion',
        description: 'Attacker consumes system resources',
        affectedComponent: component.name,
        attackVector: 'High volume requests, slowloris, large payloads',
        impact: 'high',
        likelihood: 'medium',
        riskScore: this.calculateRisk('high', 'medium'),
        mitigations: [
          { name: 'Rate limiting', implemented: false },
          { name: 'Request size limits', implemented: false },
          { name: 'Auto-scaling', implemented: false },
          { name: 'DDoS protection', implemented: false }
        ],
        status: 'identified'
      });
    }

    // Database
    if (component.type === 'database') {
      threats.push({
        id: this.generateId(),
        category: STRIDE.DENIAL_OF_SERVICE,
        title: 'Database Connection Exhaustion',
        description: 'All database connections consumed',
        affectedComponent: component.name,
        attackVector: 'Connection flooding, slow queries',
        impact: 'critical',
        likelihood: 'medium',
        riskScore: this.calculateRisk('critical', 'medium'),
        mitigations: [
          { name: 'Connection pooling', implemented: false },
          { name: 'Query timeouts', implemented: false },
          { name: 'Connection limits per user', implemented: false }
        ],
        status: 'identified'
      });
    }

    return threats;
  }

  private analyzeElevationOfPrivilege(component: SystemComponent): STRIDEThreat[] {
    const threats: STRIDEThreat[] = [];

    // Authorization systems
    if (component.type === 'authz') {
      threats.push({
        id: this.generateId(),
        category: STRIDE.ELEVATION_OF_PRIVILEGE,
        title: 'Privilege Escalation via IDOR',
        description: 'Access other users resources by ID manipulation',
        affectedComponent: component.name,
        attackVector: 'ID parameter manipulation',
        impact: 'critical',
        likelihood: 'medium',
        riskScore: this.calculateRisk('critical', 'medium'),
        mitigations: [
          { name: 'Ownership checks', implemented: false },
          { name: 'UUIDs instead of sequential IDs', implemented: false },
          { name: 'Authorization on every request', implemented: false }
        ],
        status: 'identified'
      });

      threats.push({
        id: this.generateId(),
        category: STRIDE.ELEVATION_OF_PRIVILEGE,
        title: 'Role Manipulation',
        description: 'User modifies their own role',
        affectedComponent: component.name,
        attackVector: 'Parameter tampering, JWT manipulation',
        impact: 'critical',
        likelihood: 'low',
        riskScore: this.calculateRisk('critical', 'low'),
        mitigations: [
          { name: 'Server-side role storage', implemented: false },
          { name: 'Signed JWTs', implemented: false },
          { name: 'Role change audit trail', implemented: false }
        ],
        status: 'identified'
      });
    }

    return threats;
  }

  private calculateRisk(impact: string, likelihood: string): number {
    const impactScore = { low: 1, medium: 2, high: 3, critical: 4 }[impact];
    const likelihoodScore = { low: 1, medium: 2, high: 3 }[likelihood];
    return impactScore * likelihoodScore;
  }

  private generateId(): string {
    return `THR-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
```

### 2. Attack Trees

```typescript
interface AttackTree {
  goal: string;
  rootNode: AttackNode;
}

interface AttackNode {
  id: string;
  description: string;
  type: 'AND' | 'OR';
  children: AttackNode[];
  feasibility: 'low' | 'medium' | 'high';
  impact: 'low' | 'medium' | 'high' | 'critical';
  mitigations: string[];
}

class AttackTreeBuilder {
  buildAttackTree(goal: string): AttackTree {
    return {
      goal,
      rootNode: this.buildRootNode(goal)
    };
  }

  private buildRootNode(goal: string): AttackNode {
    // Example: Attack tree for "Steal User Data"
    if (goal === 'Steal User Data') {
      return {
        id: 'root',
        description: goal,
        type: 'OR',
        feasibility: 'medium',
        impact: 'critical',
        mitigations: [],
        children: [
          {
            id: '1',
            description: 'Compromise Database',
            type: 'AND',
            feasibility: 'low',
            impact: 'critical',
            mitigations: ['Network segmentation', 'Database encryption'],
            children: [
              {
                id: '1.1',
                description: 'Gain Network Access',
                type: 'OR',
                feasibility: 'medium',
                impact: 'high',
                mitigations: ['Firewall', 'VPN'],
                children: [
                  {
                    id: '1.1.1',
                    description: 'Exploit Public Vulnerability',
                    type: 'LEAF',
                    feasibility: 'medium',
                    impact: 'high',
                    mitigations: ['Patch management', 'Vulnerability scanning'],
                    children: []
                  },
                  {
                    id: '1.1.2',
                    description: 'Phishing Attack',
                    type: 'LEAF',
                    feasibility: 'high',
                    impact: 'high',
                    mitigations: ['Security training', 'Email filtering'],
                    children: []
                  }
                ]
              },
              {
                id: '1.2',
                description: 'Bypass Authentication',
                type: 'OR',
                feasibility: 'low',
                impact: 'critical',
                mitigations: ['MFA', 'Strong passwords'],
                children: [
                  {
                    id: '1.2.1',
                    description: 'Credential Theft',
                    type: 'LEAF',
                    feasibility: 'medium',
                    impact: 'critical',
                    mitigations: ['MFA', 'Credential monitoring'],
                    children: []
                  },
                  {
                    id: '1.2.2',
                    description: 'Brute Force',
                    type: 'LEAF',
                    feasibility: 'low',
                    impact: 'critical',
                    mitigations: ['Account lockout', 'Rate limiting'],
                    children: []
                  }
                ]
              }
            ]
          },
          {
            id: '2',
            description: 'Exploit API Vulnerability',
            type: 'OR',
            feasibility: 'medium',
            impact: 'critical',
            mitigations: ['API security testing', 'Input validation'],
            children: [
              {
                id: '2.1',
                description: 'SQL Injection',
                type: 'LEAF',
                feasibility: 'medium',
                impact: 'critical',
                mitigations: ['Parameterized queries', 'ORM'],
                children: []
              },
              {
                id: '2.2',
                description: 'IDOR',
                type: 'LEAF',
                feasibility: 'high',
                impact: 'critical',
                mitigations: ['Authorization checks', 'UUID usage'],
                children: []
              }
            ]
          },
          {
            id: '3',
            description: 'Insider Threat',
            type: 'OR',
            feasibility: 'low',
            impact: 'critical',
            mitigations: ['Access controls', 'Audit logging'],
            children: [
              {
                id: '3.1',
                description: 'Malicious Employee',
                type: 'LEAF',
                feasibility: 'low',
                impact: 'critical',
                mitigations: ['Background checks', 'Least privilege'],
                children: []
              },
              {
                id: '3.2',
                description: 'Compromised Credentials',
                type: 'LEAF',
                feasibility: 'medium',
                impact: 'critical',
                mitigations: ['MFA', 'Session monitoring'],
                children: []
              }
            ]
          }
        ]
      };
    }

    throw new Error(`Unknown attack tree goal: ${goal}`);
  }

  calculateOverallRisk(node: AttackNode): { feasibility: string; impact: string } {
    if (node.children.length === 0) {
      return { feasibility: node.feasibility, impact: node.impact };
    }

    if (node.type === 'OR') {
      // For OR: take highest risk child
      const childRisks = node.children.map(c => this.calculateOverallRisk(c));
      return {
        feasibility: this.getMaxFeasibility(childRisks.map(r => r.feasibility)),
        impact: this.getMaxImpact(childRisks.map(r => r.impact))
      };
    } else {
      // For AND: take lowest feasibility (hardest step), highest impact
      const childRisks = node.children.map(c => this.calculateOverallRisk(c));
      return {
        feasibility: this.getMinFeasibility(childRisks.map(r => r.feasibility)),
        impact: this.getMaxImpact(childRisks.map(r => r.impact))
      };
    }
  }

  private getMaxFeasibility(values: string[]): string {
    const order = { low: 1, medium: 2, high: 3 };
    return values.reduce((max, v) => order[v as keyof typeof order] > order[max as keyof typeof order] ? v : max);
  }

  private getMinFeasibility(values: string[]): string {
    const order = { low: 1, medium: 2, high: 3 };
    return values.reduce((min, v) => order[v as keyof typeof order] < order[min as keyof typeof order] ? v : min);
  }

  private getMaxImpact(values: string[]): string {
    const order = { low: 1, medium: 2, high: 3, critical: 4 };
    return values.reduce((max, v) => order[v as keyof typeof order] > order[max as keyof typeof order] ? v : max);
  }
}
```

### 3. Risk Assessment

```typescript
interface RiskAssessment {
  threat: STRIDEThreat;
  inherentRisk: RiskScore;
  residualRisk: RiskScore;
  riskTreatment: 'accept' | 'mitigate' | 'transfer' | 'avoid';
  treatmentPlan?: string;
}

interface RiskScore {
  impact: number; // 1-4
  likelihood: number; // 1-3
  score: number; // 1-12
  level: 'low' | 'medium' | 'high' | 'critical';
}

class RiskAssessor {
  assess(threats: STRIDEThreat[]): RiskAssessment[] {
    return threats.map(threat => ({
      threat,
      inherentRisk: this.calculateInherentRisk(threat),
      residualRisk: this.calculateResidualRisk(threat),
      riskTreatment: this.determineTreatment(threat),
      treatmentPlan: this.createTreatmentPlan(threat)
    }));
  }

  private calculateInherentRisk(threat: STRIDEThreat): RiskScore {
    const impact = this.impactToNumber(threat.impact);
    const likelihood = this.likelihoodToNumber(threat.likelihood);
    const score = impact * likelihood;

    return {
      impact,
      likelihood,
      score,
      level: this.scoreToLevel(score)
    };
  }

  private calculateResidualRisk(threat: STRIDEThreat): RiskScore {
    const inherent = this.calculateInherentRisk(threat);
    
    // Calculate mitigation effectiveness
    const implementedMitigations = threat.mitigations.filter(m => m.implemented);
    const mitigationEffectiveness = implementedMitigations.length / threat.mitigations.length;
    
    // Reduce risk based on mitigation
    const residualScore = Math.round(inherent.score * (1 - mitigationEffectiveness * 0.8));
    
    return {
      impact: inherent.impact,
      likelihood: Math.max(1, Math.round(inherent.likelihood * (1 - mitigationEffectiveness))),
      score: residualScore,
      level: this.scoreToLevel(residualScore)
    };
  }

  private determineTreatment(threat: STRIDEThreat): 'accept' | 'mitigate' | 'transfer' | 'avoid' {
    const residual = this.calculateResidualRisk(threat);

    if (residual.level === 'critical') {
      return 'avoid'; // Must eliminate
    } else if (residual.level === 'high') {
      return 'mitigate'; // Must reduce
    } else if (residual.level === 'medium') {
      return 'mitigate'; // Should reduce
    } else {
      return 'accept'; // Acceptable risk
    }
  }

  private createTreatmentPlan(threat: STRIDEThreat): string {
    const unimplemented = threat.mitigations.filter(m => !m.implemented);
    
    if (unimplemented.length === 0) {
      return 'All mitigations implemented';
    }

    return `Implement: ${unimplemented.map(m => m.name).join(', ')}`;
  }

  private impactToNumber(impact: string): number {
    return { low: 1, medium: 2, high: 3, critical: 4 }[impact];
  }

  private likelihoodToNumber(likelihood: string): number {
    return { low: 1, medium: 2, high: 3 }[likelihood];
  }

  private scoreToLevel(score: number): 'low' | 'medium' | 'high' | 'critical' {
    if (score <= 2) return 'low';
    if (score <= 5) return 'medium';
    if (score <= 8) return 'high';
    return 'critical';
  }
}
```

### 4. Data Flow Diagram (DFD) Analysis

```typescript
interface DFD {
  name: string;
  processes: Process[];
  dataStores: DataStore[];
  externalEntities: ExternalEntity[];
  dataFlows: DataFlow[];
  trustBoundaries: TrustBoundary[];
}

class DFDAnalyzer {
  analyzeThreats(dfd: DFD): STRIDEThreat[] {
    const threats: STRIDEThreat[] = [];

    // Analyze each element type
    for (const process of dfd.processes) {
      threats.push(...this.analyzeProcess(process, dfd));
    }

    for (const dataStore of dfd.dataStores) {
      threats.push(...this.analyzeDataStore(dataStore, dfd));
    }

    for (const flow of dfd.dataFlows) {
      threats.push(...this.analyzeDataFlow(flow, dfd));
    }

    for (const entity of dfd.externalEntities) {
      threats.push(...this.analyzeExternalEntity(entity, dfd));
    }

    return threats;
  }

  private analyzeProcess(process: Process, dfd: DFD): STRIDEThreat[] {
    const threats: STRIDEThreat[] = [];

    // Check for spoofing (authentication required?)
    if (!process.requiresAuth) {
      threats.push({
        id: this.generateId(),
        category: STRIDE.SPOOFING,
        title: `Unauthenticated Access to ${process.name}`,
        description: 'Process can be invoked without authentication',
        affectedComponent: process.name,
        attackVector: 'Direct API call without credentials',
        impact: 'high',
        likelihood: 'high',
        riskScore: 9,
        mitigations: [{ name: 'Add authentication', implemented: false }],
        status: 'identified'
      });
    }

    // Check for tampering (input validation?)
    if (!process.validatesInput) {
      threats.push({
        id: this.generateId(),
        category: STRIDE.TAMPERING,
        title: `Input Tampering in ${process.name}`,
        description: 'Process does not validate input',
        affectedComponent: process.name,
        attackVector: 'Malicious input injection',
        impact: 'high',
        likelihood: 'medium',
        riskScore: 6,
        mitigations: [{ name: 'Add input validation', implemented: false }],
        status: 'identified'
      });
    }

    return threats;
  }

  private analyzeDataStore(dataStore: DataStore, dfd: DFD): STRIDEThreat[] {
    const threats: STRIDEThreat[] = [];

    // Check for information disclosure (encryption?)
    if (!dataStore.encrypted && dataStore.containsSensitiveData) {
      threats.push({
        id: this.generateId(),
        category: STRIDE.INFORMATION_DISCLOSURE,
        title: `Unencrypted Data in ${dataStore.name}`,
        description: 'Sensitive data stored without encryption',
        affectedComponent: dataStore.name,
        attackVector: 'Direct storage access, backup theft',
        impact: 'critical',
        likelihood: 'medium',
        riskScore: 8,
        mitigations: [{ name: 'Enable encryption at rest', implemented: false }],
        status: 'identified'
      });
    }

    return threats;
  }

  private analyzeDataFlow(flow: DataFlow, dfd: DFD): STRIDEThreat[] {
    const threats: STRIDEThreat[] = [];

    // Check for information disclosure (encryption in transit?)
    if (!flow.encrypted) {
      threats.push({
        id: this.generateId(),
        category: STRIDE.INFORMATION_DISCLOSURE,
        title: `Unencrypted Data Flow: ${flow.name}`,
        description: 'Data transmitted without encryption',
        affectedComponent: flow.name,
        attackVector: 'Network sniffing, MITM attack',
        impact: 'high',
        likelihood: 'medium',
        riskScore: 6,
        mitigations: [{ name: 'Enable TLS', implemented: false }],
        status: 'identified'
      });
    }

    // Check trust boundary crossings
    if (this.crossesTrustBoundary(flow, dfd.trustBoundaries)) {
      threats.push({
        id: this.generateId(),
        category: STRIDE.TAMPERING,
        title: `Trust Boundary Crossing: ${flow.name}`,
        description: 'Data crosses trust boundary without validation',
        affectedComponent: flow.name,
        attackVector: 'Data manipulation at boundary',
        impact: 'high',
        likelihood: 'medium',
        riskScore: 6,
        mitigations: [
          { name: 'Add data validation', implemented: false },
          { name: 'Add data signing', implemented: false }
        ],
        status: 'identified'
      });
    }

    return threats;
  }

  private crossesTrustBoundary(flow: DataFlow, boundaries: TrustBoundary[]): boolean {
    // Check if flow crosses any trust boundary
    return boundaries.some(boundary =>
      (boundary.contains(flow.source) && !boundary.contains(flow.destination)) ||
      (!boundary.contains(flow.source) && boundary.contains(flow.destination))
    );
  }

  private generateId(): string {
    return `THR-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
```

---

## Best Practices

### 1. Start Early, Iterate Often
```typescript
// ✅ Good: Threat modeling at each phase
const threatModelingPhases = {
  design: 'Identify architectural threats',
  development: 'Review implementation threats',
  testing: 'Validate mitigations',
  deployment: 'Final security review',
  maintenance: 'Update for changes'
};
```

### 2. Involve Cross-Functional Teams
```typescript
// ✅ Good: Diverse perspectives
const threatModelingTeam = {
  security: 'Security expertise',
  architecture: 'System design knowledge',
  development: 'Implementation details',
  operations: 'Deployment environment',
  product: 'Business context'
};
```

### 3. Prioritize by Risk
```typescript
// ✅ Good: Risk-based prioritization
const priorityOrder = [
  'critical-high',    // Fix immediately
  'high-high',        // Fix this sprint
  'high-medium',      // Fix this release
  'medium-medium',    // Backlog
  'low-*'             // Accept or backlog
];
```

---

## Anti-Patterns

### ❌ Checkbox Exercise
```typescript
// ❌ Bad: Done once, never updated
threatModel.create();
// ... years pass ...
// System completely changed but threat model is stale

// ✅ Good: Living document
onArchitectureChange(() => threatModel.update());
onSecurityIncident(() => threatModel.review());
quarterly(() => threatModel.reassess());
```

### ❌ Security Team Only
```typescript
// ❌ Bad: Security team works in isolation
securityTeam.createThreatModel();

// ✅ Good: Collaborative workshop
conductThreatModelingWorkshop({
  participants: ['security', 'dev', 'ops', 'product']
});
```

---

## Metrics to Track

| Metric | Target | Why It Matters |
|--------|--------|----------------|
| **Threats Identified** | Track | Coverage |
| **High-Risk Threats** | 0 | Security posture |
| **Mitigation Coverage** | >90% | Risk reduction |
| **Time to Mitigate** | <30 days | Response speed |
| **Residual Risk Score** | Decreasing | Overall risk |

---

## Tools & Libraries

| Tool | Purpose | Best For |
|------|---------|----------|
| **Microsoft Threat Modeling Tool** | Visual threat modeling | Windows teams |
| **OWASP Threat Dragon** | Open-source threat modeling | All teams |
| **IriusRisk** | Enterprise threat modeling | Large organizations |
| **PyTM** | Python threat modeling | Python teams |

---

## Implementation Checklist

### Setup
- [ ] System boundaries defined
- [ ] Data flow diagrams created
- [ ] Trust boundaries identified
- [ ] Methodology selected (STRIDE)

### Analysis
- [ ] STRIDE threats identified
- [ ] Attack trees created
- [ ] Risk assessment completed
- [ ] Mitigations defined

### Treatment
- [ ] High-risk items prioritized
- [ ] Mitigation plan created
- [ ] Owners assigned
- [ ] Timeline established

### Validation
- [ ] Mitigations implemented
- [ ] Penetration testing done
- [ ] Residual risk accepted
- [ ] Documentation complete

---

## Related Skills

- **Application Security**: `skills/security/appsec/appsec_v1/SKILL.md`
- **OWASP Security**: `skills/governance/security-owasp/security_owasp_skill_v1/SKILL.md`
- **Security Audit**: `skills/operational/security-audit/security_audit_v1/SKILL.md`

---

**Version:** 1.0.0
**Last Updated:** March 29, 2026
**Status:** ✅ Complete
