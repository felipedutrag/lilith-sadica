import { Context } from 'telegraf';

export interface BotContext extends Context {
  // Add custom session data if needed
  session?: any;
}

export type ToolAction = (args: any, ctx: BotContext) => Promise<any>;

export interface ToolRegistry {
  [key: string]: ToolAction;
}



