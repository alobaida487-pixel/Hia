import {
  Message,
  PermissionFlagsBits,
  EmbedBuilder,
  GuildMember,
  TextChannel,
} from "discord.js";
import { logger } from "../../lib/logger";

const PREFIX = "?";

export async function handleMessage(message: Message) {
  if (message.author.bot) return;
  if (!message.guild) return;
  if (!message.content.startsWith(PREFIX)) return;

  const args = message.content.slice(PREFIX.length).trim().split(/\s+/);
  const command = args.shift()?.toLowerCase();
  const member = message.member as GuildMember;

  try {
    switch (command) {
      case "ban": await prefixBan(message, args, member); break;
      case "kick": await prefixKick(message, args, member); break;
      case "timeout":
      case "mute": await prefixTimeout(message, args, member); break;
      case "untimeout":
      case "unmute": await prefixUntimeout(message, args, member); break;
      case "unban": await prefixUnban(message, args, member); break;
      case "warn": await prefixWarn(message, args, member); break;
      case "purge":
      case "clear": await prefixPurge(message, args, member); break;
      case "help": await prefixHelp(message); break;
      case "lock": await prefixLock(message, args, member); break;
      case "unlock": await prefixUnlock(message, args, member); break;
      case "lockall": await prefixLockAll(message, member); break;
      case "unlockall": await prefixUnlockAll(message, member); break;
    }
  } catch (err) {
    logger.error({ err, command }, "Error in prefix command");
    await (message.channel as TextChannel).send("❌ حدث خطأ أثناء تنفيذ الأمر.").catch(() => {});
  }
}

function getTextChannel(message: Message): TextChannel {
  return message.channel as TextChannel;
}

async function prefixBan(message: Message, args: string[], executor: GuildMember): Promise<void> {
  if (!executor.permissions.has(PermissionFlagsBits.BanMembers)) {
    await getTextChannel(message).send("❌ ليس لديك صلاحية التبنيد."); return;
  }

  const userId = args[0]?.replace(/[<@!>]/g, "");
  const reason = args.slice(1).join(" ") || "لم يُذكر سبب";

  if (!userId) { await getTextChannel(message).send("❌ يجب تحديد العضو. مثال: `?ban @عضو السبب`"); return; }

  const target = message.guild!.members.cache.get(userId) ??
    await message.guild!.members.fetch(userId).catch(() => null);

  if (!target) { await getTextChannel(message).send("❌ العضو غير موجود."); return; }
  if (!target.bannable) { await getTextChannel(message).send("❌ لا يمكن تبنيد هذا العضو."); return; }

  await target.ban({ reason });

  const embed = new EmbedBuilder()
    .setTitle("🔨 تم التبنيد")
    .addFields(
      { name: "العضو", value: `${target.user.tag}`, inline: true },
      { name: "بواسطة", value: `${executor.user.tag}`, inline: true },
      { name: "السبب", value: reason }
    )
    .setColor(0xed4245).setTimestamp();

  await getTextChannel(message).send({ embeds: [embed] });
  await message.delete().catch(() => {});
}

async function prefixKick(message: Message, args: string[], executor: GuildMember): Promise<void> {
  if (!executor.permissions.has(PermissionFlagsBits.KickMembers)) {
    await getTextChannel(message).send("❌ ليس لديك صلاحية الطرد."); return;
  }

  const userId = args[0]?.replace(/[<@!>]/g, "");
  const reason = args.slice(1).join(" ") || "لم يُذكر سبب";

  if (!userId) { await getTextChannel(message).send("❌ يجب تحديد العضو. مثال: `?kick @عضو السبب`"); return; }

  const target = message.guild!.members.cache.get(userId) ??
    await message.guild!.members.fetch(userId).catch(() => null);

  if (!target) { await getTextChannel(message).send("❌ العضو غير موجود."); return; }
  if (!target.kickable) { await getTextChannel(message).send("❌ لا يمكن طرد هذا العضو."); return; }

  await target.kick(reason);

  const embed = new EmbedBuilder()
    .setTitle("👢 تم الطرد")
    .addFields(
      { name: "العضو", value: `${target.user.tag}`, inline: true },
      { name: "بواسطة", value: `${executor.user.tag}`, inline: true },
      { name: "السبب", value: reason }
    )
    .setColor(0xfee75c).setTimestamp();

  await getTextChannel(message).send({ embeds: [embed] });
  await message.delete().catch(() => {});
}

