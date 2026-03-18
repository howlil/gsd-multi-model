# Qwen Provider Guide

**EZ Agents** now supports Alibaba Qwen (DashScope) as a first-class provider with the same authentication method as Qwen Code CLI.

## Overview

Qwen provider enables you to use Alibaba's Qwen models (Qwen-Max, Qwen-Plus, Qwen-Turbo) for AI-assisted development with EZ Agents.

### Supported Models

| Model | Description | Best For |
|-------|-------------|----------|
| `qwen-max` | Most powerful Qwen model | Complex planning, architecture design |
| `qwen-plus` | Balanced performance | Code execution, implementation |
| `qwen-turbo` | Fast and cost-effective | Quick tasks, verification |

---

## Authentication Setup

### Method 1: Environment Variable (Recommended for CLI)

```bash
# Set your DashScope API key
export DASHSCOPE_API_KEY="sk-your-api-key-here"

# Windows PowerShell
$env:DASHSCOPE_API_KEY="sk-your-api-key-here"

# Windows CMD
set DASHSCOPE_API_KEY=sk-your-api-key-here
```

### Method 2: System Keychain (Secure Storage)

EZ Agents stores API keys securely using system keychain:

```bash
# Save Qwen API key to system keychain
node ez-agents/bin/ez-tools.cjs config set qwen api_key "sk-your-api-key-here"
```

### Method 3: Configuration File

Create or edit `.planning/config.json`:

```json
{
  "provider": {
    "default": "qwen",
    "qwen": {
      "api_key": "sk-your-api-key-here",
      "models": {
        "high": "qwen-max",
        "balanced": "qwen-plus",
        "budget": "qwen-turbo"
      }
    }
  }
}
```

---

## Getting Your DashScope API Key

1. **Sign up** at [Alibaba Cloud DashScope](https://dashscope.console.aliyun.com/)

2. **Navigate** to API Key Management

3. **Create** a new API key

4. **Copy** the key and save it securely

5. **Verify** your key works:
   ```bash
   curl -X POST https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation \
     -H "Authorization: Bearer sk-your-api-key" \
     -H "Content-Type: application/json" \
     -d '{
       "model": "qwen-turbo",
       "input": { "messages": [{"role": "user", "content": "Hello"}] }
     }'
   ```

---

## Configuration

### Global Configuration

Edit `.planning/config.json`:

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
      "provider": "qwen",
      "model": "qwen-plus"
    }
  }
}
```

### Per-Agent Configuration

Different agents can use different Qwen models:

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
    },
    "ez-debugger": {
      "provider": "qwen",
      "model": "qwen-max",
      "temperature": 0.5
    }
  }
}
```

---

## Usage Examples

### Basic Usage

```bash
# Initialize new project with Qwen
npx ez-agents --qwen --global
ez-agents new-project

# Run with Qwen provider
ez-agents plan-phase "Implement user authentication"
ez-agents execute-phase "1"
ez-agents verify-work "1"
```

### Multi-Provider Setup

Use different providers for different tasks:

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

---

## Model Selection Strategy

### Planning Phase

**Recommended:** `qwen-max`

- Best for complex reasoning
- Architecture design
- Requirements analysis
- Task decomposition

```json
{
  "ez-planner": {
    "provider": "qwen",
    "model": "qwen-max",
    "temperature": 0.7,
    "max_tokens": 4096
  }
}
```

### Execution Phase

**Recommended:** `qwen-plus`

- Balanced performance and cost
- Code generation
- File modifications
- Implementation tasks

```json
{
  "ez-executor": {
    "provider": "qwen",
    "model": "qwen-plus",
    "temperature": 0.3,
    "max_tokens": 8192
  }
}
```

### Verification Phase

**Recommended:** `qwen-plus` or `qwen-turbo`

- Quick validation
- Test verification
- Quality checks

