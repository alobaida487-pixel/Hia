import { Client, ActivityType } from "discord.js";
import { logger } from "../../lib/logger";

export function handleReady(client: Client<true>) {
  logger.info(`Bot logged in as ${client.user.tag}`);
  client.user.setActivity("السيرفر | ?help", { type: ActivityType.Watching });
}
