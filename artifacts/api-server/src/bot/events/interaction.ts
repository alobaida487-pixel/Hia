import {
  Interaction,
  ChatInputCommandInteraction,
  ButtonInteraction,
  StringSelectMenuInteraction,
  ModalSubmitInteraction,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  EmbedBuilder,
  PermissionFlagsBits,
  TextChannel,
  GuildMember,
  ChannelType,
  ButtonBuilder,
  ButtonStyle,
} from "discord.js";
import { logger } from "../../lib/logger";
import {
  createTicket,
  closeTicket,
  claimTicket,
  getTickets,
  setAdminRole,
  getAdminRole,
  buildTicketSelectMenu,
  TICKET_TYPES,
  TicketTypeValue,
} from "../tickets";

export async function handleInteraction(interaction: Interaction) {
  if (interaction.isChatInputCommand()) {
    await handleSlashCommand(interaction);
  } else if (interaction.isButton()) {
    await handleButton(interaction);
  } else if (interaction.isStringSelectMenu()) {
    await handleSelectMenu(interaction);
  } else if (interaction.isModalSubmit()) {
    await handleModalSubmit(interaction);
  }
}

// ─── Slash Commands ───────────────────────────────────────────────────────────

async function handleSlashCommand(interaction: ChatInputCommandInteraction) {
  const { commandName, guild, member } = interaction;

  if (!guild || !member) {
    await interaction.reply({ content: "❌ هذا الأمر يعمل فقط داخل السيرفر.", ephemeral: true });
    return;
  }

  const guildMember = member as GuildMember;

  try {
    switch (commandName) {
      case "ban": await handleBan(interaction, guildMember); break;
      case "kick": await handleKick(interaction, guildMember); break;
      case "timeout": await handleTimeout(interaction, guildMember); break;
      case "untimeout": await handleUntimeout(interaction, guildMember); break;
      case "unban": await handleUnban(interaction, guildMember); break;
      case "warn": await handleWarn(interaction, guildMember); break;
      case "purge": await handlePurge(interaction, guildMember); break;
      case "nuke": await handleNuke(interaction, guildMember); break;
      case "broadcast": await handleBroadcast(interaction, guildMember); break;
      case "ticketpanel": await handleTicketPanel(interaction, guildMember); break;
      case "ticketsetup": await handleTicketSetup(interaction, guildMember); break;
      case "userinfo": await handleUserInfo(interaction); break;
      case "serverinfo": await handleServerInfo(interaction); break;
      case "lock": await handleLock(interaction, guildMember); break;
      case "unlock": await handleUnlock(interaction, guildMember); break;
      case "lockall": await handleLockAll(interaction, guildMember); break;
      case "unlockall": await handleUnlockAll(interaction, guildMember); break;
      case "giverole": await handleGiveRole(interaction, guildMember); break;
      case "removerole": await handleRemoveRole(interaction, guildMember); break;
      case "roleinfo": await handleRoleInfo(interaction); break;
      case "roles": await handleRoles(interaction); break;
      default:
        await interaction.reply({ content: "❌ أمر غير معروف.", ephemeral: true });
    }
  } catch (err) {
    logger.error({ err, commandName }, "Error handling slash command");
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({ content: "❌ حدث خطأ أثناء تنفيذ الأمر.", ephemeral: true }).catch(() => {});
    }
  }
}

// ─── Select Menu ──────────────────────────────────────────────────────────────

async function handleSelectMenu(interaction: StringSelectMenuInteraction) {
  if (interaction.customId !== "ticket_select") return;
  if (!interaction.guild || !interaction.member) return;

  const type = interaction.values[0] as TicketTypeValue;
  const typeInfo = TICKET_TYPES.find((t) => t.value === type);
  if (!typeInfo) return;

  const guildMember = interaction.member as GuildMember;
  const adminRoleId = getAdminRole(interaction.guild.id);

  await interaction.deferReply({ ephemeral: true });

  const existing = [...getTickets().values()].find((t) => t.userId === guildMember.id);
  if (existing) {
    const ch = interaction.guild.channels.cache.get(existing.channelId);
    if (ch) {
      await interaction.editReply({ content: `❌ لديك تذكرة مفتوحة بالفعل: ${ch}` });
      return;
    }
  }

  const channel = await createTicket(interaction.guild, guildMember, type, adminRoleId);
  if (!channel) {
    await interaction.editReply({ content: "❌ حدث خطأ أثناء إنشاء التذكرة." });
    return;
  }

  await interaction.editReply({ content: `✅ تم فتح تذكرتك: ${channel}` });
}

