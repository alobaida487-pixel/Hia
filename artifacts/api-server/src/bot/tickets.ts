import {
  Guild,
  GuildMember,
  TextChannel,
  PermissionFlagsBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
} from "discord.js";

export const TICKET_CATEGORY_NAME = "🎫 التذاكر";
export const TICKET_LOG_CHANNEL = "ticket-logs";

interface TicketData {
  channelId: string;
  userId: string;
  subject: string;
  claimedBy?: string;
  openedAt: number;
}

const tickets = new Map<string, TicketData>();

export function getTickets() {
  return tickets;
}

export async function createTicket(
  guild: Guild,
  member: GuildMember,
  subject: string
): Promise<TextChannel | null> {
  const existing = [...tickets.values()].find(
    (t) => t.userId === member.id
  );
  if (existing) {
    const ch = guild.channels.cache.get(existing.channelId) as TextChannel | undefined;
    if (ch) return ch;
  }

  let category = guild.channels.cache.find(
    (c) => c.name === TICKET_CATEGORY_NAME && c.type === ChannelType.GuildCategory
  );

  if (!category) {
    category = await guild.channels.create({
      name: TICKET_CATEGORY_NAME,
      type: ChannelType.GuildCategory,
    });
  }

  const ticketChannel = await guild.channels.create({
    name: `ticket-${member.user.username}`,
    type: ChannelType.GuildText,
    parent: category.id,
    permissionOverwrites: [
      {
        id: guild.id,
        deny: [PermissionFlagsBits.ViewChannel],
      },
      {
        id: member.id,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.ReadMessageHistory,
        ],
      },
    ],
  });

  tickets.set(ticketChannel.id, {
    channelId: ticketChannel.id,
    userId: member.id,
    subject,
    openedAt: Date.now(),
  });

  const embed = new EmbedBuilder()
    .setTitle("🎫 تذكرة جديدة")
    .setDescription(
      `**الموضوع:** ${subject}\n**العضو:** ${member}\n\nمرحباً ${member}، سيتم الرد عليك في أقرب وقت.`
    )
    .setColor(0x5865f2)
    .setTimestamp()
    .setFooter({ text: `ID: ${member.id}` });

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId("ticket_claim")
      .setLabel("استلام التذكرة")
      .setStyle(ButtonStyle.Primary)
      .setEmoji("✋"),
    new ButtonBuilder()
      .setCustomId("ticket_close")
      .setLabel("إغلاق التذكرة")
      .setStyle(ButtonStyle.Danger)
      .setEmoji("🔒")
  );

  await ticketChannel.send({ embeds: [embed], components: [row] });
  return ticketChannel;
}

export async function closeTicket(
  channel: TextChannel,
  closedBy: GuildMember
): Promise<void> {
  const ticket = tickets.get(channel.id);
  if (!ticket) return;

  const messages = await channel.messages.fetch({ limit: 100 });
  const logContent = messages
    .reverse()
    .map(
      (m) =>
        `[${new Date(m.createdTimestamp).toLocaleString("ar-SA")}] ${m.author.tag}: ${m.content || "[embed/attachment]"}`
    )
    .join("\n");

  const guild = channel.guild;
  let logChannel = guild.channels.cache.find(
    (c) => c.name === TICKET_LOG_CHANNEL
  ) as TextChannel | undefined;

  if (!logChannel) {
    logChannel = (await guild.channels.create({
      name: TICKET_LOG_CHANNEL,
      type: ChannelType.GuildText,
      permissionOverwrites: [
        { id: guild.id, deny: [PermissionFlagsBits.ViewChannel] },
      ],
    })) as TextChannel;
  }

  const embed = new EmbedBuilder()
    .setTitle("📋 سجل التذكرة المغلقة")
    .addFields(
      { name: "القناة", value: channel.name, inline: true },
      { name: "المستخدم", value: `<@${ticket.userId}>`, inline: true },
      { name: "الموضوع", value: ticket.subject, inline: true },
      { name: "أُغلق بواسطة", value: `${closedBy}`, inline: true },
      {
        name: "تاريخ الفتح",
        value: new Date(ticket.openedAt).toLocaleString("ar-SA"),
        inline: true,
      }
    )
    .setColor(0xed4245)
    .setTimestamp();

  const logBuffer = Buffer.from(logContent || "لا توجد رسائل", "utf-8");

  await logChannel.send({
    embeds: [embed],
    files: [{ attachment: logBuffer, name: `ticket-${channel.name}.txt` }],
  });

  tickets.delete(channel.id);

  const closeEmbed = new EmbedBuilder()
    .setDescription(`🔒 تم إغلاق التذكرة بواسطة ${closedBy}`)
    .setColor(0xed4245);

  await channel.send({ embeds: [closeEmbed] });
  setTimeout(() => channel.delete().catch(() => {}), 5000);
}

export async function claimTicket(
  channel: TextChannel,
  claimedBy: GuildMember
): Promise<void> {
  const ticket = tickets.get(channel.id);
  if (!ticket) return;

  ticket.claimedBy = claimedBy.id;

  await channel.permissionOverwrites.edit(claimedBy.id, {
    ViewChannel: true,
    SendMessages: true,
    ReadMessageHistory: true,
  });

  const embed = new EmbedBuilder()
    .setDescription(`✋ تم استلام التذكرة بواسطة ${claimedBy}`)
    .setColor(0x57f287)
    .setTimestamp();

  await channel.send({ embeds: [embed] });
}
