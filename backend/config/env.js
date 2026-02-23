const { z } = require('zod');

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().transform(Number).default('5000'),
  MONGO_URI: z.string().min(1, 'MONGO_URI is required'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_EXPIRE: z.string().default('7d'),
  CLIENT_URL: z.string().url('CLIENT_URL must be a valid URL').default('http://localhost:5500'),
  GEOCODE_DEFAULT_COUNTRY: z.string().default('India'),
  GEOCODE_USER_AGENT: z.string().default('FoodBridge/1.0'),
  GEOCODE_LOOKUP_MODE: z.enum(['remote', 'fallback', 'hybrid']).default('fallback'),
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info')
});

const validateEnv = () => {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    console.error('Environment validation failed:');
    result.error.issues.forEach((issue) => {
      console.error(`  - ${issue.path.join('.')}: ${issue.message}`);
    });
    process.exit(1);
  }

  return result.data;
};

const env = validateEnv();

module.exports = {
  env,
  validateEnv
};