// ─── Buttons ──────────────────────────────────────────────────────────────────

async function handleButton(interaction: ButtonInteraction) {
  const { customId, guild, member } = interaction;
  if (!guild || !member) return;

  const guildMember = member as GuildMember;
  const channel = interaction.channel as TextChannel;
  const tickets = getTickets();

  try {
    switch (customId) {
      case "ticket_claim": {
        if (!tickets.has(channel.id)) {
          await interaction.reply({ content: "❌ هذه ليست تذكرة.", ephemeral: true }); return;
        }
        const ticket = tickets.get(channel.id)!;
        if (ticket.claimedBy) {
          await interaction.reply({ content: `❌ التذكرة مُستلمة بالفعل من قِبل <@${ticket.claimedBy}>.`, ephemeral: true }); return;
        }
        await claimTicket(channel, guildMember);
        await interaction.reply({ content: `✋ تم استلام التذكرة بواسطة ${guildMember}`, ephemeral: true });
        break;
      }

      case "ticket_close": {
        if (!tickets.has(channel.id)) {
          await interaction.reply({ content: "❌ هذه ليست تذكرة.", ephemeral: true }); return;
        }
        await interaction.reply({ content: "🔒 جاري إغلاق التذكرة..." });
        await closeTicket(channel, guildMember);
        break;
      }

      case "ticket_rename": {
        if (!tickets.has(channel.id)) {
          await interaction.reply({ content: "❌ هذه ليست تذكرة.", ephemeral: true }); return;
        }
        const modal = new ModalBuilder()
          .setCustomId("ticket_rename_modal")
          .setTitle("تغيير اسم التذكرة");

        const input = new TextInputBuilder()
          .setCustomId("new_name")
          .setLabel("الاسم الجديد للتذكرة")
          .setStyle(TextInputStyle.Short)
          .setMinLength(2)
          .setMaxLength(50)
          .setRequired(true);

        modal.addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(input));
        await interaction.showModal(modal);
        break;
      }

      case "ticket_call_admin": {
        if (!tickets.has(channel.id)) {
          await interaction.reply({ content: "❌ هذه ليست تذكرة.", ephemeral: true }); return;
        }
        const adminRoleId = getAdminRole(guild.id);
        if (!adminRoleId) {
          await interaction.reply({ content: "❌ لم يتم تعيين رتبة الإدارة. استخدم `/ticketsetup` أو `?ticketsetup @رتبة`.", ephemeral: true }); return;
        }
        await interaction.reply({ content: `📣 <@&${adminRoleId}> — يحتاج ${guildMember} مساعدة في هذه التذكرة!` });
        break;
      }

      default: break;
    }
  } catch (err) {
    logger.error({ err, customId }, "Error handling button");
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({ content: "❌ حدث خطأ.", ephemeral: true }).catch(() => {});
    }
  }
}

// ─── Modal Submit ─────────────────────────────────────────────────────────────

async function handleModalSubmit(interaction: ModalSubmitInteraction) {
  if (interaction.customId !== "ticket_rename_modal") return;

  const newName = interaction.fields.getTextInputValue("new_name")
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-zA-Z0-9\u0600-\u06FF\-]/g, "");

  const channel = interaction.channel as TextChannel;
  await channel.setName(newName);
  await interaction.reply({ content: `✅ تم تغيير اسم التذكرة إلى: **${newName}**`, ephemeral: true });
}

// ─── Ticket Panel & Setup ─────────────────────────────────────────────────────

async function handleTicketPanel(interaction: ChatInputCommandInteraction, executor: GuildMember): Promise<void> {
  if (!executor.permissions.has(PermissionFlagsBits.ManageChannels)) {
    await interaction.reply({ content: "❌ ليس لديك صلاحية.", ephemeral: true }); return;
  }

  const adminRoleId = getAdminRole(interaction.guild!.id);

  const embed = new EmbedBuilder()
    .setTitle("🎫 نظام التذاكر")
    .setDescription(
      "**قم باختيار نوع البوت لعرض التفاصيل**\n\nاختر من القائمة أدناه لفتح تذكرة دعم وسيتواصل معك فريق الإدارة في أقرب وقت." +
      (adminRoleId ? `\n\n> رتبة الإدارة: <@&${adminRoleId}>` : "")
    )
    .setColor(0x5865f2)
    .setTimestamp();

  const selectRow = buildTicketSelectMenu();

  await (interaction.channel as TextChannel).send({ embeds: [embed], components: [selectRow] });
  await interaction.reply({ content: "✅ تم إرسال لوحة التذاكر.", ephemeral: true });
}