async function prefixTimeout(message: Message, args: string[], executor: GuildMember): Promise<void> {
  if (!executor.permissions.has(PermissionFlagsBits.ModerateMembers)) {
    await getTextChannel(message).send("❌ ليس لديك صلاحية الإسكات."); return;
  }

  const userId = args[0]?.replace(/[<@!>]/g, "");
  const minutes = parseInt(args[1] ?? "5", 10);
  const reason = args.slice(2).join(" ") || "لم يُذكر سبب";

  if (!userId) { await getTextChannel(message).send("❌ مثال: `?timeout @عضو 10 السبب`"); return; }
  if (isNaN(minutes) || minutes < 1) { await getTextChannel(message).send("❌ الوقت يجب أن يكون رقماً أكبر من 0."); return; }

  const target = message.guild!.members.cache.get(userId) ??
    await message.guild!.members.fetch(userId).catch(() => null);

  if (!target) { await getTextChannel(message).send("❌ العضو غير موجود."); return; }

  await target.timeout(minutes * 60 * 1000, reason);

  const embed = new EmbedBuilder()
    .setTitle("🔇 تم الإسكات")
    .addFields(
      { name: "العضو", value: `${target.user.tag}`, inline: true },
      { name: "المدة", value: `${minutes} دقيقة`, inline: true },
      { name: "السبب", value: reason }
    )
    .setColor(0xffa500).setTimestamp();

  await getTextChannel(message).send({ embeds: [embed] });
  await message.delete().catch(() => {});
}

async function prefixUntimeout(message: Message, args: string[], executor: GuildMember): Promise<void> {
  if (!executor.permissions.has(PermissionFlagsBits.ModerateMembers)) {
    await getTextChannel(message).send("❌ ليس لديك صلاحية."); return;
  }

  const userId = args[0]?.replace(/[<@!>]/g, "");
  if (!userId) { await getTextChannel(message).send("❌ مثال: `?untimeout @عضو`"); return; }

  const target = message.guild!.members.cache.get(userId) ??
    await message.guild!.members.fetch(userId).catch(() => null);

  if (!target) { await getTextChannel(message).send("❌ العضو غير موجود."); return; }

  await target.timeout(null);

  const embed = new EmbedBuilder()
    .setTitle("🔊 تم رفع الإسكات")
    .addFields({ name: "العضو", value: `${target.user.tag}`, inline: true })
    .setColor(0x57f287).setTimestamp();

  await getTextChannel(message).send({ embeds: [embed] });
  await message.delete().catch(() => {});
}

async function prefixUnban(message: Message, args: string[], executor: GuildMember): Promise<void> {
  if (!executor.permissions.has(PermissionFlagsBits.BanMembers)) {
    await getTextChannel(message).send("❌ ليس لديك صلاحية."); return;
  }

  const userId = args[0];
  if (!userId) { await getTextChannel(message).send("❌ مثال: `?unban 123456789`"); return; }

  try {
    await message.guild!.bans.remove(userId);
    await getTextChannel(message).send(`✅ تم رفع التبنيد عن ID: \`${userId}\``);
  } catch {
    await getTextChannel(message).send("❌ لم يتم العثور على هذا المستخدم في قائمة المبنّدين.");
  }

  await message.delete().catch(() => {});
}

async function prefixWarn(message: Message, args: string[], executor: GuildMember): Promise<void> {
  if (!executor.permissions.has(PermissionFlagsBits.ModerateMembers)) {
    await getTextChannel(message).send("❌ ليس لديك صلاحية التحذير."); return;
  }

  const userId = args[0]?.replace(/[<@!>]/g, "");
  const reason = args.slice(1).join(" ");

  if (!userId || !reason) { await getTextChannel(message).send("❌ مثال: `?warn @عضو السبب`"); return; }

  const target = message.guild!.members.cache.get(userId) ??
    await message.guild!.members.fetch(userId).catch(() => null);

  if (!target) { await getTextChannel(message).send("❌ العضو غير موجود."); return; }

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
          .setTitle(`⚠️ تلقيت تحذيراً في سيرفر ${message.guild!.name}`)
          .addFields({ name: "السبب", value: reason })
          .setColor(0xfee75c),
      ],
    });
  } catch { /* DM closed */ }

  await getTextChannel(message).send({ embeds: [embed] });
  await message.delete().catch(() => {});
}

async function prefixPurge(message: Message, args: string[], executor: GuildMember): Promise<void> {
  if (!executor.permissions.has(PermissionFlagsBits.ManageMessages)) {
    await getTextChannel(message).send("❌ ليس لديك صلاحية حذف الرسائل."); return;
  }

  const amount = parseInt(args[0] ?? "0", 10);
  if (isNaN(amount) || amount < 1 || amount > 100) {
    await getTextChannel(message).send("❌ يجب تحديد عدد من 1 إلى 100. مثال: `?purge 10`"); return;
  }

  await message.delete().catch(() => {});
  const channel = message.channel as TextChannel;
  const deleted = await channel.bulkDelete(amount, true);
  const reply = await channel.send(`✅ تم حذف ${deleted.size} رسالة.`);
  setTimeout(() => reply.delete().catch(() => {}), 3000);
}

