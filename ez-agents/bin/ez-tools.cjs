#!/usr/bin/env node

/**
 * EZ Tools — CLI utility for EZ Agents workflow operations
 *
 * Replaces repetitive inline bash patterns across ~50 EZ Agents command/workflow/agent files.
 * Centralizes: config parsing, model resolution, phase lookup, git commits, summary verification.
 *
 * Usage: node ez-tools.cjs <command> [args] [--raw]
 *
 * Atomic Commands:
 *   state load                         Load project config + state
 *   state json                         Output STATE.md frontmatter as JSON
 *   state update <field> <value>       Update a STATE.md field
 *   state get [section]                Get STATE.md content or section
 *   state patch --field val ...        Batch update STATE.md fields
 *   resolve-model <agent-type>         Get model for agent based on profile
 *   find-phase <phase>                 Find phase directory by number
 *   commit <message> [--files f1 f2]   Commit planning docs
 *   verify-summary <path>              Verify a SUMMARY.md file
 *   generate-slug <text>               Convert text to URL-safe slug
 *   current-timestamp [format]         Get timestamp (full|date|filename)
 *   list-todos [area]                  Count and enumerate pending todos
 *   verify-path-exists <path>          Check file/directory existence
 *   config-ensure-section              Initialize .planning/config.json
 *   history-digest                     Aggregate all SUMMARY.md data
 *   summary-extract <path> [--fields]  Extract structured data from SUMMARY.md
 *   state-snapshot                     Structured parse of STATE.md
 *   phase-plan-index <phase>           Index plans with waves and status
 *   websearch <query>                  Search web via Brave API (if configured)
 *     [--limit N] [--freshness day|week|month]
 *
 * Context Access Commands:
 *   context read <pattern>             Read local files using glob patterns
 *   context fetch <url>                Fetch content from URL (HTTPS only, requires confirmation)
 *   context request                    Interactive context gathering mode
 *
 * Phase Operations:
 *   phase next-decimal <phase>         Calculate next decimal phase number
 *   phase add <description>            Append new phase to roadmap + create dir
 *   phase insert <after> <description> Insert decimal phase after existing
 *   phase remove <phase> [--force]     Remove phase, renumber all subsequent
 *   phase complete <phase>             Mark phase done, update state + roadmap
 *
 * Roadmap Operations:
 *   roadmap get-phase <phase>          Extract phase section from ROADMAP.md
 *   roadmap analyze                    Full roadmap parse with disk status
 *   roadmap update-plan-progress <N>   Update progress table row from disk (PLAN vs SUMMARY counts)
 *
 * Requirements Operations:
 *   requirements mark-complete <ids>   Mark requirement IDs as complete in REQUIREMENTS.md
 *                                      Accepts: REQ-01,REQ-02 or REQ-01 REQ-02 or [REQ-01, REQ-02]
 *
 * Milestone Operations:
 *   milestone complete <version>       Archive milestone, create MILESTONES.md
 *     [--name <name>]
 *     [--archive-phases]               Move phase dirs to milestones/vX.Y-phases/
 *
 * Validation:
 *   validate consistency               Check phase numbering, disk/roadmap sync
 *   validate health [--repair]         Check .planning/ integrity, optionally repair
 *
 * Progress:
 *   progress [json|table|bar]          Render progress in various formats
 *
 * Todos:
 *   todo complete <filename>           Move todo from pending to completed
 *
 * Scaffolding:
 *   scaffold context --phase <N>       Create CONTEXT.md template
 *   scaffold uat --phase <N>           Create UAT.md template
 *   scaffold verification --phase <N>  Create VERIFICATION.md template
 *   scaffold phase-dir --phase <N>     Create phase directory
 *     --name <name>
 *
 * Frontmatter CRUD:
 *   frontmatter get <file> [--field k] Extract frontmatter as JSON
 *   frontmatter set <file> --field k   Update single frontmatter field
 *     --value jsonVal
 *   frontmatter merge <file>           Merge JSON into frontmatter
 *     --data '{json}'
 *   frontmatter validate <file>        Validate required fields
 *     --schema plan|summary|verification
 *
 * Verification Suite:
 *   verify plan-structure <file>       Check PLAN.md structure + tasks
 *   verify phase-completeness <phase>  Check all plans have summaries
 *   verify references <file>           Check @-refs + paths resolve
 *   verify commits <h1> [h2] ...      Batch verify commit hashes
 *   verify artifacts <plan-file>       Check must_haves.artifacts
 *   verify key-links <plan-file>       Check must_haves.key_links
 *
 * Template Fill:
 *   template fill summary --phase N    Create pre-filled SUMMARY.md
 *     [--plan M] [--name "..."]
 *     [--fields '{json}']
 *   template fill plan --phase N       Create pre-filled PLAN.md
 *     [--plan M] [--type execute|tdd]
 *     [--wave N] [--fields '{json}']
 *   template fill verification         Create pre-filled VERIFICATION.md
 *     --phase N [--fields '{json}']
 *
 * State Progression:
 *   state advance-plan                 Increment plan counter
 *   state record-metric --phase N      Record execution metrics
 *     --plan M --duration Xmin
 *     [--tasks N] [--files N]
 *   state update-progress              Recalculate progress bar
 *   state add-decision --summary "..."  Add decision to STATE.md
 *     [--phase N] [--rationale "..."]
 *     [--summary-file path] [--rationale-file path]
 *   state add-blocker --text "..."     Add blocker
 *     [--text-file path]
 *   state resolve-blocker --text "..." Remove blocker
 *   state record-session               Update session continuity
 *     --stopped-at "..."
 *     [--resume-file path]
 *
 * Compound Commands (workflow-specific initialization):
 *   init execute-phase <phase>         All context for execute-phase workflow
 *   init plan-phase <phase>            All context for plan-phase workflow
 *   init new-project                   All context for new-project workflow
 *   init new-milestone                 All context for new-milestone workflow
 *   init quick <description>           All context for quick workflow
 *   init resume                        All context for resume-project workflow
 *   init verify-work <phase>           All context for verify-work workflow
 *   init phase-op <phase>              Generic phase operation context
 *   init todos [area]                  All context for todo workflows
 *   init milestone-op                  All context for milestone operations
 *   init map-codebase                  All context for map-codebase workflow
 *   init progress                      All context for progress workflow
 */

