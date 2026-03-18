# Qwen Code Installation Guide

**Important:** Qwen Code uses a different directory structure than other AI assistants. This document explains the behavior and how to fix installation issues.

---

## ⚠️ Quick Fix for Existing Users

If `/ez:*` commands don't work in Qwen Code, run:

```bash
node -e "require('child_process').execSync('node scripts/fix-qwen-installation.js', {cwd: require('path').join(require('os').homedir(), '.qwen/ez-agents'), stdio: 'inherit'})"
```

Or manually:

```bash
# Copy commands to correct location
mkdir -p ~/.qwen/commands/ez
cp ~/.qwen/ez-agents/workflows/*.md ~/.qwen/commands/ez/

# Restart Qwen Code
```

Then restart Qwen Code and try `/ez:help` again.

---

## Problem: Qwen Code Commands Not Working

### Symptoms

```
✕ Unknown command: /ez-quick
✕ Unknown command: /ez:new-project
```

### Root Cause

**Qwen Code uses `~/.qwen/commands/ez/` directory, NOT `~/.qwen/skills/`**

| AI Assistant | Commands Location | Structure |
|--------------|------------------|-----------|
| Claude Code | `~/.claude/commands/ez/` | ✅ Nested |
| OpenCode | `~/.config/opencode/command/` | ✅ Flat |
| Gemini | `~/.gemini/commands/ez/` | ✅ Nested |
| Codex | `~/.codex/skills/ez-*/` | ✅ Skills |
| Copilot | `~/.copilot/skills/ez-*/` | ✅ Skills |
| **Qwen Code** | `~/.qwen/commands/ez/` | ✅ **Nested** |
| Kimi Code | `~/.kimi/skills/ez-*/` | ✅ Skills |

### Why This Happens

1. **ez-agents installer** (before v3.4.1) installed Qwen Code commands to `~/.qwen/skills/`
2. **Qwen Code** only loads commands from `~/.qwen/commands/`
3. Commands in `skills/` directory are **ignored** by Qwen Code

---

## Solution: Fixed in v3.4.1+

### For New Installations (v3.4.1+)

The installer now correctly installs to `~/.qwen/commands/ez/`:

```bash
# Install latest version
npm install -g git+https://github.com/howlil/ez-agents.git

# Install for Qwen Code
ez-agents --qwen --global
```

Expected output:
```
✓ Installed 40 commands to commands/ez/
```

### For Existing Installations (v3.3.0 - v3.4.0)

Run the fix script:

```bash
# Option 1: Use fix script
cd ~/.qwen/ez-agents
node scripts/fix-qwen-installation.js

# Option 2: Manual fix
mkdir -p ~/.qwen/commands/ez
cp ~/.qwen/ez-agents/workflows/*.md ~/.qwen/commands/ez/
```

Then **restart Qwen Code**.

---

## Verification

### Check Installation

```bash
# Check if commands exist
ls ~/.qwen/commands/ez/*.md

# Should show 40 command files:
# add-phase.md, add-tests.md, ..., quick.md, ..., verify-work.md
```

### Test in Qwen Code

1. **Open Qwen Code** (restart if already open)
2. **Run:** `/ez:help`
3. **Expected:** List of all available ez-agents commands

If you see the help menu, installation is successful! ✅

---

## Directory Structure Comparison

### ❌ Wrong (Old Installation)

```
~/.qwen/
├── ez-agents/
│   └── workflows/
│       ├── new-project.md
│       ├── plan-phase.md
│       └── ...
└── skills/          ← WRONG LOCATION
    ├── ez-new-project/
    │   └── SKILL.md
    └── ez-plan-phase/
        └── SKILL.md
```

### ✅ Correct (New Installation)

```
~/.qwen/
├── ez-agents/
│   └── workflows/
│       ├── new-project.md
│       ├── plan-phase.md
│       └── ...
└── commands/        ← CORRECT LOCATION
    └── ez/
        ├── new-project.md
        ├── plan-phase.md
        ├── quick.md
        └── ... (40 commands)
```

---

## Technical Details

### How Qwen Code Loads Commands

Qwen Code scans `~/.qwen/commands/` directory for:

1. **Flat structure:** `~/.qwen/commands/*.md`
2. **Nested structure:** `~/.qwen/commands/ez/*.md`

Files must be:
- Markdown (`.md`)
- Directly in `commands/` or in subdirectories like `commands/ez/`
- Valid markdown with optional YAML frontmatter

### Why Skills Don't Work

Qwen Code **does not** auto-load from `~/.qwen/skills/` because:

1. **Different design:** Qwen Code uses simple markdown commands
2. **No skill system:** Unlike Codex/Copilot, Qwen doesn't have skill wrappers
3. **Direct execution:** Commands are executed directly as markdown