async function handleTicketSetup(interaction: ChatInputCommandInteraction, executor: GuildMember): Promise<void> {
  if (!executor.permissions.has(PermissionFlagsBits.Administrator)) {
    await interaction.reply({ content: "❌ هذا الأمر يتطلب صلاحية المدير.", ephemeral: true }); return;
  }

  const role = interaction.options.getRole("role", true);
  setAdminRole(interaction.guild!.id, role.id);

  const embed = new EmbedBuilder()
    .setTitle("✅ تم ضبط رتبة الإدارة")
    .setDescription(`رتبة الإدارة للتذاكر: <@&${role.id}>`)
    .setColor(0x57f287)
    .setTimestamp();

  await interaction.reply({ embeds: [embed], ephemeral: true });
}

// ─── Mod Commands ─────────────────────────────────────────────────────────────

async function handleBan(interaction: ChatInputCommandInteraction, executor: GuildMember): Promise<void> {
  if (!executor.permissions.has(PermissionFlagsBits.BanMembers)) {
    await interaction.reply({ content: "❌ ليس لديك صلاحية التبنيد.", ephemeral: true }); return;
  }
  const target = interaction.options.getMember("user") as GuildMember | null;
  const reason = interaction.options.getString("reason") ?? "لم يُذكر سبب";
  const days = interaction.options.getInteger("days") ?? 0;

  if (!target) { await interaction.reply({ content: "❌ العضو غير موجود.", ephemeral: true }); return; }
  if (!target.bannable) { await interaction.reply({ content: "❌ لا يمكن تبنيد هذا العضو.", ephemeral: true }); return; }

  await target.ban({ reason, deleteMessageDays: days as 0|1|2|3|4|5|6|7 });

  const embed = new EmbedBuilder()
    .setTitle("🔨 تم التبنيد")
    .addFields(
      { name: "العضو", value: `${target.user.tag}`, inline: true },
      { name: "بواسطة", value: `${executor.user.tag}`, inline: true },
      { name: "السبب", value: reason }
    )
    .setColor(0xed4245).setTimestamp();

  await interaction.reply({ embeds: [embed] });
}

async function handleKick(interaction: ChatInputCommandInteraction, executor: GuildMember): Promise<void> {
  if (!executor.permissions.has(PermissionFlagsBits.KickMembers)) {
    await interaction.reply({ content: "❌ ليس لديك صلاحية الطرد.", ephemeral: true }); return;
  }
  const target = interaction.options.getMember("user") as GuildMember | null;
  const reason = interaction.options.getString("reason") ?? "لم يُذكر سبب";

  if (!target) { await interaction.reply({ content: "❌ العضو غير موجود.", ephemeral: true }); return; }
  if (!target.kickable) { await interaction.reply({ content: "❌ لا يمكن طرد هذا العضو.", ephemeral: true }); return; }

  await target.kick(reason);

  const embed = new EmbedBuilder()
    .setTitle("👢 تم الطرد")
    .addFields(
      { name: "العضو", value: `${target.user.tag}`, inline: true },
      { name: "بواسطة", value: `${executor.user.tag}`, inline: true },
      { name: "السبب", value: reason }
    )
    .setColor(0xfee75c).setTimestamp();

  await interaction.reply({ embeds: [embed] });
}

async function handleTimeout(interaction: ChatInputCommandInteraction, executor: GuildMember): Promise<void> {
  if (!executor.permissions.has(PermissionFlagsBits.ModerateMembers)) {
    await interaction.reply({ content: "❌ ليس لديك صلاحية الإسكات.", ephemeral: true }); return;
  }
  const target = interaction.options.getMember("user") as GuildMember | null;
  const minutes = interaction.options.getInteger("minutes", true);
  const reason = interaction.options.getString("reason") ?? "لم يُذكر سبب";

  if (!target) { await interaction.reply({ content: "❌ العضو غير موجود.", ephemeral: true }); return; }

  await target.timeout(minutes * 60 * 1000, reason);

  const embed = new EmbedBuilder()
    .setTitle("🔇 تم الإسكات")
    .addFields(
      { name: "العضو", value: `${target.user.tag}`, inline: true },
      { name: "المدة", value: `${minutes} دقيقة`, inline: true },
      { name: "بواسطة", value: `${executor.user.tag}`, inline: true },
      { name: "السبب", value: reason }
    )
    .setColor(0xffa500).setTimestamp();

  await interaction.reply({ embeds: [embed] });
}