const fs = require('fs');
const path = require('path');
const { error, output } = require('./lib/core.cjs');
const state = require('./lib/state.cjs');
const phase = require('./lib/phase.cjs');
const roadmap = require('./lib/roadmap.cjs');
const verify = require('./lib/verify.cjs');
const config = require('./lib/config.cjs');
const template = require('./lib/template.cjs');
const milestone = require('./lib/milestone.cjs');
const commands = require('./lib/commands.cjs');
const init = require('./lib/init.cjs');
const frontmatter = require('./lib/frontmatter.cjs');
const HealthCheck = require('./lib/health-check.cjs');
const auth = require('./lib/auth.cjs');
const FileAccessService = require('./lib/file-access.cjs');
const URLFetchService = require('./lib/url-fetch.cjs');
const ContextManager = require('./lib/context-manager.cjs');
const PackageManagerService = require('./lib/package-manager-service.cjs');

// Session management modules
const SessionManager = require('./lib/session-manager.cjs');
const SessionExport = require('./lib/session-export.cjs');
const SessionImport = require('./lib/session-import.cjs');
const SessionChain = require('./lib/session-chain.cjs');
const MemoryCompression = require('./lib/memory-compression.cjs');

// ─── CLI Router ───────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);

  // Optional cwd override for sandboxed subagents running outside project root.
  let cwd = process.cwd();
  const cwdEqArg = args.find(arg => arg.startsWith('--cwd='));
  const cwdIdx = args.indexOf('--cwd');
  if (cwdEqArg) {
    const value = cwdEqArg.slice('--cwd='.length).trim();
    if (!value) error('Missing value for --cwd');
    args.splice(args.indexOf(cwdEqArg), 1);
    cwd = path.resolve(value);
  } else if (cwdIdx !== -1) {
    const value = args[cwdIdx + 1];
    if (!value || value.startsWith('--')) error('Missing value for --cwd');
    args.splice(cwdIdx, 2);
    cwd = path.resolve(value);
  }

  if (!fs.existsSync(cwd) || !fs.statSync(cwd).isDirectory()) {
    error(`Invalid --cwd: ${cwd}`);
  }

  const rawIndex = args.indexOf('--raw');
  const raw = rawIndex !== -1;
  if (rawIndex !== -1) args.splice(rawIndex, 1);

  const command = args[0];

  if (!command) {
    error('Usage: ez-tools <command> [args] [--raw] [--cwd <path>]\nCommands: state, resolve-model, find-phase, commit, verify-summary, verify, frontmatter, template, generate-slug, current-timestamp, list-todos, verify-path-exists, config-ensure-section, init, health, session, resume, export-session, import-session, chain, context');
  }

  switch (command) {
    case 'state': {
      const subcommand = args[1];
      if (subcommand === 'json') {
        state.cmdStateJson(cwd, raw);
      } else if (subcommand === 'update') {
        state.cmdStateUpdate(cwd, args[2], args[3]);
      } else if (subcommand === 'get') {
        state.cmdStateGet(cwd, args[2], raw);
      } else if (subcommand === 'patch') {
        const patches = {};
        for (let i = 2; i < args.length; i += 2) {
          const key = args[i].replace(/^--/, '');
          const value = args[i + 1];
          if (key && value !== undefined) {
            patches[key] = value;
          }
        }
        state.cmdStatePatch(cwd, patches, raw);
      } else if (subcommand === 'advance-plan') {
        state.cmdStateAdvancePlan(cwd, raw);
      } else if (subcommand === 'record-metric') {
        const phaseIdx = args.indexOf('--phase');
        const planIdx = args.indexOf('--plan');
        const durationIdx = args.indexOf('--duration');
        const tasksIdx = args.indexOf('--tasks');
        const filesIdx = args.indexOf('--files');
        state.cmdStateRecordMetric(cwd, {
          phase: phaseIdx !== -1 ? args[phaseIdx + 1] : null,
          plan: planIdx !== -1 ? args[planIdx + 1] : null,
          duration: durationIdx !== -1 ? args[durationIdx + 1] : null,
          tasks: tasksIdx !== -1 ? args[tasksIdx + 1] : null,
          files: filesIdx !== -1 ? args[filesIdx + 1] : null,
        }, raw);
      } else if (subcommand === 'update-progress') {
        state.cmdStateUpdateProgress(cwd, raw);
      } else if (subcommand === 'add-decision') {
        const phaseIdx = args.indexOf('--phase');
        const summaryIdx = args.indexOf('--summary');
        const summaryFileIdx = args.indexOf('--summary-file');
        const rationaleIdx = args.indexOf('--rationale');
        const rationaleFileIdx = args.indexOf('--rationale-file');
        state.cmdStateAddDecision(cwd, {
          phase: phaseIdx !== -1 ? args[phaseIdx + 1] : null,
          summary: summaryIdx !== -1 ? args[summaryIdx + 1] : null,
          summary_file: summaryFileIdx !== -1 ? args[summaryFileIdx + 1] : null,
          rationale: rationaleIdx !== -1 ? args[rationaleIdx + 1] : '',
          rationale_file: rationaleFileIdx !== -1 ? args[rationaleFileIdx + 1] : null,
        }, raw);
      } else if (subcommand === 'add-blocker') {
        const textIdx = args.indexOf('--text');
        const textFileIdx = args.indexOf('--text-file');
        state.cmdStateAddBlocker(cwd, {
          text: textIdx !== -1 ? args[textIdx + 1] : null,
          text_file: textFileIdx !== -1 ? args[textFileIdx + 1] : null,
        }, raw);
      } else if (subcommand === 'resolve-blocker') {
        const textIdx = args.indexOf('--text');
        state.cmdStateResolveBlocker(cwd, textIdx !== -1 ? args[textIdx + 1] : null, raw);
      } else if (subcommand === 'record-session') {
        const stoppedIdx = args.indexOf('--stopped-at');
        const resumeIdx = args.indexOf('--resume-file');
        state.cmdStateRecordSession(cwd, {
          stopped_at: stoppedIdx !== -1 ? args[stoppedIdx + 1] : null,
          resume_file: resumeIdx !== -1 ? args[resumeIdx + 1] : 'None',
        }, raw);
      } else {
        state.cmdStateLoad(cwd, raw);
      }
      break;
    }

    case 'health': {
      const health = new HealthCheck();
      const result = health.runAll();
      console.log(JSON.stringify(result, null, 2));
      break;
    }

    case 'auth': {
      const subcommand = args[1];
      if (!subcommand) {
        error('Usage: ez-tools auth <save|list|delete|test> [provider] [secret]\nSubcommands: save, list, delete, test');
      }

      switch (subcommand) {
        case 'save': {
          const provider = args[2];
          const secret = args[3];
          if (!provider || !secret) {
            error('Usage: ez-tools auth save <provider> <secret>');
          }
          const success = await auth.saveCredential(provider, secret);
          if (success) {
            console.log(`✓ Credential saved for ${provider}`);
          } else {
            console.error('Failed to save credential');
            process.exit(1);
          }
          break;
        }

        case 'list': {
          const providers = await auth.listProviders();
          const usingKeychain = auth.isKeychainAvailable();
          
          console.log('');
          console.log('Provider       Storage');
          console.log('─────────────────────────');
          if (providers.length === 0) {
            console.log('No credentials stored');
          } else {
            for (const p of providers) {
              const storage = usingKeychain ? 'Keychain ✓' : 'File (fallback)';
              console.log(`${p.padEnd(14)} ${storage}`);
            }
          }
          if (!usingKeychain) {
            console.log('');
            console.log('⚠ Using file storage — consider installing keytar for better security');
          }
          break;
        }

        case 'delete': {
          const provider = args[2];
          const force = args.includes('--force');
          if (!provider) {
            error('Usage: ez-tools auth delete <provider> [--force]');
          }
          
          if (!force) {
            const readline = require('readline');
            const rl = readline.createInterface({
              input: process.stdin,
              output: process.stdout
            });
            
            const answer = await new Promise(resolve => {
              rl.question(`Delete credential for ${provider}? [y/N] `, resolve);
              rl.close();
            });
            
            if (answer.toLowerCase() !== 'y') {
              console.log('Delete cancelled');
              break;
            }
          }
          
          const success = await auth.deleteCredential(provider);
          if (success) {
            console.log(`✓ Credential deleted for ${provider}`);
          } else {
            console.error(`No credential found for ${provider}`);
            process.exit(1);
          }
          break;
        }

        case 'test': {
          const usingKeychain = auth.isKeychainAvailable();
          const providers = await auth.listProviders();
          
          console.log('');
          console.log('Credential System Test');
          console.log('══════════════════════');
          console.log(`Keychain (keytar): ${usingKeychain ? 'Available ✓' : 'Unavailable'}`);
          console.log(`Storage mode: ${usingKeychain ? 'System keychain' : 'Fallback file'}`);
          console.log('');
          console.log(`Stored providers: ${providers.length}`);
          if (providers.length > 0) {
            console.log(`  ${providers.join(', ')}`);
          }
          if (!usingKeychain) {
            console.log('');
            console.log('Tip: Install keytar for better security:');
            console.log('  npm install keytar');
          }
          break;
        }

        default: {
          error('Unknown auth subcommand: ' + subcommand + '\nValid: save, list, delete, test');
        }
      }
      break;
    }

    case 'resolve-model': {
      commands.cmdResolveModel(cwd, args[1], raw);
      break;
    }

    case 'find-phase': {
      phase.cmdFindPhase(cwd, args[1], raw);
      break;
    }

    case 'commit': {
      const amend = args.includes('--amend');
      const filesIndex = args.indexOf('--files');
      // Collect all positional args between command name and first flag,
      // then join them — handles both quoted ("multi word msg") and
      // unquoted (multi word msg) invocations from different shells
      const endIndex = filesIndex !== -1 ? filesIndex : args.length;
      const messageArgs = args.slice(1, endIndex).filter(a => !a.startsWith('--'));
      const message = messageArgs.join(' ') || undefined;
      const files = filesIndex !== -1 ? args.slice(filesIndex + 1).filter(a => !a.startsWith('--')) : [];
      commands.cmdCommit(cwd, message, files, raw, amend);
      break;
    }

    case 'verify-summary': {
      const summaryPath = args[1];
      const countIndex = args.indexOf('--check-count');
      const checkCount = countIndex !== -1 ? parseInt(args[countIndex + 1], 10) : 2;
      verify.cmdVerifySummary(cwd, summaryPath, checkCount, raw);
      break;
    }

    case 'template': {
      const subcommand = args[1];
      if (subcommand === 'select') {
        template.cmdTemplateSelect(cwd, args[2], raw);
      } else if (subcommand === 'fill') {
        const templateType = args[2];
        const phaseIdx = args.indexOf('--phase');
        const planIdx = args.indexOf('--plan');
        const nameIdx = args.indexOf('--name');
        const typeIdx = args.indexOf('--type');
        const waveIdx = args.indexOf('--wave');
        const fieldsIdx = args.indexOf('--fields');
        template.cmdTemplateFill(cwd, templateType, {
          phase: phaseIdx !== -1 ? args[phaseIdx + 1] : null,
          plan: planIdx !== -1 ? args[planIdx + 1] : null,
          name: nameIdx !== -1 ? args[nameIdx + 1] : null,
          type: typeIdx !== -1 ? args[typeIdx + 1] : 'execute',
          wave: waveIdx !== -1 ? args[waveIdx + 1] : '1',
          fields: fieldsIdx !== -1 ? JSON.parse(args[fieldsIdx + 1]) : {},
        }, raw);
      } else {
        error('Unknown template subcommand. Available: select, fill');
      }
      break;
    }

    case 'frontmatter': {
      const subcommand = args[1];
      const file = args[2];
      if (subcommand === 'get') {
        const fieldIdx = args.indexOf('--field');
        frontmatter.cmdFrontmatterGet(cwd, file, fieldIdx !== -1 ? args[fieldIdx + 1] : null, raw);
      } else if (subcommand === 'set') {
        const fieldIdx = args.indexOf('--field');
        const valueIdx = args.indexOf('--value');
        frontmatter.cmdFrontmatterSet(cwd, file, fieldIdx !== -1 ? args[fieldIdx + 1] : null, valueIdx !== -1 ? args[valueIdx + 1] : undefined, raw);
      } else if (subcommand === 'merge') {
        const dataIdx = args.indexOf('--data');
        frontmatter.cmdFrontmatterMerge(cwd, file, dataIdx !== -1 ? args[dataIdx + 1] : null, raw);
      } else if (subcommand === 'validate') {
        const schemaIdx = args.indexOf('--schema');
        frontmatter.cmdFrontmatterValidate(cwd, file, schemaIdx !== -1 ? args[schemaIdx + 1] : null, raw);
      } else {
        error('Unknown frontmatter subcommand. Available: get, set, merge, validate');
      }
      break;
    }

    case 'verify': {
      const subcommand = args[1];
      if (subcommand === 'plan-structure') {
        verify.cmdVerifyPlanStructure(cwd, args[2], raw);
      } else if (subcommand === 'phase-completeness') {
        verify.cmdVerifyPhaseCompleteness(cwd, args[2], raw);
      } else if (subcommand === 'references') {
        verify.cmdVerifyReferences(cwd, args[2], raw);
      } else if (subcommand === 'commits') {
        verify.cmdVerifyCommits(cwd, args.slice(2), raw);
      } else if (subcommand === 'artifacts') {
        verify.cmdVerifyArtifacts(cwd, args[2], raw);
      } else if (subcommand === 'key-links') {
        verify.cmdVerifyKeyLinks(cwd, args[2], raw);
      } else {
        error('Unknown verify subcommand. Available: plan-structure, phase-completeness, references, commits, artifacts, key-links');
      }
      break;
    }

    case 'generate-slug': {
      commands.cmdGenerateSlug(args[1], raw);
      break;
    }

    case 'current-timestamp': {
      commands.cmdCurrentTimestamp(args[1] || 'full', raw);
      break;
    }

    case 'list-todos': {
      commands.cmdListTodos(cwd, args[1], raw);
      break;
    }

    case 'verify-path-exists': {
      commands.cmdVerifyPathExists(cwd, args[1], raw);
      break;
    }

    case 'config-ensure-section': {
      config.cmdConfigEnsureSection(cwd, raw);
      break;
    }

    case 'config-set': {
      config.cmdConfigSet(cwd, args[1], args[2], raw);
      break;
    }

    case 'config-get': {
      config.cmdConfigGet(cwd, args[1], raw);
      break;
    }

    case 'history-digest': {
      commands.cmdHistoryDigest(cwd, raw);
      break;
    }

    case 'phases': {
      const subcommand = args[1];
      if (subcommand === 'list') {
        const typeIndex = args.indexOf('--type');
        const phaseIndex = args.indexOf('--phase');
        const options = {
          type: typeIndex !== -1 ? args[typeIndex + 1] : null,
          phase: phaseIndex !== -1 ? args[phaseIndex + 1] : null,
          includeArchived: args.includes('--include-archived'),
        };
        phase.cmdPhasesList(cwd, options, raw);
      } else {
        error('Unknown phases subcommand. Available: list');
      }
      break;
    }

    case 'roadmap': {
      const subcommand = args[1];
      if (subcommand === 'get-phase') {
        roadmap.cmdRoadmapGetPhase(cwd, args[2], raw);
      } else if (subcommand === 'analyze') {
        roadmap.cmdRoadmapAnalyze(cwd, raw);
      } else if (subcommand === 'update-plan-progress') {
        roadmap.cmdRoadmapUpdatePlanProgress(cwd, args[2], raw);
      } else {
        error('Unknown roadmap subcommand. Available: get-phase, analyze, update-plan-progress');
      }
      break;
    }

    case 'requirements': {
      const subcommand = args[1];
      if (subcommand === 'mark-complete') {
        milestone.cmdRequirementsMarkComplete(cwd, args.slice(2), raw);
      } else {
        error('Unknown requirements subcommand. Available: mark-complete');
      }
      break;
    }

    case 'phase': {
      const subcommand = args[1];
      if (subcommand === 'next-decimal') {
        phase.cmdPhaseNextDecimal(cwd, args[2], raw);
      } else if (subcommand === 'add') {
        phase.cmdPhaseAdd(cwd, args.slice(2).join(' '), raw);
      } else if (subcommand === 'insert') {
        phase.cmdPhaseInsert(cwd, args[2], args.slice(3).join(' '), raw);
      } else if (subcommand === 'remove') {
        const forceFlag = args.includes('--force');
        phase.cmdPhaseRemove(cwd, args[2], { force: forceFlag }, raw);
      } else if (subcommand === 'complete') {
        phase.cmdPhaseComplete(cwd, args[2], raw);
      } else {
        error('Unknown phase subcommand. Available: next-decimal, add, insert, remove, complete');
      }
      break;
    }

    case 'milestone': {
      const subcommand = args[1];
      if (subcommand === 'complete') {
        const nameIndex = args.indexOf('--name');
        const archivePhases = args.includes('--archive-phases');
        // Collect --name value (everything after --name until next flag or end)
        let milestoneName = null;
        if (nameIndex !== -1) {
          const nameArgs = [];
          for (let i = nameIndex + 1; i < args.length; i++) {
            if (args[i].startsWith('--')) break;
            nameArgs.push(args[i]);
          }
          milestoneName = nameArgs.join(' ') || null;
        }
        milestone.cmdMilestoneComplete(cwd, args[2], { name: milestoneName, archivePhases }, raw);
      } else {
        error('Unknown milestone subcommand. Available: complete');
      }
      break;
    }

    case 'package-manager': {
      const subcommand = args[1];
      
      if (!subcommand) {
        error('Usage: ez-tools package-manager <detect|install|add|remove|info> [options]\nSubcommands: detect, install, add, remove, info');
      }

      try {
        const service = new PackageManagerService(cwd);

        switch (subcommand) {
          case 'detect': {
            const detector = new (require('./lib/package-manager-detector.cjs'))(cwd);
            const result = detector.detect();
            if (raw) {
              console.log(`manager=${result.manager} source=${result.source} confidence=${result.confidence}`);
            } else {
              console.log(JSON.stringify(result, null, 2));
            }
            break;
          }

          case 'install': {
            await service.initialize();
            const frozenLockfile = args.includes('--frozen');
            const production = args.includes('--production');
            const result = await service.install({ frozenLockfile, production });
            if (!raw) {
              console.log(result);
            }
            break;
          }

          case 'add': {
            await service.initialize();
            const dev = args.includes('--dev') || args.includes('-D');
            // Extract packages (filter out flags)
            const packages = args.slice(2).filter(arg => !arg.startsWith('--'));
            if (packages.length === 0) {
              error('Usage: ez-tools package-manager add <package> [--dev|-D]');
            }
            const result = await service.add(packages, { dev });
            if (!raw) {
              console.log(result);
            }
            break;
          }

          case 'remove': {
            await service.initialize();
            // Extract packages (filter out flags)
            const packages = args.slice(2).filter(arg => !arg.startsWith('--'));
            if (packages.length === 0) {
              error('Usage: ez-tools package-manager remove <package>');
            }
            const result = await service.remove(packages);
            if (!raw) {
              console.log(result);
            }
            break;
          }

          case 'info': {
            await service.initialize();
            const result = service.getInfo();
            if (raw) {
              console.log(`manager=${result.manager} source=${result.source} cwd=${result.cwd} lockfile=${result.lockfile}`);
            } else {
              console.log(JSON.stringify(result, null, 2));
            }
            break;
          }

          default: {
            error('Unknown package-manager subcommand: ' + subcommand + '\nValid: detect, install, add, remove, info');
          }
        }
      } catch (err) {
        error(err.message);
      }
      break;
    }

    case 'validate': {
      const subcommand = args[1];
      if (subcommand === 'consistency') {
        verify.cmdValidateConsistency(cwd, raw);
      } else if (subcommand === 'health') {
        const repairFlag = args.includes('--repair');
        verify.cmdValidateHealth(cwd, { repair: repairFlag }, raw);
      } else {
        error('Unknown validate subcommand. Available: consistency, health');
      }
      break;
    }

    case 'progress': {
      const subcommand = args[1] || 'json';
      commands.cmdProgressRender(cwd, subcommand, raw);
      break;
    }

    case 'stats': {
      const subcommand = args[1] || 'json';
      commands.cmdStats(cwd, subcommand, raw);
      break;
    }

    case 'todo': {
      const subcommand = args[1];
      if (subcommand === 'complete') {
        commands.cmdTodoComplete(cwd, args[2], raw);
      } else {
        error('Unknown todo subcommand. Available: complete');
      }
      break;
    }

    case 'scaffold': {
      const scaffoldType = args[1];
      const phaseIndex = args.indexOf('--phase');
      const nameIndex = args.indexOf('--name');
      const scaffoldOptions = {
        phase: phaseIndex !== -1 ? args[phaseIndex + 1] : null,
        name: nameIndex !== -1 ? args.slice(nameIndex + 1).join(' ') : null,
      };
      commands.cmdScaffold(cwd, scaffoldType, scaffoldOptions, raw);
      break;
    }

    case 'init': {
      const workflow = args[1];
      switch (workflow) {
        case 'execute-phase':
          init.cmdInitExecutePhase(cwd, args[2], raw);
          break;
        case 'plan-phase':
          init.cmdInitPlanPhase(cwd, args[2], raw);
          break;
        case 'new-project':
          await init.cmdInitNewProject(cwd, raw);
          break;
        case 'new-milestone':
          init.cmdInitNewMilestone(cwd, raw);
          break;
        case 'quick':
          init.cmdInitQuick(cwd, args.slice(2).join(' '), raw);
          break;
        case 'resume':
          init.cmdInitResume(cwd, raw);
          break;
        case 'verify-work':
          init.cmdInitVerifyWork(cwd, args[2], raw);
          break;
        case 'phase-op':
          init.cmdInitPhaseOp(cwd, args[2], raw);
          break;
        case 'todos':
          init.cmdInitTodos(cwd, args[2], raw);
          break;
        case 'milestone-op':
          init.cmdInitMilestoneOp(cwd, raw);
          break;
        case 'map-codebase':
          init.cmdInitMapCodebase(cwd, raw);
          break;
        case 'progress':
          init.cmdInitProgress(cwd, raw);
          break;
        default:
          error(`Unknown init workflow: ${workflow}\nAvailable: execute-phase, plan-phase, new-project, new-milestone, quick, resume, verify-work, phase-op, todos, milestone-op, map-codebase, progress`);
      }
      break;
    }

    case 'phase-plan-index': {
      phase.cmdPhasePlanIndex(cwd, args[1], raw);
      break;
    }

    case 'state-snapshot': {
      state.cmdStateSnapshot(cwd, raw);
      break;
    }

    case 'summary-extract': {
      const summaryPath = args[1];
      const fieldsIndex = args.indexOf('--fields');
      const fields = fieldsIndex !== -1 ? args[fieldsIndex + 1].split(',') : null;
      commands.cmdSummaryExtract(cwd, summaryPath, fields, raw);
      break;
    }

    case 'websearch': {
      const query = args[1];
      const limitIdx = args.indexOf('--limit');
      const freshnessIdx = args.indexOf('--freshness');
      await commands.cmdWebsearch(query, {
        limit: limitIdx !== -1 ? parseInt(args[limitIdx + 1], 10) : 10,
        freshness: freshnessIdx !== -1 ? args[freshnessIdx + 1] : null,
      }, raw);
      break;
    }

    case 'context': {
      const subcommand = args[1];
      
      if (subcommand === 'read') {
        const patterns = args.slice(2);
        if (patterns.length === 0) {
          console.error('Usage: ez-tools context read <pattern1> [pattern2...]');
          console.error('Example: node ez-tools.cjs context read "README.md" "src/**/*.ts"');
          process.exit(1);
        }
        const fileAccess = new FileAccessService(cwd);
        const results = fileAccess.readFiles(patterns);
        results.forEach(file => {
          console.log(`\n--- ${file.path} ---\n`);
          console.log(file.content);
        });
        break;
      }
      
      if (subcommand === 'fetch') {
        const url = args[2];
        if (!url) {
          console.error('Usage: ez-tools context fetch <url>');
          console.error('Example: node ez-tools.cjs context fetch https://example.com/doc.md');
          process.exit(1);
        }
        const urlFetch = new URLFetchService();
        const validated = urlFetch.validateUrl(url);
        if (!validated.valid) {
          console.error(`Invalid URL: ${validated.error}`);
          process.exit(1);
        }
        const confirmed = await URLFetchService.confirmUrlFetch(url);
        if (!confirmed) {
          console.log('Fetch cancelled by user');
          process.exit(0);
        }
        const result = await urlFetch.fetchUrl(url);
        console.log(result.content);
        break;
      }
      
      if (subcommand === 'request') {
        const contextManager = new ContextManager(cwd);
        console.log('Context Request Mode');
        console.log('Enter file patterns or URLs (one per line, empty line to finish):\n');

        const readline = require('readline');
        const rl = readline.createInterface({
          input: process.stdin,
          output: process.stdout
        });
        
        const files = [];
        const urls = [];

        console.log('> ');
        for await (const line of rl) {
          if (!line.trim()) break;
          if (line.startsWith('http')) {
            urls.push(line);
          } else {
            files.push(line);
          }
          console.log('> ');
        }

        const result = await contextManager.requestContext({ files, urls });
        console.log('\n=== Aggregated Context ===\n');
        console.log(result.context);
        console.log(`\n\nSources: ${result.sources.length}`);
        if (result.errors.length > 0) {
          console.log(`Errors: ${result.errors.length}`);
          result.errors.forEach(e => console.error(`  - ${e.source}: ${e.message}`));
        }
        break;
      }
      
      if (!subcommand) {
        console.log('Context Access Commands');
        console.log('═══════════════════════');
        console.log('');
        console.log('  context read <pattern>     Read local files using glob patterns');
        console.log('  context fetch <url>        Fetch content from URL (HTTPS only)');
        console.log('  context request            Interactive context gathering mode');
        console.log('');
        console.log('Examples:');
        console.log('  node ez-tools.cjs context read "README.md"');
        console.log('  node ez-tools.cjs context read "src/**/*.ts" "!*.test.ts"');
        console.log('  node ez-tools.cjs context fetch https://example.com/spec.md');
        console.log('  node ez-tools.cjs context request');
        break;
      }
      
      error(`Unknown context subcommand: ${subcommand}\nAvailable: read, fetch, request`);
    }

    // ─── Session Management Commands ─────────────────────────────────────────

    case 'session': {
      const subcommand = args[1];
      const sessionMgr = new SessionManager();

      switch (subcommand) {
        case 'list': {
          const sessions = sessionMgr.listSessions();
          const limitIdx = args.indexOf('--limit');
          const limit = limitIdx !== -1 ? parseInt(args[limitIdx + 1]) : 20;
          output({ sessions: sessions.slice(0, limit) });
          break;
        }

        case 'get': {
          const sessionId = args[2];
          if (!sessionId) {
            error('Usage: ez-tools session get <session_id>');
          }
          const session = sessionMgr.loadSession(sessionId);
          if (!session) {
            error(`Session not found: ${sessionId}`);
          }
          output(session);
          break;
        }

        case 'create': {
          const modelIdx = args.indexOf('--model');
          const phaseIdx = args.indexOf('--phase');
          const planIdx = args.indexOf('--plan');
          const newSessionId = sessionMgr.createSession({
            model: modelIdx !== -1 ? args[modelIdx + 1] : undefined,
            phase: phaseIdx !== -1 ? parseInt(args[phaseIdx + 1]) : undefined,
            plan: planIdx !== -1 ? parseInt(args[planIdx + 1]) : undefined
          });
          output({ session_id: newSessionId });
          break;
        }

        case 'end': {
          const sessionId = args[2];
          if (!sessionId) {
            error('Usage: ez-tools session end <session_id> [--status status]');
          }
          const statusIdx = args.indexOf('--status');
          const status = statusIdx !== -1 ? args[statusIdx + 1] : 'completed';
          const success = sessionMgr.endSession(sessionId, { status });
          if (!success) {
            error(`Failed to end session: ${sessionId}`);
          }
          output({ ended: sessionId });
          break;
        }

        case 'compress': {
          const sessionId = args[2];
          const thresholdIdx = args.indexOf('--threshold');
          const threshold = thresholdIdx !== -1 ? parseInt(args[thresholdIdx + 1]) : 50;
          
          if (!sessionId) {
            error('Usage: ez-tools session compress <session_id> [--threshold N]');
          }

          const compressor = new MemoryCompression(sessionMgr);
          const result = compressor.compress(sessionId, { threshold });
          output(result);
          break;
        }

        default:
          error('Usage: ez-tools session <list|get|create|end|compress> [args]');
      }
      break;
    }

    case 'resume': {
      const sessionId = args[1];
      const sessionMgr = new SessionManager();

      const session = sessionId
        ? sessionMgr.loadSession(sessionId)
        : sessionMgr.getLastSession();

      if (!session) {
        error('No session found to resume');
      }

      // Output session summary for display
      output({
        session_id: session.metadata.session_id,
        model: session.metadata.model,
        phase: session.metadata.phase,
        plan: session.metadata.plan,
        last_action: session.state.last_action,
        next_action: session.state.next_recommended_action,
        incomplete_tasks: session.state.incomplete_tasks
      });
      break;
    }

    case 'export-session': {
      const sessionId = args[1] || 'last';
      const formatIdx = args.indexOf('--format');
      const outputIdx = args.indexOf('--output');
      
      const format = formatIdx !== -1 ? args[formatIdx + 1] : 'markdown';
      const outputPath = outputIdx !== -1 ? args[outputIdx + 1] : null;

      const sessionMgr = new SessionManager();
      const exporter = new SessionExport(sessionMgr);

      const actualSessionId = sessionId === 'last'
        ? sessionMgr.getLastSession()?.metadata?.session_id
        : sessionId;

      if (!actualSessionId) {
        error('No sessions found');
      }

      try {
        const result = exporter.exportToFile(actualSessionId, format, outputPath);
        output(result);
      } catch (err) {
        error(`Export failed: ${err.message}`);
      }
      break;
    }

    case 'import-session': {
      const filePath = args[1];
      const sourceModelIdx = args.indexOf('--source-model');
      const sourceModel = sourceModelIdx !== -1 ? args[sourceModelIdx + 1] : null;

      if (!filePath) {
        error('Usage: ez-tools import-session <file.json> [--source-model <model>]');
      }

      const sessionMgr = new SessionManager();
      const importer = new SessionImport(sessionMgr);

      try {
        const result = importer.import(filePath, { sourceModel });
        output(result);
      } catch (err) {
        error(`Import failed: ${err.message}`);
      }
      break;
    }

    case 'chain': {
      const sessionId = args[1];
      const direction = args[2];

      if (!sessionId) {
        error('Usage: ez-tools chain <session_id> [previous|next|visualize|repair]');
      }

      const sessionMgr = new SessionManager();
      const chain = new SessionChain(sessionMgr);

      if (direction === 'previous' || direction === 'next') {
        const result = chain.navigate(sessionId, direction);
        if (!result) {
          output({ navigation: null, message: `No session ${direction} of ${sessionId}` });
        } else {
          output(result);
        }
      } else if (direction === 'visualize' || !direction) {
        const viz = chain.getChainVisualization(sessionId);
        output({ visualization: viz });
      } else if (direction === 'repair') {
        const result = chain.repairChain(sessionId);
        output(result);
      } else {
        error('Usage: ez-tools chain <session_id> [previous|next|visualize|repair]');
      }
      break;
    }

    // ─── Default/Error Case ──────────────────────────────────────────────────

    default:
      error(`Unknown command: ${command}`);
  }
}

main();
