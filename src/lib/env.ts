import { z } from 'zod';

const envSchema = z.object({
  GEMINI_API_KEY: z.string().optional(), // Relaxed for client rendering
  GEMINI_AUDIO_API_KEY: z.string().optional(),
  TELEGRAM_BOT_TOKEN: z.string().optional(), // Relaxed
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GGPIX_API_KEY: z.string().optional(),
  GOOGLE_ADS_CLIENT_ID: z.string().optional(),
  GOOGLE_ADS_CLIENT_SECRET: z.string().optional(),
  GOOGLE_ADS_DEVELOPER_TOKEN: z.string().optional(),
  GOOGLE_ADS_CUSTOMER_ID: z.string().optional(),
  GOOGLE_ADS_MMC: z.string().optional(),
  GOOGLE_ADS_REFRESH_TOKEN: z.string().optional(),
  SUPABASE_URL: z.string().optional(), // Relaxed
  SUPABASE_ANON_KEY: z.string().optional(), // Relaxed
  SUPABASE_SERVICE_ROLE: z.string().optional(),
  DATABASE_URL: z.string().optional(),
  GOOGLE_DOCS_REFRESH_TOKEN: z.string().optional(),
  PORT: z.string().optional().default('3000'),
});

export const env = envSchema.parse({
  GEMINI_API_KEY: process.env.GEMINI_API_KEY,
  GEMINI_AUDIO_API_KEY: process.env.GEMINI_AUDIO_API_KEY,
  TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN,
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
  GGPIX_API_KEY: process.env.GGPIX_API_KEY,
  GOOGLE_ADS_CLIENT_ID: process.env.GOOGLE_ADS_CLIENT_ID,
  GOOGLE_ADS_CLIENT_SECRET: process.env.GOOGLE_ADS_CLIENT_SECRET,
  GOOGLE_ADS_DEVELOPER_TOKEN: process.env.GOOGLE_ADS_DEVELOPER_TOKEN,
  GOOGLE_ADS_CUSTOMER_ID: process.env.GOOGLE_ADS_CUSTOMER_ID,
  GOOGLE_ADS_MMC: process.env.GOOGLE_ADS_MMC,
  GOOGLE_ADS_REFRESH_TOKEN: process.env.GOOGLE_ADS_REFRESH_TOKEN,
  SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL,
  SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY,
  SUPABASE_SERVICE_ROLE: process.env.SUPABASE_SERVICE_ROLE,
  DATABASE_URL: process.env.DATABASE_URL,
  GOOGLE_DOCS_REFRESH_TOKEN: process.env.GOOGLE_DOCS_REFRESH_TOKEN,
  PORT: process.env.PORT,
});



