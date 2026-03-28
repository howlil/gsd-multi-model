#!/usr/bin/env node

/**
 * EZ Tools CLI - Main Entry Point
 *
 * Command-line interface for EZ Agents planning and execution tools.
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { output, error } from './lib/core.js';
import { extractFrontmatter } from './lib/planning/index.js';
import { cmdVerifyArtifacts, cmdVerifyKeyLinks, cmdVerifyPhaseCompleteness, cmdValidateHealth } from './lib/workflow/index.js';
import { roadmapAnalyze, roadmapGetPhase, roadmapUpdatePhaseStatus, roadmapUpdatePlanProgress } from './lib/phase/index.js';
import { stateLoad, stateUpdate } from './lib/state/index.js';
import { cmdInitNewProject, cmdInitNewMilestone, cmdInitPhaseOp, cmdInitProgress, cmdInitQuick, cmdInitVerifyWork, cmdInitMapCodebase, cmdInitResume, cmdInitPlanPhase, cmdInitExecutePhase } from './lib/init/index.js';
import { configGet, configSet } from './lib/config.js';
import { CostTracker } from './lib/cost/index.js';
import {
  cmdGenerateSlug,
  cmdCurrentTimestamp,
  cmdListTodos,
  cmdVerifyPathExists,
  cmdHistoryDigest,
  cmdResolveModel,
  cmdCommit,
  cmdSummaryExtract,
  cmdWebsearch,
  cmdProgressRender,
  cmdTodoComplete,
  cmdScaffold,
  cmdStats
} from './lib/init/index.js';
import { milestoneComplete, requirementsMarkComplete } from './lib/phase/index.js';
import { phaseComplete } from './lib/phase/index.js';
import { phaseNextDecimal, findPhaseCmd } from './lib/phase/phase.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface CommandLineArgs {
  command: string;
  subcommand?: string;
  args: string[];
  flags: Record<string, string | boolean>;
}

function parseArgs(argv: string[]): CommandLineArgs {
  const args: string[] = [];
  const flags: Record<string, string | boolean> = {};
  let command = '';
  let subcommand = '';

  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i] || '';
    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      const nextArg = argv[i + 1];
      if (nextArg && !nextArg.startsWith('--')) {
        flags[key] = nextArg;
        i++;
      } else {
        flags[key] = true;
      }
    } else if (arg.startsWith('-') && arg.length === 2) {
      const key = arg.slice(1);
      const nextArg = argv[i + 1];
      if (nextArg && !nextArg.startsWith('--')) {
        flags[key] = nextArg;
        i++;
      } else {
        flags[key] = true;
      }
    } else {
      if (!command) {
        command = arg;
      } else if (!subcommand) {
        subcommand = arg;
      } else {
        args.push(arg);
      }
    }
  }

  return { command, subcommand, args, flags };
}

async function main(): Promise<void> {
  const { command, subcommand, args, flags } = parseArgs(process.argv);

  if (!command) {
    error('No command provided. Usage: ez-tools <command> [subcommand] [args] [--flags]');
  }

  const raw = flags.raw === true;
  const cwd = process.cwd();

  try {
    switch (command) {
      case 'init': {
        const initType = subcommand || '';
        const initArg = args[0] || '';
        switch (initType) {
          case 'new-project': await cmdInitNewProject(cwd, raw); break;
          case 'new-milestone': await cmdInitNewMilestone(cwd, raw); break;
          case 'milestone-op':
          case 'phase-op': await cmdInitPhaseOp(cwd, initArg, raw); break;
          case 'progress': await cmdInitProgress(cwd, raw); break;
          case 'quick': await cmdInitQuick(cwd, initArg, raw); break;
          case 'verify-work': await cmdInitVerifyWork(cwd, initArg, raw); break;
          case 'map-codebase': await cmdInitMapCodebase(cwd, raw); break;
          case 'resume': await cmdInitResume(cwd, raw); break;
          case 'plan-phase': await cmdInitPlanPhase(cwd, initArg, raw); break;
          case 'execute-phase': await cmdInitExecutePhase(cwd, initArg, raw); break;
          default: error(`Unknown init type: ${initType}`);
        }
        break;
      }

      case 'roadmap': {
        switch (subcommand) {
          case 'analyze': await roadmapAnalyze(cwd, raw); break;
          case 'get-phase': await roadmapGetPhase(cwd, args[0] || '', raw); break;
          case 'update-phase-status': {
            const phaseNum = String(flags.phase || '');
            const status = String(flags.status || '') as 'complete' | 'pending' | 'in_progress';
            await roadmapUpdatePhaseStatus(cwd, phaseNum, status);
            break;
          }
          case 'update-plan-progress': {
            const plan = String(flags.plan || '');
            const status = String(flags.status || '') as 'complete' | 'in_progress' | 'pending';
            await roadmapUpdatePlanProgress(cwd, plan, status, raw);
            break;
          }
          default: error(`Unknown roadmap subcommand: ${subcommand || ''}`);
        }
        break;
      }

      case 'state': {
        switch (subcommand) {
          case 'load': await stateLoad(cwd, raw); break;
          case 'update': {
            const key = args[0] || '';
            const value = args[1] || '';
            await stateUpdate(cwd, key, value);
            break;
          }
          case 'update-phase-complete':
            await stateUpdate(cwd, 'current_phase', String(flags.phase || ''));
            break;
          default: error(`Unknown state subcommand: ${subcommand || ''}`);
        }
        break;
      }

      case 'progress': {
        await cmdProgressRender(cwd, undefined, raw);
        break;
      }

      case 'stats': {
        const format = flags.format as string || 'json';
        await cmdStats(cwd, format, raw);
        break;
      }

      case 'config-get':
      case 'configGet': {
        const key = args[0] || '';
        await configGet(cwd, key, raw);
        break;
      }

      case 'config-set':
      case 'configSet': {
        const key = args[0] || '';
        const value = args[1] || '';
        await configSet(cwd, key, value);
        break;
      }

      case 'resolve-model': {
        await cmdResolveModel(cwd, args[0] || '', raw);
        break;
      }

      case 'generate-slug': {
        cmdGenerateSlug(args[0] || '', raw);
        break;
      }

      case 'current-timestamp': {
        cmdCurrentTimestamp(args[0] || 'date', raw);
        break;
      }

      case 'list-todos': {
        await cmdListTodos(cwd, undefined);
        break;
      }

      case 'todo-complete': {
        const file = args[0] || '';
        const todo = args[1] || '';
        await cmdTodoComplete(cwd, file, todo);
        break;
      }

      case 'verify-path':
      case 'verifyPath': {
        cmdVerifyPathExists(cwd, args[0] || '', undefined);
        break;
      }

      case 'history-digest': {
        await cmdHistoryDigest(cwd, undefined);
        break;
      }

      case 'commit': {
        const message = args[0] || '';
        const filesFlag = flags.files as string;
        const files = filesFlag ? filesFlag.split(',') : [];
        await cmdCommit(cwd, message, files, raw, undefined);
        break;
      }

      case 'summary-extract': {
        const filePath = args[0] || '';
        const fields = flags.fields as string;
        await cmdSummaryExtract(cwd, filePath || '', fields || '', raw);
        break;
      }

      case 'websearch': {
        const query = args[0] || '';
        const limit = flags.limit ? parseInt(String(flags.limit), 10) : 5;
        const freshness = flags.freshness as string;
        await cmdWebsearch(query, { limit, freshness }, raw);
        break;
      }

      case 'scaffold': {
        const phase = flags.phase as string;
        const name = flags.name as string;
        await cmdScaffold(cwd, undefined, { phase, name }, raw);
        break;
      }

      case 'frontmatter': {
        const sub = subcommand || '';
        const filePath = args[0] || '';
        if (sub === 'get') {
          const field = flags.field as string;
          const result = extractFrontmatter(filePath);
          if (field && result) {
            output({ value: result[field] } as Record<string, unknown>, raw, String(result[field]));
          } else {
            output(result as Record<string, unknown>, raw);
          }
        } else {
          error(`Unknown frontmatter subcommand: ${sub}`);
        }
        break;
      }

      case 'verify': {
        const sub = subcommand || '';
        const target = args[0] || '';
        switch (sub) {
          case 'artifacts': await cmdVerifyArtifacts(cwd, target, raw); break;
          case 'key-links':
          case 'keyLinks': await cmdVerifyKeyLinks(cwd, target, raw); break;
          case 'phase-completeness':
          case 'phaseCompleteness': cmdVerifyPhaseCompleteness(cwd, target, raw); break;
          default: error(`Unknown verify subcommand: ${sub}`);
        }
        break;
      }

      case 'health':
      case 'validate': {
        if (subcommand === 'health' || command === 'health') {
          const options = { json: flags.json === true, repair: flags.repair === true };
          cmdValidateHealth(cwd, { json: options.json, repair: false }, raw);
        } else {
          error(`Unknown validate subcommand: ${subcommand || ''}`);
        }
        break;
      }

      case 'doctor': {
        const options = { json: flags.json === true };
        cmdValidateHealth(cwd, options, raw);
        break;
      }

      case 'cost-init':
      case 'costInit': {
        const milestone = flags.milestone as string;
        const budget = flags.budget ? parseFloat(flags.budget as string) : undefined;
        const tracker = new CostTracker(cwd);
        if (budget !== undefined) {
          tracker.setBudget(budget);
        }
        console.log('Cost tracking initialized', { milestone, budget });
        break;
      }

      case 'cost-report':
      case 'costReport': {
        const format = flags.format as string || 'text';
        const tracker = new CostTracker(cwd);
        const total = tracker.aggregate();
        if (format === 'json') {
          output(total as unknown as Record<string, unknown>);
        } else {
          console.log('Cost Report:', { total: total.total.cost.toFixed(4), tokens: total.total.tokens });
        }
        break;
      }

      case 'milestone': {
        switch (subcommand) {
          case 'complete': {
            const version = args[0] || '';
            const name = flags.name as string || '';
            await milestoneComplete(cwd, { version, name }, raw);
            break;
          }
          default: error(`Unknown milestone subcommand: ${subcommand || ''}`);
        }
        break;
      }

      case 'requirements': {
        switch (subcommand) {
          case 'mark-complete': {
            const reqIds = args.filter(a => !a.startsWith('--'));
            await requirementsMarkComplete(cwd, reqIds, raw);
            break;
          }
          default: error(`Unknown requirements subcommand: ${subcommand || ''}`);
        }
        break;
      }

      case 'phase': {
        switch (subcommand) {
          case 'complete': {
            const phaseNum = args[0] || '';
            await phaseComplete(cwd, phaseNum, raw);
            break;
          }
          case 'next-decimal': {
            const basePhase = args[0] || '';
            phaseNextDecimal(cwd, basePhase, raw);
            break;
          }
          default: error(`Unknown phase subcommand: ${subcommand || ''}`);
        }
        break;
      }

      default:
        error(`Unknown command: ${command}`);
    }
  } catch (err) {
    const errMessage = err instanceof Error ? err.message : 'Unknown error';
    console.error('Command failed:', command, subcommand, errMessage);
    error(errMessage);
  }
}

main().catch((err: Error) => {
  console.error('Unhandled error:', err.message);
  process.exit(1);
});
