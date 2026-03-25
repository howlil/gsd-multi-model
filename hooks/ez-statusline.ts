#!/usr/bin/env node
// Claude Code Statusline - EZ Agents Edition
// Shows: model | current task | directory | context usage

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

interface StatuslineInput {
  model?: {
    display_name: string;
  };
  workspace?: {
    current_dir: string;
  };
  session_id?: string;
  context_window?: {
    remaining_percentage?: number;
  };
  cwd?: string;
}

interface TodoEntry {
  status: string;
  activeForm?: string;
}

interface ContextBridgeData {
  session_id: string;
  remaining_percentage: number;
  used_pct: number;
  timestamp: number;
}

// Read JSON from stdin
let input = '';
// Timeout guard: if stdin doesn't close within 3s (e.g. pipe issues on
// Windows/Git Bash), exit silently instead of hanging. See #775.
const stdinTimeout = setTimeout(() => process.exit(0), 3000);
process.stdin.setEncoding('utf8');
process.stdin.on('data', chunk => input += chunk);
process.stdin.on('end', () => {
  clearTimeout(stdinTimeout);
  try {
    const data: StatuslineInput = JSON.parse(input);
    const model = data.model?.display_name || 'Claude';
    const dir = data.workspace?.current_dir || process.cwd();
    const session = data.session_id || '';
    const remaining = data.context_window?.remaining_percentage;

    // Context window display (shows USED percentage scaled to usable context)
    // Claude Code reserves ~16.5% for autocompact buffer, so usable context
    // is 83.5% of the total window. We normalize to show 100% at that point.
    const AUTO_COMPACT_BUFFER_PCT = 16.5;
    let ctx = '';
    if (remaining != null) {
      // Normalize: subtract buffer from remaining, scale to usable range
      const usableRemaining = Math.max(0, ((remaining - AUTO_COMPACT_BUFFER_PCT) / (100 - AUTO_COMPACT_BUFFER_PCT)) * 100);
      const used = Math.max(0, Math.min(100, Math.round(100 - usableRemaining)));

      // Write context metrics to bridge file for the context-monitor PostToolUse hook.
      // The monitor reads this file to inject agent-facing warnings when context is low.
      if (session) {
        try {
          const bridgePath = path.join(os.tmpdir(), `claude-ctx-${session}.json`);
          const bridgeData: ContextBridgeData = {
            session_id: session,
            remaining_percentage: remaining,
            used_pct: used,
            timestamp: Math.floor(Date.now() / 1000)
          };
          fs.writeFileSync(bridgePath, JSON.stringify(bridgeData));
        } catch {
          // Silent fail -- bridge is best-effort, don't break statusline
        }
      }

      // Build progress bar (10 segments)
      const filled = Math.floor(used / 10);
      const bar = '█'.repeat(filled) + '░'.repeat(10 - filled);

      // Color based on usable context thresholds
      if (used < 50) {
        ctx = ` \x1b[32m${bar} ${used}%\x1b[0m`;
      } else if (used < 65) {
        ctx = ` \x1b[33m${bar} ${used}%\x1b[0m`;
      } else if (used < 80) {
        ctx = ` \x1b[38;5;208m${bar} ${used}%\x1b[0m`;
      } else {
        ctx = ` \x1b[5;31m💀 ${bar} ${used}%\x1b[0m`;
      }
    }

    // Current task from todos
    let task = '';
    const homeDir = os.homedir();
    // Respect CLAUDE_CONFIG_DIR for custom config directory setups (#870)
    const claudeDir = process.env.CLAUDE_CONFIG_DIR || path.join(homeDir, '.claude');
    const todosDir = path.join(claudeDir, 'todos');
    if (session && fs.existsSync(todosDir)) {
      try {
        const files = fs.readdirSync(todosDir)
          .filter(f => f.startsWith(session) && f.includes('-agent-') && f.endsWith('.json'))
          .map(f => ({ name: f, mtime: fs.statSync(path.join(todosDir, f)).mtime }))
          .sort((a, b) => b.mtime.getTime() - a.mtime.getTime());

        if (files.length > 0) {
          try {
            const todos: TodoEntry[] = JSON.parse(fs.readFileSync(path.join(todosDir, files[0]?.name), 'utf8'));
            const inProgress = todos.find(t => t.status === 'in_progress');
            if (inProgress) task = inProgress.activeForm || '';
          } catch {
            // Silent fail on file parse errors
          }
        }
      } catch {
        // Silently fail on file system errors - don't break statusline
      }
    }

    // EZ Agents update available?
    let ezUpdate = '';
    const cacheFile = path.join(claudeDir, 'cache', 'ez-update-check.json');
    if (fs.existsSync(cacheFile)) {
      try {
        const cache: { update_available: boolean } = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
        if (cache.update_available) {
          ezUpdate = '\x1b[33m⬆ /ez:update\x1b[0m │ ';
        }
      } catch {
        // Silent fail on cache read errors
      }
    }

    // Output
    const dirname = path.basename(dir);
    if (task) {
      process.stdout.write(`${ezUpdate}\x1b[2m${model}\x1b[0m │ \x1b[1m${task}\x1b[0m │ \x1b[2m${dirname}\x1b[0m${ctx}`);
    } else {
      process.stdout.write(`${ezUpdate}\x1b[2m${model}\x1b[0m │ \x1b[2m${dirname}\x1b[0m${ctx}`);
    }
  } catch {
    // Silent fail - don't break statusline on parse errors
  }
});