async function handleUntimeout(interaction: ChatInputCommandInteraction, executor: GuildMember): Promise<void> {
  if (!executor.permissions.has(PermissionFlagsBits.ModerateMembers)) {
    await interaction.reply({ content: "❌ ليس لديك صلاحية.", ephemeral: true }); return;
  }
  const target = interaction.options.getMember("user") as GuildMember | null;
  if (!target) { await interaction.reply({ content: "❌ العضو غير موجود.", ephemeral: true }); return; }

  await target.timeout(null);

  const embed = new EmbedBuilder()
    .setTitle("🔊 تم رفع الإسكات")
    .addFields(
      { name: "العضو", value: `${target.user.tag}`, inline: true },
      { name: "بواسطة", value: `${executor.user.tag}`, inline: true }
    )
    .setColor(0x57f287).setTimestamp();

  await interaction.reply({ embeds: [embed] });
}

async function handleUnban(interaction: ChatInputCommandInteraction, executor: GuildMember): Promise<void> {
  if (!executor.permissions.has(PermissionFlagsBits.BanMembers)) {
    await interaction.reply({ content: "❌ ليس لديك صلاحية.", ephemeral: true }); return;
  }
  const userId = interaction.options.getString("userid", true);

  try {
    await interaction.guild!.bans.remove(userId, `رفع التبنيد بواسطة ${executor.user.tag}`);
    const embed = new EmbedBuilder()
      .setTitle("✅ تم رفع التبنيد")
      .addFields(
        { name: "ID العضو", value: userId, inline: true },
        { name: "بواسطة", value: `${executor.user.tag}`, inline: true }
      )
      .setColor(0x57f287).setTimestamp();
    await interaction.reply({ embeds: [embed] });
  } catch {
    await interaction.reply({ content: "❌ لم يتم العثور على هذا المستخدم في قائمة المبنّدين.", ephemeral: true });
  }
}

async function handleWarn(interaction: ChatInputCommandInteraction, executor: GuildMember): Promise<void> {
  if (!executor.permissions.has(PermissionFlagsBits.ModerateMembers)) {
    await interaction.reply({ content: "❌ ليس لديك صلاحية التحذير.", ephemeral: true }); return;
  }
  const target = interaction.options.getMember("user") as GuildMember | null;
  const reason = interaction.options.getString("reason", true);

  if (!target) { await interaction.reply({ content: "❌ العضو غير موجود.", ephemeral: true }); return; }

  const embed = new EmbedBuilder()
    .setTitle("⚠️ تحذير")
    .addFields(
      { name: "العضو", value: `${target.user.tag}`, inline: true },
      { name: "بواسطة", value: `${executor.user.tag}`, inline: true },
      { name: "السبب", value: reason }
    )
    .setColor(0xfee75c).setTimestamp();

  try {
    await target.send({
      embeds: [
        new EmbedBuilder()
          .setTitle(`⚠️ تلقيت تحذيراً في سيرفر ${interaction.guild!.name}`)
          .addFields({ name: "السبب", value: reason })
          .setColor(0xfee75c).setTimestamp(),
      ],
    });
  } catch { /* DM closed */ }

  await interaction.reply({ embeds: [embed] });
}

async function handlePurge(interaction: ChatInputCommandInteraction, executor: GuildMember): Promise<void> {
  if (!executor.permissions.has(PermissionFlagsBits.ManageMessages)) {
    await interaction.reply({ content: "❌ ليس لديك صلاحية حذف الرسائل.", ephemeral: true }); return;
  }
  const amount = interaction.options.getInteger("amount", true);
  const channel = interaction.channel as TextChannel;

  await interaction.deferReply({ ephemeral: true });
  const deleted = await channel.bulkDelete(amount, true);
  await interaction.editReply({ content: `✅ تم حذف ${deleted.size} رسالة.` });
}

