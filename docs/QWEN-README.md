# 🤖 Qwen Provider untuk EZ Agents

**Dokumentasi lengkap untuk menggunakan Alibaba Qwen (DashScope) di EZ Agents**

---

## 📋 Daftar Isi

1. [Pengantar](#pengantar)
2. [Quick Start](#quick-start)
3. [Autentikasi](#autentikasi)
4. [Konfigurasi](#konfigurasi)
5. [Workflow](#workflow)
6. [Model Selection](#model-selection)
7. [Best Practices](#best-practices)
8. [Troubleshooting](#troubleshooting)

---

## Pengantar

EZ Agents sekarang mendukung **Alibaba Qwen** sebagai provider pertama dengan metode autentikasi yang sama seperti Qwen Code CLI.

### Fitur Utama

✅ **Multi-Model Support** - qwen-max, qwen-plus, qwen-turbo  
✅ **Secure Authentication** - System keychain atau environment variables  
✅ **Flexible Configuration** - Per-agent model selection  
✅ **Cost Control** - Budget limits dan rate limiting  
✅ **Retry Logic** - Automatic retry dengan backoff  
✅ **Full Workflow** - Planning, execution, verification

### Model yang Tersedia

| Model | Deskripsi | Use Case | Harga (per 1K tokens) |
|-------|-----------|----------|----------------------|
| `qwen-max` | Most powerful | Complex planning, architecture | $0.04 |
| `qwen-plus` | Balanced | Code execution, implementation | $0.012 |
| `qwen-turbo` | Fast & cheap | Quick tasks, verification | $0.002 |

---

## Quick Start

### 1. Dapatkan API Key

```bash
# Kunjungi DashScope Console
https://dashscope.console.aliyun.com/apiKey
```

### 2. Set Environment Variable

```bash
# Linux/Mac
export DASHSCOPE_API_KEY="sk-your-api-key"

# Windows PowerShell
$env:DASHSCOPE_API_KEY="sk-your-api-key"
```

### 3. Install & Setup

```bash
# Install EZ Agents
npm install -g @howlil/ez-agents

# Setup dengan Qwen
ez-agents --qwen --global

# Initialize project
ez-agents new-project
```

### 4. Start Using

```bash
# Plan
ez-agents plan-phase "Build e-commerce platform"

# Execute
ez-agents execute-phase "1"

# Verify
ez-agents verify-work "1"
```

---

## Autentikasi

### Method 1: Environment Variable (Recommended)

```bash
export DASHSCOPE_API_KEY="sk-your-api-key"
```

### Method 2: System Keychain (Secure)

```bash
# Save to system keychain
node ez-agents/bin/ez-tools.cjs config set qwen api_key "sk-your-api-key"
```

### Method 3: Configuration File

File: `.planning/config.json`

```json
{
  "provider": {
    "default": "qwen",
    "qwen": {
      "api_key": "env:DASHSCOPE_API_KEY"
    }
  }
}
```

---

## Konfigurasi

### Basic Configuration

```json
{
  "provider": {
    "default": "qwen",
    "qwen": {
      "api_key": "env:DASHSCOPE_API_KEY",
      "models": {
        "high": "qwen-max",
        "balanced": "qwen-plus",
        "budget": "qwen-turbo"
      }
    }
  },
  "model_profile": "balanced"
}
```

### Per-Agent Configuration

```json
{
  "agent_overrides": {
    "ez-planner": {
      "provider": "qwen",
      "model": "qwen-max",
      "temperature": 0.7
    },
    "ez-executor": {
      "provider": "qwen",
      "model": "qwen-plus",
      "temperature": 0.3
    },
    "ez-verifier": {
      "provider": "qwen",
      "model": "qwen-plus",
      "temperature": 0.2
    }
  }
}
```

### Multi-Provider Configuration

```json
{
  "provider": {
    "default": "qwen",
    "qwen": {
      "api_key": "env:DASHSCOPE_API_KEY"
    },
    "anthropic": {
      "api_key": "env:ANTHROPIC_API_KEY"
    }
  },
  "agent_overrides": {
    "ez-planner": { "provider": "qwen", "model": "qwen-max" },
    "ez-executor": { "provider": "qwen", "model": "qwen-plus" },
    "ez-verifier": { "provider": "anthropic", "model": "sonnet" }
  }
}
```

📖 **Lihat lebih banyak contoh:** [QWEN-CONFIG-EXAMPLES.md](QWEN-CONFIG-EXAMPLES.md)

---

## Workflow

### 1. Planning Phase

**Model:** qwen-max  
**Temperature:** 0.6-0.8  
**Purpose:** Complex reasoning, architecture design

```bash
ez-agents plan-phase "Design microservices architecture"
```

📖 **Full guide:** [QWEN-PLANNING.md](QWEN-PLANNING.md)

### 2. Execution Phase

**Model:** qwen-plus  
**Temperature:** 0.2-0.4  
**Purpose:** Code implementation, file modifications

```bash
ez-agents execute-phase "1"
```

📖 **Full guide:** [QWEN-EXECUTION.md](QWEN-EXECUTION.md)

### 3. Verification Phase

**Model:** qwen-plus atau qwen-turbo  
**Temperature:** 0.1-0.3  
**Purpose:** Validation, testing, quality checks

```bash
ez-agents verify-work "1"
```

📖 **Full guide:** [QWEN-VERIFICATION.md](QWEN-VERIFICATION.md)

---

## Model Selection

### By Task Type

| Task Type | Model | Temperature | Max Tokens | Cost |
|-----------|-------|-------------|------------|------|
| **Planning** | qwen-max | 0.7 | 8192 | $$$$ |
| **Architecture** | qwen-max | 0.7 | 8192 | $$$$ |
| **Code Generation** | qwen-plus | 0.3 | 4096 | $$ |
| **Refactoring** | qwen-plus | 0.3 | 4096 | $$ |
| **Testing** | qwen-turbo | 0.2 | 2048 | $ |
| **Verification** | qwen-turbo | 0.1 | 2048 | $ |
| **Debugging** | qwen-max | 0.5 | 8192 | $$$$ |
| **Documentation** | qwen-plus | 0.4 | 4096 | $$ |

### By Model Profile

```json
{
  "model_profile": "balanced"
}
```

Profiles:
- `quality` → Always use qwen-max
- `balanced` → Smart selection based on task
- `budget` → Prefer qwen-turbo when possible

---

## Best Practices

### 1. Use Right Temperature

```javascript
// Creative tasks (planning, design)
temperature: 0.7

// Implementation tasks
temperature: 0.3

// Verification tasks
temperature: 0.1
```

### 2. Set Appropriate Max Tokens

```javascript
// Simple tasks
max_tokens: 2048

// Complex implementation
max_tokens: 4096

// Architecture design
max_tokens: 8192
```

### 3. Enable Retry Logic

```json
{
  "retry": {
    "max_attempts": 3,
    "backoff_ms": 1000
  }
}
```

### 4. Monitor Token Usage

```bash
# Check usage
ez-agents stats

# View detailed metrics
node ez-agents/bin/ez-tools.cjs history-digest
```

### 5. Use Cost Control

```json
{
  "cost_control": {
    "max_daily_budget_usd": 10.00,
    "alert_at_percentage": 80
  }
}
```

---

## Troubleshooting

### Error: Invalid API Key

**Symptom:** `401 Unauthorized`

**Solution:**
```bash
# Verify key is set
echo $DASHSCOPE_API_KEY

# Test key
curl -X POST https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation \
  -H "Authorization: Bearer $DASHSCOPE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"model": "qwen-turbo", "input": { "messages": [{"role": "user", "content": "test"}] }}'
```

### Error: Rate Limit Exceeded

**Symptom:** `429 Too Many Requests`

**Solution:**
```json
{
  "retry": {
    "max_attempts": 5,
    "backoff_ms": 5000
  }
}
```

### Error: Model Not Found

**Symptom:** `404 Model not found`

**Solution:**
```json
{
  "provider": {
    "qwen": {
      "models": {
        "high": "qwen-plus",
        "balanced": "qwen-plus",
        "budget": "qwen-turbo"
      }
    }
  }
}
```

### Error: Timeout

**Symptom:** `Request timeout`

**Solution:**
```json
{
  "timeout": {
    "request_ms": 60000,
    "fallback": "qwen-turbo"
  }
}
```

---

## Documentation Index

### Core Documentation

| Document | Description |
|----------|-------------|
| [QWEN-PROVIDER.md](QWEN-PROVIDER.md) | Complete provider guide |
| [QWEN-PLANNING.md](QWEN-PLANNING.md) | Planning workflow |
| [QWEN-EXECUTION.md](QWEN-EXECUTION.md) | Execution workflow |
| [QWEN-VERIFICATION.md](QWEN-VERIFICATION.md) | Verification workflow |
| [QWEN-CONFIG-EXAMPLES.md](QWEN-CONFIG-EXAMPLES.md) | Configuration examples |

### Related Documentation

| Document | Description |
|----------|-------------|
| [USER-GUIDE.md](USER-GUIDE.md) | General EZ Agents guide |
| [PROVIDER-BEHAVIORS.md](PROVIDER-BEHAVIORS.md) | Provider-specific behaviors |

---

## Support & Resources

### Official Resources

- **DashScope Console:** https://dashscope.console.aliyun.com/
- **API Documentation:** https://help.aliyun.com/zh/dashscope/
- **Pricing:** https://www.aliyun.com/price/product#/qwen/detail

### Community

- **GitHub Issues:** https://github.com/howlil/ez-agents/issues
- **Discussions:** https://github.com/howlil/ez-agents/discussions

### Examples

- **Sample Projects:** https://github.com/howlil/ez-agents-examples
- **Templates:** `.planning/config.example.json`

---

## Changelog

### v3.3.0 (2026-03-18)

- ✨ Added comprehensive Qwen documentation
- ✨ Planning, execution, verification workflows
- 🐛 Fixed auth.cjs to include QWEN provider constant
- 📚 Added 5 new documentation files

### v3.2.0

- Initial Qwen provider support
- Basic DashScope integration

---

## License

Documentation is part of EZ Agents project.  
See [LICENSE](../LICENSE) for details.
