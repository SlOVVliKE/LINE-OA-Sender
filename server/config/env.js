const DEFAULT_TIMEZONE = "Asia/Bangkok";

function readEnv(name, fallback = "") {
  return process.env[name] || fallback;
}

export const config = {
  nodeEnv: readEnv("NODE_ENV", "development"),
  port: Number(readEnv("PORT", "10000")),
  appBaseUrl: readEnv("APP_BASE_URL", ""),
  databaseUrl: readEnv("DATABASE_URL", ""),
  lineChannelAccessToken: readEnv("LINE_CHANNEL_ACCESS_TOKEN", ""),
  lineChannelSecret: readEnv("LINE_CHANNEL_SECRET", ""),
  cloudinaryCloudName: readEnv("CLOUDINARY_CLOUD_NAME", ""),
  cloudinaryApiKey: readEnv("CLOUDINARY_API_KEY", ""),
  cloudinaryApiSecret: readEnv("CLOUDINARY_API_SECRET", ""),
  adminPassword: readEnv("ADMIN_PASSWORD", ""),
  sessionSecret: readEnv("SESSION_SECRET", ""),
  cronSecret: readEnv("CRON_SECRET", ""),
  timezone: DEFAULT_TIMEZONE
};

export function requireRuntimeConfig() {
  const required = [
    "databaseUrl",
    "cloudinaryCloudName",
    "cloudinaryApiKey",
    "cloudinaryApiSecret",
    "adminPassword",
    "sessionSecret"
  ];

  const missing = required.filter((key) => !config[key]);
  if (missing.length) {
    throw new Error(`Missing required environment values: ${missing.join(", ")}`);
  }
}

export function requireCronConfig() {
  requireRuntimeConfig();
  if (!config.cronSecret) {
    throw new Error("Missing required environment value: cronSecret");
  }
}