### Command Format

Qwen Code commands are simple markdown:

```markdown
# ez:new-project

Initialize a new EZ Agents project.

## Usage

/ez:new-project [options]

## Implementation

[Command implementation...]
```

No YAML frontmatter or SKILL.md wrapper needed!

---

## Troubleshooting

### Commands Still Not Working

**1. Verify files exist:**
```bash
ls ~/.qwen/commands/ez/*.md | wc -l
# Should show: 40
```

**2. Check file permissions:**
```bash
# Windows
dir C:\Users\YOUR_NAME\.qwen\commands\ez\*.md

# Linux/Mac
ls -la ~/.qwen/commands/ez/*.md
```

**3. Restart Qwen Code:**
- Close ALL Qwen Code windows
- Reopen Qwen Code
- Try `/ez:help` again

**4. Check Qwen Code version:**
```
/ez:version
```

Older versions may have different command loading behavior.

### Commands Partially Working

If some commands work but others don't:

**1. Check for duplicates:**
```bash
# Remove old skills
rm -rf ~/.qwen/skills/ez-*

# Ensure only commands/ez/ exists
ls ~/.qwen/commands/ez/
```

**2. Reinstall:**
```bash
ez-agents --qwen --global --force
```

### Error: "Permission Denied"

**Windows:**
```powershell
# Run as Administrator
# Or adjust permissions:
icacls ~/.qwen/commands/ez /grant Users:F
```

**Linux/Mac:**
```bash
chmod -R 755 ~/.qwen/commands/ez
chown -R $USER:$USER ~/.qwen/commands/ez
```

---

## Migration Guide

### From v3.3.0 or Earlier

```bash
# 1. Backup old installation
mv ~/.qwen/skills/ez-* ~/.qwen/skills/ez-backup/

# 2. Install new version
npm install -g git+https://github.com/howlil/ez-agents.git

# 3. Reinstall for Qwen
ez-agents --qwen --global

# 4. Verify
ls ~/.qwen/commands/ez/*.md

# 5. Restart Qwen Code
```

### From v3.4.0

v3.4.0 has the fix in the installer, but you may need to reinstall:

```bash
ez-agents --qwen --global --force
```

---

## For Developers

### Adding New Commands

1. **Add to:** `commands/ez/your-command.md`
2. **Test locally:**
   ```bash
   cp commands/ez/your-command.md ~/.qwen/commands/ez/
   ```
3. **Restart Qwen Code**
4. **Test:** `/ez:your-command`

### Testing Installation

```javascript
// test-qwen-installation.js
const fs = require('fs');
const path = require('path');
const os = require('os');

const qwenCommands = path.join(os.homedir(), '.qwen', 'commands', 'ez');

if (!fs.existsSync(qwenCommands)) {
  console.error('❌ Qwen commands directory not found');
  process.exit(1);
}

const commands = fs.readdirSync(qwenCommands).filter(f => f.endsWith('.md'));
console.log(`✅ Found ${commands.length} commands in ${qwenCommands}`);

if (commands.length < 36) {
  console.warn('⚠️ Expected at least 36 commands');
  process.exit(1);
}

console.log('✅ Qwen Code installation is correct');
```

---

## FAQ

### Q: Why doesn't Qwen Code use skills/ like Codex?

**A:** Qwen Code was designed with a simpler command system. It uses direct markdown execution instead of the skill wrapper system.

### Q: Can I use both skills/ and commands/?

**A:** No, Qwen Code only loads from `commands/`. Files in `skills/` are ignored.

### Q: Do I need to restart Qwen Code after installing commands?

**A:** Yes, Qwen Code scans the commands directory on startup.

### Q: How do I know which version of ez-agents I have?

**A:** Run:
```bash
ez-agents --version
# or
cat ~/.qwen/ez-agents/VERSION
```

### Q: Will this fix work for Kimi Code too?

**A:** No, Kimi Code correctly uses `skills/` directory. This fix is only for Qwen Code.

---

## References

- [Qwen Code Documentation](https://qwen.ai/docs)
- [EZ Agents README](../README.md)
- [Qwen Provider Guide](../docs/QWEN-README.md)
- [Installation Script](../bin/install.js)

---

## Changelog

### v3.4.1 (2026-03-18)
- ✅ Fixed Qwen Code installation to use `commands/ez/`
- ✅ Added `copyCommandsAsQwenCommands()` function
- ✅ Deprecated `copyCommandsAsQwenSkills()` function
- ✅ Added fix script for existing users

### v3.3.0 and Earlier
- ❌ Installed to `~/.qwen/skills/` (wrong location)
- ❌ Commands not loaded by Qwen Code

---

**Last Updated:** March 18, 2026  
**Version:** v3.4.1+
