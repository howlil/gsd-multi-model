# Qwen Provider Configuration Examples

Berbagai contoh konfigurasi untuk menggunakan Qwen provider di EZ Agents.

---

## 1. Konfigurasi Dasar (Basic Setup)

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

**Usage:**
```bash
export DASHSCOPE_API_KEY="sk-your-api-key"
ez-agents new-project
```

---

## 2. Konfigurasi Multi-Model

File: `.planning/config.json`

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

**Model Selection:**
- `high` → qwen-max (untuk tugas kompleks)
- `balanced` → qwen-plus (untuk sebagian besar tugas)
- `budget` → qwen-turbo (untuk tugas cepat)

---

## 3. Konfigurasi Per-Agent

File: `.planning/config.json`

```json
{
  "provider": {
    "default": "qwen",
    "qwen": {
      "api_key": "env:DASHSCOPE_API_KEY"
    }
  },
  "agent_overrides": {
    "ez-planner": {
      "provider": "qwen",
      "model": "qwen-max",
      "temperature": 0.7,
      "max_tokens": 8192
    },
    "ez-executor": {
      "provider": "qwen",
      "model": "qwen-plus",
      "temperature": 0.3,
      "max_tokens": 4096
    },
    "ez-verifier": {
      "provider": "qwen",
      "model": "qwen-plus",
      "temperature": 0.2,
      "max_tokens": 4096
    },
    "ez-debugger": {
      "provider": "qwen",
      "model": "qwen-max",
      "temperature": 0.5,
      "max_tokens": 8192
    }
  }
}
```

**Penjelasan:**
- **Planner**: qwen-max dengan temperature tinggi untuk kreativitas
- **Executor**: qwen-plus dengan temperature rendah untuk presisi
- **Verifier**: qwen-plus dengan temperature sangat rendah untuk validasi ketat
- **Debugger**: qwen-max dengan temperature sedang untuk problem solving

---

## 4. Konfigurasi Multi-Provider

File: `.planning/config.json`

```json
{
  "provider": {
    "default": "qwen",
    "qwen": {
      "api_key": "env:DASHSCOPE_API_KEY",
      "models": {
        "high": "qwen-max",
        "balanced": "qwen-plus"
      }
    },
    "anthropic": {
      "api_key": "env:ANTHROPIC_API_KEY",
      "models": {
        "high": "claude-3-opus-20240229",
        "balanced": "claude-3-sonnet-20240229"
      }
    },
    "openai": {
      "api_key": "env:OPENAI_API_KEY",
      "models": {
        "high": "gpt-4-turbo-preview"
      }
    }
  },
  "agent_overrides": {
    "ez-planner": {
      "provider": "qwen",
      "model": "qwen-max"
    },
    "ez-executor": {
      "provider": "qwen",
      "model": "qwen-plus"
    },
    "ez-verifier": {
      "provider": "anthropic",
      "model": "sonnet"
    }
  }
}
```

**Strategi:**
- Planning: Qwen untuk reasoning yang baik
- Execution: Qwen untuk performa/cost balance
- Verification: Anthropic untuk validasi ketat

---

## 5. Konfigurasi dengan Retry & Timeout

File: `.planning/config.json`

```json
{
  "provider": {
    "default": "qwen",
    "qwen": {
      "api_key": "env:DASHSCOPE_API_KEY",
      "retry": {
        "max_attempts": 3,
        "backoff_ms": 1000,
        "retry_on": ["rate_limit", "timeout", "server_error"]
      },
      "timeout": {
        "request_ms": 30000,
        "fallback": "qwen-turbo"
      },
      "cache": {
        "enabled": true,
        "ttl_seconds": 3600
      }
    }
  }
}
```

**Fitur:**
- **Retry**: Automatic retry dengan exponential backoff
- **Timeout**: Fallback ke model lebih cepat jika timeout
- **Cache**: Cache response untuk query yang sama

---

## 6. Konfigurasi Development vs Production

File: `.planning/config.dev.json`

```json
{
  "provider": {
    "default": "qwen",
    "qwen": {
      "api_key": "env:DASHSCOPE_API_KEY",
      "models": {
        "high": "qwen-max",
        "balanced": "qwen-turbo",
        "budget": "qwen-turbo"
      }
    }
  },
  "development": {
    "debug_responses": true,
    "log_tokens": true,
    "mock_external_services": true
  }
}
```

File: `.planning/config.prod.json`

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
  "production": {
    "debug_responses": false,
    "log_tokens": false,
    "rate_limit_per_minute": 60
  }
}
```

**Usage:**
```bash
# Development
export NODE_ENV=development
cp .planning/config.dev.json .planning/config.json

