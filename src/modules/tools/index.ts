import { adsTools, adsToolDeclarations } from '../ads/tools';
import { obsidianTools } from '../obsidian/tools';
import { supabaseTools, supabaseToolDeclarations } from '../supabase/tools';
import { okxTools, okxToolDeclarations } from '../okx/tools';
import { paymentTools, paymentToolDeclarations } from '../payments/tools';
import { scrapingTools, scrapingToolDeclarations } from '../scraping/tools';
import { multimediaTools, multimediaToolDeclarations } from '../multimedia/tools';
import { agentTools, agentToolDeclarations } from '../agents/tools';
import { systemTools, systemToolDeclarations } from '../system/tools';
import { communicationTools, communicationToolDeclarations } from '../communication/tools';
import { voiceTools, voiceToolDeclarations } from '../voice/tools';
import { browserTools, browserToolDeclarations } from '../browser/tools';
import { ToolRegistry } from '@/types';

export const actionRegistry: ToolRegistry = {
  ...adsTools,
  ...obsidianTools,
  ...supabaseTools,
  ...okxTools,
  ...paymentTools,
  ...scrapingTools,
  ...multimediaTools,
  ...agentTools,
  ...systemTools,
  ...communicationTools,
  ...voiceTools,
  ...browserTools,
};

export const toolsDeclaration = [
  ...adsToolDeclarations,
  ...supabaseToolDeclarations,
  ...okxToolDeclarations,
  ...paymentToolDeclarations,
  ...scrapingToolDeclarations,
  ...multimediaToolDeclarations,
  ...agentToolDeclarations,
  ...systemToolDeclarations,
  ...communicationToolDeclarations,
  ...voiceToolDeclarations,
  ...browserToolDeclarations,
];
