/**
 * ResolveModelCommand — Resolve model for agent type
 */

import { BaseCommand, type CommandResult } from './index.js';
import { ModelService, MODEL_PROFILES } from '../services/model.service.js';

export interface ResolveModelOptions {
  agentType: string;
  raw?: boolean;
}

/**
 * Command to resolve model for agent type
 */
export class ResolveModelCommand extends BaseCommand {
  private readonly agentType: string;
  private readonly raw: boolean;

  constructor(cwd: string, options: ResolveModelOptions) {
    super(cwd);
    this.agentType = options.agentType;
    this.raw = options.raw ?? false;
  }

  async execute(): Promise<CommandResult> {
    if (!this.agentType) {
      this.fail('agent-type required');
    }

    const modelService = new ModelService(this.cwd);
    const model = modelService.resolve(this.agentType);

    const agentModels = MODEL_PROFILES[this.agentType];
    const result = agentModels
      ? { model, profile: 'resolved' }
      : { model, profile: 'resolved', unknown_agent: true };

    this.result(result, this.raw, model);
    return { success: true, data: result }; // Never reached
  }
}
