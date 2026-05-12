import { Client, Events } from "discord.js";
import { handleReady } from "./ready";
import { handleInteraction } from "./interaction";
import { handleMessage } from "./message";

export function registerEvents(client: Client) {
  client.once(Events.ClientReady, handleReady);
  client.on(Events.InteractionCreate, handleInteraction);
  client.on(Events.MessageCreate, handleMessage);
}