```json
{
  "ez-verifier": {
    "provider": "qwen",
    "model": "qwen-plus",
    "temperature": 0.2,
    "max_tokens": 2048
  }
}
```

---

## Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `DASHSCOPE_API_KEY` | Qwen API key | `sk-xxxxxxxx` |
| `QWEN_MODEL_HIGH` | High-performance model | `qwen-max` |
| `QWEN_MODEL_BALANCED` | Balanced model | `qwen-plus` |
| `QWEN_MODEL_BUDGET` | Cost-effective model | `qwen-turbo` |

---

## Troubleshooting

### API Key Issues

**Error:** `Invalid API key`

**Solution:**
1. Verify your API key is correct
2. Check if the key has expired
3. Ensure the key has sufficient permissions

```bash
# Test API key
curl -X POST https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation \
  -H "Authorization: Bearer sk-your-key" \
  -H "Content-Type: application/json" \
  -d '{"model": "qwen-turbo", "input": { "messages": [{"role": "user", "content": "test"}] }}'
```

### Rate Limiting

**Error:** `Rate limit exceeded`

**Solution:**
1. Check your quota in DashScope console
2. Upgrade your plan if needed
3. Implement retry logic in config:

```json
{
  "provider": {
    "qwen": {
      "retry": {
        "max_attempts": 3,
        "backoff_ms": 1000
      }
    }
  }
}
```

### Model Not Found

**Error:** `Model not found`

**Solution:**
1. Verify model name is correct
2. Check model availability in your region
3. Ensure your account has access to the model

---

## Best Practices

### 1. Use Model Profiles

```json
{
  "model_profile": "balanced",
  "provider": {
    "qwen": {
      "models": {
        "high": "qwen-max",
        "balanced": "qwen-plus",
        "budget": "qwen-turbo"
      }
    }
  }
}
```

### 2. Set Appropriate Temperature

- **Planning:** 0.6-0.8 (creative)
- **Execution:** 0.2-0.4 (precise)
- **Verification:** 0.1-0.3 (strict)

### 3. Monitor Token Usage

```bash
# Check token usage in logs
ez-agents stats
```

### 4. Use Caching

Enable response caching for repeated queries:

```json
{
  "provider": {
    "qwen": {
      "cache": {
        "enabled": true,
        "ttl_seconds": 3600
      }
    }
  }
}
```

---

## API Reference

### DashScope Endpoints

| Endpoint | URL |
|----------|-----|
| Text Generation | `https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation` |
| Vision | `https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation` |
| Embeddings | `https://dashscope.aliyuncs.com/api/v1/services/embeddings/text-embedding/text-embedding` |

### Request Format

```json
{
  "model": "qwen-max",
  "input": {
    "messages": [
      {"role": "system", "content": "You are a helpful assistant"},
      {"role": "user", "content": "Hello"}
    ]
  },
  "parameters": {
    "result_format": "message",
    "temperature": 0.7,
    "max_tokens": 2048
  }
}
```

### Response Format

```json
{
  "output": {
    "choices": [
      {
        "message": {
          "role": "assistant",
          "content": "Hello! How can I help you?"
        }
      }
    ]
  },
  "usage": {
    "input_tokens": 10,
    "output_tokens": 20,
    "total_tokens": 30
  }
}
```

---

## Security Considerations

1. **Never commit API keys** to version control
2. **Use environment variables** or system keychain
3. **Rotate keys regularly** for security
4. **Monitor usage** for unusual activity
5. **Set spending limits** in DashScope console

---

## Support

- **DashScope Docs:** https://help.aliyun.com/zh/dashscope/
- **API Reference:** https://dashscope.console.aliyun.com/api
- **EZ Agents Issues:** https://github.com/howlil/ez-agents/issues

---

## Changelog

### v3.3.0
- Added Qwen provider documentation
- Enhanced Qwen adapter with model selection
- Added authentication examples

### v3.2.0
- Initial Qwen provider support
- Basic DashScope integration
