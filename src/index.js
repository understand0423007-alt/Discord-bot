import "dotenv/config";
import { Client, GatewayIntentBits, Events } from "discord.js";
import { startCalendarWatcher } from "./google-calendar.js"; // ← 追加

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

client.once(Events.ClientReady, (c) => {
    console.log(`ログインしました: ${c.user.tag}`);

    // --- ここでカレンダー監視をスタート ---
    startCalendarWatcher(client);
    console.log("Google カレンダー監視を開始しました。");
});

client.login(process.env.DISCORD_TOKEN);