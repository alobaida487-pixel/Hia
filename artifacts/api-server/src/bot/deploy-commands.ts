import { REST, Routes, SlashCommandBuilder } from "discord.js";
import { logger } from "../lib/logger";

export const slashCommandsData = [
  new SlashCommandBuilder()
    .setName("ban")
    .setDescription("تبنيد عضو من السيرفر")
    .addUserOption((opt) =>
      opt.setName("user").setDescription("العضو المراد تبنيده").setRequired(true)
    )
    .addStringOption((opt) =>
      opt.setName("reason").setDescription("السبب").setRequired(false)
    )
    .addIntegerOption((opt) =>
      opt.setName("days").setDescription("حذف رسائل (0-7 أيام)").setMinValue(0).setMaxValue(7).setRequired(false)
    ),

  new SlashCommandBuilder()
    .setName("kick")
    .setDescription("طرد عضو من السيرفر")
    .addUserOption((opt) =>
      opt.setName("user").setDescription("العضو المراد طرده").setRequired(true)
    )
    .addStringOption((opt) =>
      opt.setName("reason").setDescription("السبب").setRequired(false)
    ),

  new SlashCommandBuilder()
    .setName("timeout")
    .setDescription("إسكات عضو مؤقتاً")
    .addUserOption((opt) =>
      opt.setName("user").setDescription("العضو المراد إسكاته").setRequired(true)
    )
    .addIntegerOption((opt) =>
      opt.setName("minutes").setDescription("عدد الدقائق").setMinValue(1).setMaxValue(40320).setRequired(true)
    )
    .addStringOption((opt) =>
      opt.setName("reason").setDescription("السبب").setRequired(false)
    ),

  new SlashCommandBuilder()
    .setName("untimeout")
    .setDescription("رفع الإسكات عن عضو")
    .addUserOption((opt) =>
      opt.setName("user").setDescription("العضو").setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("unban")
    .setDescription("رفع التبنيد عن عضو")
    .addStringOption((opt) =>
      opt.setName("userid").setDescription("ID العضو").setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("warn")
    .setDescription("تحذير عضو")
    .addUserOption((opt) =>
      opt.setName("user").setDescription("العضو").setRequired(true)
    )
    .addStringOption((opt) =>
      opt.setName("reason").setDescription("السبب").setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("purge")
    .setDescription("حذف رسائل من القناة الحالية")
    .addIntegerOption((opt) =>
      opt.setName("amount").setDescription("عدد الرسائل (1-100)").setMinValue(1).setMaxValue(100).setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("nuke")
    .setDescription("🔴 جحفلة: حذف جميع القنوات وإنشاء قنوات 5499 مع رابط سيرفر")
    .addStringOption((opt) =>
      opt.setName("invite").setDescription("رابط السيرفر الذي سيُرسل").setRequired(true)
    )
    .addBooleanOption((opt) =>
      opt.setName("banall").setDescription("تبنيد جميع الأعضاء؟").setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("broadcast")
    .setDescription("إرسال رسالة لجميع أعضاء السيرفر عبر DM")
    .addStringOption((opt) =>
      opt.setName("message").setDescription("الرسالة المراد إرسالها").setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("ticket")
    .setDescription("فتح تذكرة دعم جديدة")
    .addStringOption((opt) =>
      opt.setName("subject").setDescription("موضوع التذكرة").setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("closeticket")
    .setDescription("إغلاق التذكرة الحالية"),

  new SlashCommandBuilder()
    .setName("ticketpanel")
    .setDescription("إرسال لوحة التذاكر في القناة الحالية (للمشرفين)"),

  new SlashCommandBuilder()
    .setName("userinfo")
    .setDescription("عرض معلومات عضو")
    .addUserOption((opt) =>
      opt.setName("user").setDescription("العضو").setRequired(false)
    ),

  new SlashCommandBuilder()
    .setName("serverinfo")
    .setDescription("عرض معلومات السيرفر"),

  new SlashCommandBuilder()
    .setName("lock")
    .setDescription("قفل القناة — يمنع الأعضاء من الكتابة")
    .addChannelOption((opt) =>
      opt.setName("channel").setDescription("القناة (الحالية افتراضياً)").setRequired(false)
    )
    .addStringOption((opt) =>
      opt.setName("reason").setDescription("السبب").setRequired(false)
    ),

  new SlashCommandBuilder()
    .setName("unlock")
    .setDescription("فتح القناة — يسمح للأعضاء بالكتابة مجدداً")
    .addChannelOption((opt) =>
      opt.setName("channel").setDescription("القناة (الحالية افتراضياً)").setRequired(false)
    ),

  new SlashCommandBuilder()
    .setName("lockall")
    .setDescription("قفل جميع قنوات السيرفر دفعة واحدة"),

  new SlashCommandBuilder()
    .setName("unlockall")
    .setDescription("فتح جميع قنوات السيرفر دفعة واحدة"),
];

export async function registerSlashCommands(token: string, clientId: string) {
  const rest = new REST({ version: "10" }).setToken(token);

  try {
    logger.info("Registering slash commands globally...");
    await rest.put(Routes.applicationCommands(clientId), {
      body: slashCommandsData.map((cmd) => cmd.toJSON()),
    });
    logger.info("Slash commands registered successfully");
  } catch (err) {
    logger.error({ err }, "Failed to register slash commands");
  }
}
