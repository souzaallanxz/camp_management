import { z } from "zod";

const envSchema = z.object({
  MODE: z.string().optional(),
  VITE_NEON_DB_URL: z.string().url(),
  VITE_API_URL: z.string().url().optional(),
});

const getEnv = () => {
  if (typeof process !== 'undefined' && process.env) {
    return process.env;
  }
  return import.meta.env;
};

export const env = envSchema.parse(getEnv()); 