async function prefixLock(message: Message, args: string[], executor: GuildMember): Promise<void> {
  if (!executor.permissions.has(PermissionFlagsBits.ManageChannels)) {
    await getTextChannel(message).send("❌ ليس لديك صلاحية قفل القنوات."); return;
  }
  const channel = message.channel as TextChannel;
  const reason = args.join(" ") || "لم يُذكر سبب";

  await channel.permissionOverwrites.edit(message.guild!.id, { SendMessages: false });

  const embed = new EmbedBuilder()
    .setTitle("🔒 تم قفل القناة")
    .addFields(
      { name: "القناة", value: `${channel}`, inline: true },
      { name: "بواسطة", value: `${executor}`, inline: true },
      { name: "السبب", value: reason }
    )
    .setColor(0xed4245).setTimestamp();

  await channel.send({ embeds: [embed] });
  await message.delete().catch(() => {});
}

async function prefixUnlock(message: Message, args: string[], executor: GuildMember): Promise<void> {
  if (!executor.permissions.has(PermissionFlagsBits.ManageChannels)) {
    await getTextChannel(message).send("❌ ليس لديك صلاحية فتح القنوات."); return;
  }
  const channel = message.channel as TextChannel;

  await channel.permissionOverwrites.edit(message.guild!.id, { SendMessages: null });

  const embed = new EmbedBuilder()
    .setTitle("🔓 تم فتح القناة")
    .addFields(
      { name: "القناة", value: `${channel}`, inline: true },
      { name: "بواسطة", value: `${executor}`, inline: true }
    )
    .setColor(0x57f287).setTimestamp();

  await channel.send({ embeds: [embed] });
  await message.delete().catch(() => {});
}

async function prefixLockAll(message: Message, executor: GuildMember): Promise<void> {
  if (!executor.permissions.has(PermissionFlagsBits.Administrator)) {
    await getTextChannel(message).send("❌ هذا الأمر يتطلب صلاحية المدير."); return;
  }
  const guild = message.guild!;
  const textChannels = guild.channels.cache.filter(
    (c) => c.type === 0
  ) as Map<string, TextChannel>;

  await Promise.allSettled(
    [...textChannels.values()].map((ch) =>
      ch.permissionOverwrites.edit(guild.id, { SendMessages: false }).catch(() => {})
    )
  );

  const embed = new EmbedBuilder()
    .setTitle("🔒 تم قفل جميع القنوات")
    .setDescription(`قفل **${textChannels.size}** قناة بواسطة ${executor}`)
    .setColor(0xed4245).setTimestamp();

  await getTextChannel(message).send({ embeds: [embed] });
  await message.delete().catch(() => {});
}

async function prefixUnlockAll(message: Message, executor: GuildMember): Promise<void> {
  if (!executor.permissions.has(PermissionFlagsBits.Administrator)) {
    await getTextChannel(message).send("❌ هذا الأمر يتطلب صلاحية المدير."); return;
  }
  const guild = message.guild!;
  const textChannels = guild.channels.cache.filter(
    (c) => c.type === 0
  ) as Map<string, TextChannel>;

  await Promise.allSettled(
    [...textChannels.values()].map((ch) =>
      ch.permissionOverwrites.edit(guild.id, { SendMessages: null }).catch(() => {})
    )
  );

  const embed = new EmbedBuilder()
    .setTitle("🔓 تم فتح جميع القنوات")
    .setDescription(`فتح **${textChannels.size}** قناة بواسطة ${executor}`)
    .setColor(0x57f287).setTimestamp();

  await getTextChannel(message).send({ embeds: [embed] });
  await message.delete().catch(() => {});
}

async function prefixHelp(message: Message): Promise<void> {
  const embed = new EmbedBuilder()
    .setTitle("📖 قائمة الأوامر — البريفكس: `?`")
    .addFields(
      {
        name: "⚖️ الأوامر الإدارية (بريفكس)",
        value: [
          "`?ban @عضو [سبب]` — تبنيد عضو",
          "`?kick @عضو [سبب]` — طرد عضو",
          "`?timeout @عضو [دقائق] [سبب]` — إسكات مؤقت",
          "`?untimeout @عضو` — رفع الإسكات",
          "`?unban [ID]` — رفع التبنيد",
          "`?warn @عضو [سبب]` — تحذير عضو",
          "`?purge [عدد]` — حذف رسائل (1-100)",
        ].join("\n"),
      },
      {
        name: "⚡ Slash Commands",
        value: [
          "`/ban` `/kick` `/timeout` `/untimeout` `/unban` `/warn` `/purge`",
          "`/nuke` — جحفلة السيرفر (مدير فقط)",
          "`/broadcast` — رسالة لجميع الأعضاء",
          "`/ticket [موضوع]` — فتح تذكرة دعم",
          "`/closeticket` — إغلاق التذكرة",
          "`/ticketpanel` — إرسال لوحة التذاكر",
          "`/userinfo` `/serverinfo` — معلومات",
        ].join("\n"),
      }
    )
    .setColor(0x5865f2).setTimestamp();

  await getTextChannel(message).send({ embeds: [embed] });
}
