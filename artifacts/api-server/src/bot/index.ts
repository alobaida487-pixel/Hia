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

async function start() {
  try {
    await client.login(token as string);
    const resolvedClientId = clientId ?? client.user!.id;
    await registerSlashCommands(token as string, resolvedClientId);
  } catch (err) {
    logger.error({ err }, "Failed to start Discord bot — server will continue running");
  }
}

start();

export default client;