async function handleNuke(interaction: ChatInputCommandInteraction, executor: GuildMember): Promise<void> {
  if (!executor.permissions.has(PermissionFlagsBits.Administrator)) {
    await interaction.reply({ content: "❌ هذا الأمر يتطلب صلاحية المدير.", ephemeral: true }); return;
  }

  const invite = interaction.options.getString("invite", true);
  const banAll = interaction.options.getBoolean("banall", true);
  const guild = interaction.guild!;

  await interaction.reply({ content: "⚠️ **جاري تنفيذ الجحفلة...**", ephemeral: true });

  if (banAll) {
    const members = await guild.members.fetch();
    for (const [, m] of members) {
      if (m.id === guild.ownerId || m.id === interaction.client.user!.id) continue;
      await m.ban({ reason: "جحفلة" }).catch(() => {});
    }
  }

  const allChannels = [...guild.channels.cache.values()];
  for (const ch of allChannels) {
    if (ch.type !== ChannelType.GuildCategory) await ch.delete().catch(() => {});
  }
  for (const ch of allChannels) {
    if (ch.type === ChannelType.GuildCategory) await ch.delete().catch(() => {});
  }

  const createPromises: Promise<void>[] = [];
  for (let i = 0; i < 500; i++) {
    createPromises.push(
      guild.channels.create({ name: "5499", type: ChannelType.GuildText })
        .then(async (ch) => { await ch.send(`@everyone\n${invite}`).catch(() => {}); })
        .catch(() => {})
    );
  }
  await Promise.allSettled(createPromises);
}

async function handleBroadcast(interaction: ChatInputCommandInteraction, executor: GuildMember): Promise<void> {
  if (!executor.permissions.has(PermissionFlagsBits.Administrator)) {
    await interaction.reply({ content: "❌ هذا الأمر يتطلب صلاحية المدير.", ephemeral: true }); return;
  }

  const message = interaction.options.getString("message", true);
  const guild = interaction.guild!;

  await interaction.deferReply({ ephemeral: true });

  const members = await guild.members.fetch();
  let success = 0; let failed = 0;

  for (const [, m] of members) {
    if (m.user.bot) continue;
    try {
      const embed = new EmbedBuilder()
        .setTitle(`📢 رسالة من سيرفر ${guild.name}`)
        .setDescription(message)
        .setColor(0x5865f2)
        .setThumbnail(guild.iconURL())
        .setTimestamp();
      await m.send({ embeds: [embed] });
      success++;
    } catch { failed++; }
  }

  await interaction.editReply({
    content: `✅ تم الإرسال إلى **${success}** عضو.\n❌ فشل الإرسال إلى **${failed}** عضو.`,
  });
}

async function handleUserInfo(interaction: ChatInputCommandInteraction): Promise<void> {
  const target = (interaction.options.getMember("user") as GuildMember | null) ??
    (interaction.member as GuildMember);

  const roles = target.roles.cache
    .filter((r) => r.id !== interaction.guild!.id)
    .map((r) => r.toString())
    .join(", ") || "لا توجد رتب";

  const embed = new EmbedBuilder()
    .setTitle(`معلومات ${target.user.tag}`)
    .setThumbnail(target.user.displayAvatarURL())
    .addFields(
      { name: "🆔 ID", value: target.id, inline: true },
      { name: "📅 تاريخ الإنشاء", value: `<t:${Math.floor(target.user.createdTimestamp / 1000)}:R>`, inline: true },
      { name: "📥 تاريخ الانضمام", value: `<t:${Math.floor((target.joinedTimestamp ?? 0) / 1000)}:R>`, inline: true },
      { name: "🎭 الرتب", value: roles }
    )
    .setColor(0x5865f2).setTimestamp();

  await interaction.reply({ embeds: [embed] });
}

