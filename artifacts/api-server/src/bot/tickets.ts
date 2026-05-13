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
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  Role,
} from "discord.js";

export const TICKET_CATEGORY_NAME = "🎫 التذاكر";
export const TICKET_LOG_CHANNEL = "ticket-logs";

export const TICKET_TYPES = [
  { value: "system",    label: "بوت السستم",          description: "System Bot",       emoji: "⚙️"  },
  { value: "broadcast", label: "بوت البرودكاست",       description: "Broadcast Bot",    emoji: "📢"  },
  { value: "games",     label: "بوت الالعاب",          description: "Games Bot",        emoji: "🎮"  },
  { value: "bank",      label: "بوت البنك",            description: "Bank Bot",         emoji: "🏦"  },
  { value: "coins",     label: "بوت العملات",          description: "Coins Bot",        emoji: "🪙"  },
  { value: "tickets",   label: "بوت التكت",            description: "Tickets Bot",      emoji: "🎫"  },
  { value: "groups",    label: "بوت الفروبات",         description: "Groups Bot",       emoji: "👥"  },
  { value: "roles",     label: "بوت الرولات الخاصه",  description: "Roles Bot",        emoji: "🎭"  },
  { value: "backup",    label: "بوت الباك اب",         description: "BackUp Bot",       emoji: "💾"  },
  { value: "events",    label: "بوت الفعاليات",        description: "Events Bot",       emoji: "🎉"  },
  { value: "rank",      label: "بوت التفاعل",          description: "Rank Bot",         emoji: "📊"  },
  { value: "temprooms", label: "بوت الرومات المؤقته",  description: "TempRooms Bot",    emoji: "🔊"  },
  { value: "avatar",    label: "بوت الافتار",          description: "Avatar Bot",       emoji: "🖼️"  },
  { value: "voice",     label: "بوت التوب فويس",       description: "Voice Bot",        emoji: "🎙️"  },
  { value: "fellzajil", label: "بوت الفيلنق والزاجل", description: "Fell+Zajil Bot",   emoji: "⚡"  },
  { value: "record",    label: "بوت التسجيل",          description: "Record Bot",       emoji: "🎬"  },
  { value: "streak",    label: "بوت الستريك",          description: "Streak Bot",       emoji: "🔥"  },
  { value: "custom",    label: "بوت مخصص",             description: "Custom Bot",       emoji: "🛠️"  },
  { value: "nuke",      label: "جحفله",                description: "Nuke",             emoji: "💣"  },
] as const;

export type TicketTypeValue = (typeof TICKET_TYPES)[number]["value"];

const guildConfig = new Map<string, { adminRoleId?: string }>();

export function setAdminRole(guildId: string, roleId: string) {
  guildConfig.set(guildId, { ...guildConfig.get(guildId), adminRoleId: roleId });
}

export function getAdminRole(guildId: string): string | undefined {
  return guildConfig.get(guildId)?.adminRoleId;
}

interface TicketData {
  channelId: string;
  userId: string;
  type: TicketTypeValue;
  typeLabel: string;
  claimedBy?: string;
  openedAt: number;
}

const tickets = new Map<string, TicketData>();

export function getTickets() {
  return tickets;
}

function buildTicketComponents() {
  const row1 = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId("ticket_claim")
      .setLabel("استلام")
      .setStyle(ButtonStyle.Success)
      .setEmoji("✋"),
    new ButtonBuilder()
      .setCustomId("ticket_close")
      .setLabel("اغلاق")
      .setStyle(ButtonStyle.Danger)
      .setEmoji("🔒")
  );

  const row2 = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId("ticket_rename")
      .setLabel("تغيير الاسم")
      .setStyle(ButtonStyle.Secondary)
      .setEmoji("✏️"),
    new ButtonBuilder()
      .setCustomId("ticket_call_admin")
      .setLabel("استدعاء الادارة")
      .setStyle(ButtonStyle.Primary)
      .setEmoji("📣")
  );

  return [row1, row2];
}

