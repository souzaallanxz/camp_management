import { z } from "zod";

const envSchema = z.object({
  MODE: z.string().optional(),
  VITE_NEON_DB_URL: z.string().url(),
  VITE_API_URL: z.string().url().optional(),
});

const getEnv = () => {
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    return import.meta.env;
  }
  return process.env;
};

export const env = envSchema.parse(getEnv()); 