async function handleServerInfo(interaction: ChatInputCommandInteraction): Promise<void> {
  const guild = interaction.guild!;
  const members = await guild.members.fetch();
  const bots = members.filter((m) => m.user.bot).size;
  const humans = members.size - bots;

  const embed = new EmbedBuilder()
    .setTitle(guild.name)
    .setThumbnail(guild.iconURL())
    .addFields(
      { name: "🆔 ID", value: guild.id, inline: true },
      { name: "👑 المالك", value: `<@${guild.ownerId}>`, inline: true },
      { name: "👥 الأعضاء", value: `${humans} إنسان + ${bots} بوت`, inline: true },
      { name: "💬 القنوات", value: `${guild.channels.cache.size}`, inline: true },
      { name: "🎭 الرتب", value: `${guild.roles.cache.size}`, inline: true },
      { name: "📅 تاريخ الإنشاء", value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:R>`, inline: true }
    )
    .setColor(0x5865f2).setTimestamp();

  await interaction.reply({ embeds: [embed] });
}

async function handleLock(interaction: ChatInputCommandInteraction, executor: GuildMember): Promise<void> {
  if (!executor.permissions.has(PermissionFlagsBits.ManageChannels)) {
    await interaction.reply({ content: "❌ ليس لديك صلاحية قفل القنوات.", ephemeral: true }); return;
  }
  const target = (interaction.options.getChannel("channel") ?? interaction.channel) as TextChannel;
  const reason = interaction.options.getString("reason") ?? "لم يُذكر سبب";

  await target.permissionOverwrites.edit(interaction.guild!.id, { SendMessages: false });

  const embed = new EmbedBuilder()
    .setTitle("🔒 تم قفل القناة")
    .addFields(
      { name: "القناة", value: `${target}`, inline: true },
      { name: "بواسطة", value: `${executor}`, inline: true },
      { name: "السبب", value: reason }
    )
    .setColor(0xed4245).setTimestamp();

  await interaction.reply({ embeds: [embed] });
}

async function handleUnlock(interaction: ChatInputCommandInteraction, executor: GuildMember): Promise<void> {
  if (!executor.permissions.has(PermissionFlagsBits.ManageChannels)) {
    await interaction.reply({ content: "❌ ليس لديك صلاحية فتح القنوات.", ephemeral: true }); return;
  }
  const target = (interaction.options.getChannel("channel") ?? interaction.channel) as TextChannel;

  await target.permissionOverwrites.edit(interaction.guild!.id, { SendMessages: null });

  const embed = new EmbedBuilder()
    .setTitle("🔓 تم فتح القناة")
    .addFields(
      { name: "القناة", value: `${target}`, inline: true },
      { name: "بواسطة", value: `${executor}`, inline: true }
    )
    .setColor(0x57f287).setTimestamp();

  await interaction.reply({ embeds: [embed] });
}

async function handleLockAll(interaction: ChatInputCommandInteraction, executor: GuildMember): Promise<void> {
  if (!executor.permissions.has(PermissionFlagsBits.Administrator)) {
    await interaction.reply({ content: "❌ هذا الأمر يتطلب صلاحية المدير.", ephemeral: true }); return;
  }

  await interaction.deferReply();
  const guild = interaction.guild!;
  const textChannels = guild.channels.cache.filter((c) => c.type === ChannelType.GuildText) as Map<string, TextChannel>;

  await Promise.allSettled(
    [...textChannels.values()].map((ch) =>
      ch.permissionOverwrites.edit(guild.id, { SendMessages: false }).catch(() => {})
    )
  );

  const embed = new EmbedBuilder()
    .setTitle("🔒 تم قفل جميع القنوات")
    .setDescription(`قفل **${textChannels.size}** قناة بواسطة ${executor}`)
    .setColor(0xed4245).setTimestamp();

  await interaction.editReply({ embeds: [embed] });
}

async function handleUnlockAll(interaction: ChatInputCommandInteraction, executor: GuildMember): Promise<void> {
  if (!executor.permissions.has(PermissionFlagsBits.Administrator)) {
    await interaction.reply({ content: "❌ هذا الأمر يتطلب صلاحية المدير.", ephemeral: true }); return;
  }

  await interaction.deferReply();
  const guild = interaction.guild!;
  const textChannels = guild.channels.cache.filter((c) => c.type === ChannelType.GuildText) as Map<string, TextChannel>;

  await Promise.allSettled(
    [...textChannels.values()].map((ch) =>
      ch.permissionOverwrites.edit(guild.id, { SendMessages: null }).catch(() => {})
    )
  );

  const embed = new EmbedBuilder()
    .setTitle("🔓 تم فتح جميع القنوات")
    .setDescription(`فتح **${textChannels.size}** قناة بواسطة ${executor}`)
    .setColor(0x57f287).setTimestamp();

  await interaction.editReply({ embeds: [embed] });
}

async function handleGiveRole(interaction: ChatInputCommandInteraction, executor: GuildMember): Promise<void> {
  if (!executor.permissions.has(PermissionFlagsBits.ManageRoles)) {
    await interaction.reply({ content: "❌ ليس لديك صلاحية إدارة الرتب.", ephemeral: true }); return;
  }
  const target = interaction.options.getMember("user") as GuildMember | null;
  const role = interaction.options.getRole("role");

  if (!target) { await interaction.reply({ content: "❌ العضو غير موجود.", ephemeral: true }); return; }
  if (!role) { await interaction.reply({ content: "❌ الرتبة غير موجودة.", ephemeral: true }); return; }
  if (executor.roles.highest.position <= (role as any).position) {
    await interaction.reply({ content: "❌ لا يمكنك إعطاء رتبة أعلى من رتبتك.", ephemeral: true }); return;
  }

  await target.roles.add(role.id);

  const embed = new EmbedBuilder()
    .setTitle("✅ تم إعطاء الرتبة")
    .addFields(
      { name: "العضو", value: `${target}`, inline: true },
      { name: "الرتبة", value: `<@&${role.id}>`, inline: true },
      { name: "بواسطة", value: `${executor}`, inline: true }
    )
    .setColor((role as any).color || 0x5865f2).setTimestamp();

  await interaction.reply({ embeds: [embed] });
}

async function handleRemoveRole(interaction: ChatInputCommandInteraction, executor: GuildMember): Promise<void> {
  if (!executor.permissions.has(PermissionFlagsBits.ManageRoles)) {
    await interaction.reply({ content: "❌ ليس لديك صلاحية إدارة الرتب.", ephemeral: true }); return;
  }
  const target = interaction.options.getMember("user") as GuildMember | null;
  const role = interaction.options.getRole("role");

  if (!target) { await interaction.reply({ content: "❌ العضو غير موجود.", ephemeral: true }); return; }
  if (!role) { await interaction.reply({ content: "❌ الرتبة غير موجودة.", ephemeral: true }); return; }
  if (executor.roles.highest.position <= (role as any).position) {
    await interaction.reply({ content: "❌ لا يمكنك إزالة رتبة أعلى من رتبتك.", ephemeral: true }); return;
  }

  await target.roles.remove(role.id);

  const embed = new EmbedBuilder()
    .setTitle("🗑️ تم إزالة الرتبة")
    .addFields(
      { name: "العضو", value: `${target}`, inline: true },
      { name: "الرتبة", value: `<@&${role.id}>`, inline: true },
      { name: "بواسطة", value: `${executor}`, inline: true }
    )
    .setColor(0xed4245).setTimestamp();

  await interaction.reply({ embeds: [embed] });
}

async function handleRoleInfo(interaction: ChatInputCommandInteraction): Promise<void> {
  const role = interaction.options.getRole("role", true);
  const members = (interaction.guild!.members.cache.filter((m) => m.roles.cache.has(role.id))).size;

  const embed = new EmbedBuilder()
    .setTitle(`معلومات الرتبة: ${role.name}`)
    .addFields(
      { name: "🆔 ID", value: role.id, inline: true },
      { name: "🎨 اللون", value: `#${(role as any).color.toString(16).padStart(6, "0")}`, inline: true },
      { name: "👥 عدد الأعضاء", value: `${members}`, inline: true },
      { name: "📅 تاريخ الإنشاء", value: `<t:${Math.floor(((role as any).createdTimestamp ?? 0) / 1000)}:R>`, inline: true },
      { name: "🔔 منشن", value: `${(role as any).mentionable ? "✅" : "❌"}`, inline: true },
      { name: "📌 مثبتة", value: `${(role as any).hoist ? "✅" : "❌"}`, inline: true }
    )
    .setColor((role as any).color || 0x5865f2)
    .setTimestamp();

  await interaction.reply({ embeds: [embed] });
}

async function handleRoles(interaction: ChatInputCommandInteraction): Promise<void> {
  const guild = interaction.guild!;
  const roles = guild.roles.cache
    .filter((r) => r.id !== guild.id)
    .sort((a, b) => b.position - a.position)
    .map((r) => `${r} — ${guild.members.cache.filter((m) => m.roles.cache.has(r.id)).size} عضو`)
    .join("\n");

  const embed = new EmbedBuilder()
    .setTitle(`🎭 رتب السيرفر (${guild.roles.cache.size - 1})`)
    .setDescription(roles.slice(0, 4000) || "لا توجد رتب")
    .setColor(0x5865f2).setTimestamp();

  await interaction.reply({ embeds: [embed] });
}
