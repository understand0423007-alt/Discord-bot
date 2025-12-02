import 'dotenv/config';
import {
  Client,
  GatewayIntentBits,
  Partials,
  REST,
  Routes,
  SlashCommandBuilder,
} from 'discord.js';
import { Firestore } from '@google-cloud/firestore';

// Firestore 初期化
const firestore = new Firestore({
  projectId: process.env.GCP_PROJECT_ID,
});

// Discord クライアント初期化
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
  partials: [Partials.Channel],
});

// Slash コマンド定義
const commands = [
  new SlashCommandBuilder()
    .setName('remind')
    .setDescription('リマインドBotのメニュー')
    .addSubcommand(sub =>
      sub
        .setName('add')
        .setDescription('新しいリマインドを追加します'),
    )
    .addSubcommand(sub =>
      sub
        .setName('list')
        .setDescription('自分のリマインド一覧を表示します'),
    )
    .toJSON(),
];

// コマンド登録（開発用にギルドコマンドでもOK）
async function registerCommands() {
  const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
  await rest.put(
    Routes.applicationCommands(process.env.DISCORD_CLIENT_ID),
    { body: commands },
  );
  console.log('Slash commands registered');
}

// ユーティリティ: 入力パース
// 例: "2025/12/25 18:00 クリスマスパーティ 60"
function parseReminderInput(text) {
  const match =
    text.match(/^(\d{4}\/\d{1,2}\/\d{1,2})\s+(\d{1,2}:\d{2})\s+(.+)\s+(\d+)$/);
  if (!match) return null;

  const [, dateStr, timeStr, title, minutesStr] = match;
  const [year, month, day] = dateStr.split('/').map(Number);
  const [hour, minute] = timeStr.split(':').map(Number);
  const remindBeforeMinutes = Number(minutesStr);

  const executeAt = new Date(Date.UTC(year, month - 1, day, hour - 9, minute)); // JST->UTC雑変換
  const remindAt = new Date(executeAt.getTime() - remindBeforeMinutes * 60 * 1000);

  return {
    title,
    executeAt,
    remindAt,
    remindBeforeMinutes,
  };
}

// Firestore に保存
async function createReminder({ userId, channelId, data }) {
  const now = new Date();
  const docRef = firestore.collection('reminders').doc();
  const doc = {
    userId,
    channelId,
    type: 'event', // POC ではすべて event 扱いでOK
    title: data.title,
    executeAt: data.executeAt.toISOString(),
    remindBeforeMinutes: data.remindBeforeMinutes,
    remindAt: data.remindAt.toISOString(),
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    isReminded: false,
  };
  await docRef.set(doc);
  return docRef.id;
}

// 自分のリマインド一覧取得
async function getUserReminders(userId) {
  const snapshot = await firestore
    .collection('reminders')
    .where('userId', '==', userId)
    .where('isReminded', '==', false)
    .orderBy('remindAt', 'asc')
    .limit(10)
    .get();

  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

// 定期チェック用: リマインド時刻を過ぎたものを取得
async function getDueReminders() {
  const now = new Date().toISOString();
  const snapshot = await firestore
    .collection('reminders')
    .where('isReminded', '==', false)
    .where('remindAt', '<=', now)
    .get();

  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

async function markReminded(id) {
  await firestore.collection('reminders').doc(id).update({
    isReminded: true,
    updatedAt: new Date().toISOString(),
  });
}

// メイン処理

client.once('ready', () => {
  console.log(`Logged in as ${client.user.tag}`);
});

// slash コマンドハンドラ
client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;
  if (interaction.commandName !== 'remind') return;

  const sub = interaction.options.getSubcommand();

  if (sub === 'add') {
    await interaction.reply(
      'ご用件を入力してください。\n`YYYY/MM/DD HH:MM タイトル 分前` の形式で入力してください。\n例: `2025/12/25 18:00 クリスマスパーティ 60`',
    );

    // 次にユーザーが発言するメッセージを1件だけ待つ簡易実装
    const filter = m => m.author.id === interaction.user.id;
    const channel = interaction.channel;

    try {
      const collected = await channel.awaitMessages({
        filter,
        max: 1,
        time: 60_000,
        errors: ['time'],
      });
      const message = collected.first();
      const parsed = parseReminderInput(message.content);
      if (!parsed) {
        await channel.send(
          '形式が正しくありません。`YYYY/MM/DD HH:MM タイトル 分前` のように入力してください。',
        );
        return;
      }

      const reminderId = await createReminder({
        userId: interaction.user.id,
        channelId: interaction.channelId,
        data: parsed,
      });

      await channel.send(
        `リマインドを登録しました！\nID: \`${reminderId}\`\nタイトル: ${parsed.title}\n実行時刻: ${parsed.executeAt.toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}\nリマインド: ${parsed.remindBeforeMinutes}分前`,
      );
    } catch (e) {
      console.error(e);
      await channel.send('タイムアウトしました。もう一度 `/remind add` を実行してください。');
    }
  }

  if (sub === 'list') {
    const reminders = await getUserReminders(interaction.user.id);
    if (reminders.length === 0) {
      await interaction.reply('現在有効なリマインドはありません。');
      return;
    }

    const lines = reminders.map(r => {
      const remindAt = new Date(r.remindAt).toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' });
      return `• **${r.title}** (リマインド: ${remindAt}) [ID: \`${r.id}\`]`;
    });

    await interaction.reply(`あなたのリマインド一覧:\n${lines.join('\n')}`);
  }
});

// 定期的にリマインドチェック
setInterval(async () => {
  try {
    const dueReminders = await getDueReminders();
    for (const r of dueReminders) {
      const channel = await client.channels.fetch(r.channelId).catch(() => null);
      if (!channel || !channel.isTextBased()) continue;

      await channel.send(
        `<@${r.userId}> リマインドです！\n**${r.title}** の時間が近づきました。`,
      );
      await markReminded(r.id);
    }
  } catch (e) {
    console.error('reminder check error', e);
  }
}, 30_000); // 30秒ごと

// 起動
(async () => {
  await registerCommands();
  await client.login(process.env.DISCORD_TOKEN);
})();