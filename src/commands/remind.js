import {
    SlashCommandBuilder
  } from "discord.js";
  import { createReminder, getUserReminders } from "../services/firestore.js";
  import { parseReminderInput } from "../utils/parser.js";
  
  export const remindCommand = {
    data: new SlashCommandBuilder()
      .setName("remind")
      .setDescription("リマインドBotのメニュー")
      .addSubcommand(sub =>
        sub
          .setName("add")
          .setDescription("新しいリマインドを追加します")
      )
      .addSubcommand(sub =>
        sub
          .setName("list")
          .setDescription("自分のリマインド一覧を表示します")
      ),
  
    async execute(interaction) {
      const sub = interaction.options.getSubcommand();
  
      // ---------------------------
      // ① 追加処理 `/remind add`
      // ---------------------------
      if (sub === "add") {
        await interaction.reply(
          "ご用件を入力してください。\n`YYYY/MM/DD HH:MM タイトル 分前` の形式で入力してください。\n例: `2025/12/25 18:00 クリスマスパーティ 60`"
        );
  
        const filter = m => m.author.id === interaction.user.id;
        const channel = interaction.channel;
  
        try {
          const collected = await channel.awaitMessages({
            filter,
            max: 1,
            time: 60_000,
            errors: ["time"],
          });
  
          const message = collected.first();
          const parsed = parseReminderInput(message.content);
  
          if (!parsed) {
            await channel.send(
              "形式が正しくありません。\n例: `2025/12/25 18:00 タイトル 60` のように入力してください。"
            );
            return;
          }
  
          const reminderId = await createReminder({
            userId: interaction.user.id,
            channelId: interaction.channelId,
            data: parsed,
          });
  
          await channel.send(
            `リマインドを登録しました！\nID: \`${reminderId}\`\nタイトル: ${parsed.title}\n実行時刻: ${parsed.executeAt.toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" })}\nリマインド: ${parsed.remindBeforeMinutes}分前`
          );
  
        } catch (e) {
          console.error(e);
          await channel.send("タイムアウトしました。もう一度 `/remind add` を実行してください。");
        }
      }
  
      // ---------------------------
      // ② 一覧表示 `/remind list`
      // ---------------------------
      if (sub === "list") {
        const reminders = await getUserReminders(interaction.user.id);
  
        if (reminders.length === 0) {
          await interaction.reply("現在有効なリマインドはありません。");
          return;
        }
  
        const lines = reminders.map(r => {
          const remindAt = new Date(r.remindAt).toLocaleString("ja-JP", {
            timeZone: "Asia/Tokyo",
          });
          return `• **${r.title}** (リマインド: ${remindAt}) [ID: \`${r.id}\`]`;
        });
  
        await interaction.reply(`あなたのリマインド一覧:\n${lines.join("\n")}`);
      }
    }
  };
  