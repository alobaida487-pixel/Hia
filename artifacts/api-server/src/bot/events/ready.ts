import { Client, ActivityType } from "discord.js";
import { logger } from "../../lib/logger";

export function handleReady(client: Client<true>) {
  logger.info(`Bot logged in as ${client.user.tag}`);
  client.user.setPresence({
    activities: [
      {
        name: "#GRoupLost ,5888",
        type: ActivityType.Streaming,
        url: "https://www.twitch.tv/placeholder",
      },
    ],
    status: "online",
  });
}
