import { ensureSchema } from "../server/db/schema.js";
import { closePool } from "../server/db/pool.js";
import { requireCronConfig } from "../server/config/env.js";
import { sendDueDailyCampaign } from "../server/services/campaignService.js";

requireCronConfig();
await ensureSchema();
const result = await sendDueDailyCampaign();
await closePool();
console.log(JSON.stringify(result));
