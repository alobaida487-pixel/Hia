import {
  Client,
  GatewayIntentBits,
  Partials,
  Collection,
} from "discord.js";
import { logger } from "../lib/logger";
import { registerEvents } from "./events";
import { registerSlashCommands } from "./deploy-commands";

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.GuildModeration,
  ],
  partials: [Partials.Channel, Partials.Message],
});

(client as any).slashCommands = new Collection();

registerEvents(client);

const token = process.env["DISCORD_BOT_TOKEN"];
const clientId = process.env["DISCORD_CLIENT_ID"];

if (!token) {
  logger.error("DISCORD_BOT_TOKEN is not set");
  process.exit(1);
}

let commandsRegistered = false;

async function login(attempt = 1): Promise<void> {
  try {
    await client.login(token as string);
    logger.info("Discord bot connected successfully");

    if (!commandsRegistered) {
      const resolvedClientId = clientId ?? client.user!.id;
      await registerSlashCommands(token as string, resolvedClientId);
      commandsRegistered = true;
    }
  } catch (err: any) {
    if (err?.code === "TokenInvalid") {
      logger.error("Invalid Discord token — bot will not start. Set a valid DISCORD_BOT_TOKEN.");
      return;
    }
    const delay = Math.min(5000 * attempt, 60000);
    logger.error({ err, attempt }, `Failed to connect — retrying in ${delay / 1000}s`);
    setTimeout(() => login(attempt + 1), delay);
  }
}

client.on("shardDisconnect", (event, shardId) => {
  logger.warn({ code: event.code, shardId }, "Discord shard disconnected — will auto-reconnect");
});

client.on("shardError", (error, shardId) => {
  logger.error({ error, shardId }, "Discord shard error");
});

client.on("invalidated", () => {
  logger.warn("Discord session invalidated — re-logging in...");
  commandsRegistered = false;
  setTimeout(() => login(), 3000);
});

client.on("error", (error) => {
  logger.error({ error }, "Discord client error");
});

login();

export default client;