# Production
export NODE_ENV=production
cp .planning/config.prod.json .planning/config.json
```

---

## 7. Konfigurasi dengan Cost Control

File: `.planning/config.json`

```json
{
  "provider": {
    "default": "qwen",
    "qwen": {
      "api_key": "env:DASHSCOPE_API_KEY",
      "cost_control": {
        "max_tokens_per_request": 4096,
        "max_requests_per_minute": 30,
        "max_daily_budget_usd": 10.00,
        "alert_at_percentage": 80
      }
    }
  }
}
```

**Fitur:**
- Limit tokens per request
- Rate limiting
- Daily budget cap
- Alert saat mendekati limit

---

## 8. Konfigurasi Enterprise

File: `.planning/config.enterprise.json`

```json
{
  "provider": {
    "default": "qwen",
    "qwen": {
      "api_key": "env:DASHSCOPE_API_KEY",
      "endpoint": "https://dashscope.aliyuncs.com/api/v1",
      "models": {
        "high": "qwen-max",
        "balanced": "qwen-plus",
        "budget": "qwen-turbo"
      },
      "retry": {
        "max_attempts": 5,
        "backoff_ms": 2000
      },
      "timeout": {
        "request_ms": 60000
      },
      "security": {
        "validate_ssl": true,
        "ip_whitelist": ["10.0.0.0/8", "192.168.0.0/16"],
        "audit_logging": true
      },
      "monitoring": {
        "enabled": true,
        "metrics_endpoint": "https://your-monitoring.com/metrics",
        "alert_webhook": "https://your-alerts.com/webhook"
      }
    }
  },
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
  },
  "enterprise": {
    "sso_enabled": true,
    "audit_trail": true,
    "data_residency": "ap-southeast-1"
  }
}
```

---

## 9. Environment-Specific Configuration

### Development

File: `.env.development`
```bash
DASHSCOPE_API_KEY=sk-dev-key
QWEN_MODEL_HIGH=qwen-max
QWEN_MODEL_BALANCED=qwen-turbo
QWEN_MODEL_BUDGET=qwen-turbo
LOG_LEVEL=debug
```

### Staging

File: `.env.staging`
```bash
DASHSCOPE_API_KEY=sk-staging-key
QWEN_MODEL_HIGH=qwen-max
QWEN_MODEL_BALANCED=qwen-plus
QWEN_MODEL_BUDGET=qwen-turbo
LOG_LEVEL=info
```

### Production

File: `.env.production`
```bash
DASHSCOPE_API_KEY=sk-prod-key
QWEN_MODEL_HIGH=qwen-max
QWEN_MODEL_BALANCED=qwen-plus
QWEN_MODEL_BUDGET=qwen-turbo
LOG_LEVEL=warn
```

---

## 10. Quick Start Templates

### Template 1: Personal Project

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

### Template 2: Startup

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
  "model_profile": "balanced",
  "cost_control": {
    "max_daily_budget_usd": 5.00
  }
}
```

### Template 3: Enterprise

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
      },
      "retry": {
        "max_attempts": 5,
        "backoff_ms": 2000
      },
      "monitoring": {
        "enabled": true
      }
    }
  },
  "agent_overrides": {
    "ez-planner": { "provider": "qwen", "model": "qwen-max" },
    "ez-executor": { "provider": "qwen", "model": "qwen-plus" },
    "ez-verifier": { "provider": "qwen", "model": "qwen-plus" }
  }
}
```

---

## Setup Instructions

### 1. Get API Key

```bash
# Visit DashScope Console
https://dashscope.console.aliyun.com/apiKey
```

### 2. Set Environment Variable

```bash
# Linux/Mac
export DASHSCOPE_API_KEY="sk-your-api-key"

# Windows PowerShell
$env:DASHSCOPE_API_KEY="sk-your-api-key"

# Windows CMD
set DASHSCOPE_API_KEY=sk-your-api-key
```

### 3. Create Config File

```bash
# Copy template
cp .planning/config.example.json .planning/config.json

# Edit config
nano .planning/config.json
```

### 4. Verify Configuration

```bash
# Test connection
node ez-agents/bin/ez-tools.cjs config get qwen

# Test API key
curl -X POST https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation \
  -H "Authorization: Bearer $DASHSCOPE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"model": "qwen-turbo", "input": { "messages": [{"role": "user", "content": "Hello"}] }}'
```

### 5. Start Using

```bash
# Initialize project
ez-agents new-project

# Plan phase
ez-agents plan-phase "Build e-commerce platform"

# Execute
ez-agents execute-phase "1"

# Verify
ez-agents verify-work "1"
```

---

## Troubleshooting

### Error: Invalid API Key

```bash
# Verify key is set
echo $DASHSCOPE_API_KEY

# Test key
curl -X POST https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation \
  -H "Authorization: Bearer YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{"model": "qwen-turbo", "input": { "messages": [{"role": "user", "content": "test"}] }}'
```

### Error: Rate Limit Exceeded

```json
{
  "provider": {
    "qwen": {
      "retry": {
        "max_attempts": 5,
        "backoff_ms": 5000
      }
    }
  }
}
```

### Error: Model Not Found

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

---

## Additional Resources

- [Qwen Provider Guide](QWEN-PROVIDER.md)
- [Planning Workflow](QWEN-PLANNING.md)
- [Execution Workflow](QWEN-EXECUTION.md)
- [Verification Workflow](QWEN-VERIFICATION.md)
- [DashScope Documentation](https://help.aliyun.com/zh/dashscope/)