export async function createTicket(
  guild: Guild,
  member: GuildMember,
  type: TicketTypeValue,
  adminRoleId?: string
): Promise<TextChannel | null> {
  const existing = [...tickets.values()].find((t) => t.userId === member.id);
  if (existing) {
    const ch = guild.channels.cache.get(existing.channelId) as TextChannel | undefined;
    if (ch) return ch;
  }

  const typeInfo = TICKET_TYPES.find((t) => t.value === type)!;

  let category = guild.channels.cache.find(
    (c) => c.name === TICKET_CATEGORY_NAME && c.type === ChannelType.GuildCategory
  );

  if (!category) {
    category = await guild.channels.create({
      name: TICKET_CATEGORY_NAME,
      type: ChannelType.GuildCategory,
    });
  }

  const permissionOverwrites = [
    { id: guild.id, deny: [PermissionFlagsBits.ViewChannel] },
    {
      id: member.id,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ReadMessageHistory,
      ],
    },
  ] as NonNullable<Parameters<typeof guild.channels.create>[0]["permissionOverwrites"]> & { push: (...args: any[]) => any };

  if (adminRoleId) {
    (permissionOverwrites as any[]).push({
      id: adminRoleId,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ReadMessageHistory,
        PermissionFlagsBits.ManageMessages,
      ],
    });
  }

  const ticketChannel = await guild.channels.create({
    name: `${typeInfo.emoji}-${member.user.username}`.replace(/[^a-zA-Z0-9\u0600-\u06FF\-]/g, ""),
    type: ChannelType.GuildText,
    parent: category.id,
    permissionOverwrites,
  });

  tickets.set(ticketChannel.id, {
    channelId: ticketChannel.id,
    userId: member.id,
    type,
    typeLabel: typeInfo.label,
    openedAt: Date.now(),
  });

  const adminMention = adminRoleId ? `<@&${adminRoleId}>` : "";
  const mention = `${member}${adminMention ? ` | ${adminMention}` : ""}`;

  const typeDescriptions: Record<TicketTypeValue, string> = {
    system:    "ما هي المشكلة أو الطلب المتعلق ببوت السستم؟",
    broadcast: "ما هو الإعلان الذي تريد إرساله؟",
    games:     "ما هي المشكلة أو الطلب المتعلق ببوت الالعاب؟",
    bank:      "ما هي المشكلة أو الطلب المتعلق ببوت البنك؟",
    coins:     "ما هي المشكلة أو الطلب المتعلق ببوت العملات؟",
    tickets:   "ما هي المشكلة أو الطلب المتعلق بنظام التكت؟",
    groups:    "ما هو طلبك المتعلق بالفروبات؟",
    roles:     "ما هي الرتبة أو الطلب الذي تريده؟",
    backup:    "ما هي المشكلة أو الطلب المتعلق ببوت الباك اب؟",
    events:    "ما هو الفعالية أو الطلب الذي تريده؟",
    rank:      "ما هي المشكلة أو الطلب المتعلق بنظام التفاعل؟",
    temprooms: "ما هو الروم المؤقت الذي تريده؟",
    avatar:    "ما هو طلبك المتعلق ببوت الافتار؟",
    voice:     "ما هي المشكلة أو الطلب المتعلق بالفويس؟",
    fellzajil: "ما هي المشكلة أو الطلب المتعلق ببوت الفيلنق والزاجل؟",
    record:    "ما هي المشكلة أو الطلب المتعلق ببوت التسجيل؟",
    streak:    "ما هي المشكلة أو الطلب المتعلق بالستريك؟",
    custom:    "اشرح طلبك للبوت المخصص بالتفصيل.",
    nuke:      "⚠️ اشرح طلب الجحفلة بالتفصيل.",
  };

  const embed = new EmbedBuilder()
    .setTitle(`${typeInfo.emoji} تذكرة — ${typeInfo.label}`)
    .setDescription(
      `أهلاً ${member}!\n\n**${typeDescriptions[type]}**\n\nسيتم الرد عليك من قِبل الإدارة في أقرب وقت.`
    )
    .setColor(type === "nuke" ? 0xed4245 : 0x5865f2)
    .setFooter({ text: `ID: ${member.id} • ${typeInfo.description}` })
    .setTimestamp();

  const components = buildTicketComponents();
  await ticketChannel.send({ content: mention, embeds: [embed], components });
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
      { name: "النوع", value: ticket.typeLabel, inline: true },
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

  if (ticket.claimedBy) {
    return;
  }

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

export function buildTicketSelectMenu() {
  const select = new StringSelectMenuBuilder()
    .setCustomId("ticket_select")
    .setPlaceholder("قم باختيار نوع التذكرة...")
    .setMinValues(1)
    .setMaxValues(1);

  for (const t of TICKET_TYPES) {
    select.addOptions(
      new StringSelectMenuOptionBuilder()
        .setValue(t.value)
        .setLabel(t.label)
        .setDescription(t.description)
        .setEmoji(t.emoji)
    );
  }

  return new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select);
}

export { Role };
