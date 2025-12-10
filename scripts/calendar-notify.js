// scripts/calendar-notify.js

import { google } from "googleapis";

// JST 計算用（GitHub Actions はUTCなので +9時間する）
const JST_OFFSET_MS = 9 * 60 * 60 * 1000;

/**
 * Google カレンダーのクライアントを作成
 */
async function getCalendarClient() {
    const serviceAccountJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;

    if (!serviceAccountJson) {
        throw new Error("環境変数 GOOGLE_SERVICE_ACCOUNT_JSON が設定されていません。");
    }

    const credentials = JSON.parse(serviceAccountJson);

    const auth = new google.auth.GoogleAuth({
        credentials,
        scopes: ["https://www.googleapis.com/auth/calendar.readonly"]
    });

    const authClient = await auth.getClient();
    return google.calendar({ version: "v3", auth: authClient });
}

/**
 * Discord Webhook にメッセージを送信
 */
async function notifyDiscord(content) {
    const webhookUrl = process.env.DISCORD_WEBHOOK_URL;

    if (!webhookUrl) {
        console.error("DISCORD_WEBHOOK_URL が設定されていません。");
        return;
    }

    const response = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content })
    });

    if (!response.ok) {
        console.error("Discord 送信に失敗しました:", response.status, await response.text());
    }
}

/**
 * 今日の予定をまとめて Discord に送る（毎朝用）
 */
async function sendTodaySummary() {
    const calendarId = process.env.CALENDAR_ID || "primary";
    const calendar = await getCalendarClient();

    // 現在時刻（UTC）から JST の「今日」の範囲を計算
    const nowUtc = new Date();
    const nowJst = new Date(nowUtc.getTime() + JST_OFFSET_MS);

    const startOfDayJst = new Date(
        nowJst.getFullYear(),
        nowJst.getMonth(),
        nowJst.getDate(),
        0, 0, 0
    );
    const endOfDayJst = new Date(
        nowJst.getFullYear(),
        nowJst.getMonth(),
        nowJst.getDate(),
        23, 59, 59
    );

    // それをUTCに戻してから ISO 文字列へ
    const startUtc = new Date(startOfDayJst.getTime() - JST_OFFSET_MS);
    const endUtc = new Date(endOfDayJst.getTime() - JST_OFFSET_MS);

    const response = await calendar.events.list({
        calendarId,
        timeMin: startUtc.toISOString(),
        timeMax: endUtc.toISOString(),
        singleEvents: true,
        orderBy: "startTime"
    });

    const events = response.data.items || [];

    if (events.length === 0) {
        await notifyDiscord("📅 本日の予定はありません。");
        return;
    }

    const header = `📅 本日の予定（${startOfDayJst.getMonth() + 1}/${startOfDayJst.getDate()}）`;
    const lines = [header];

    for (const event of events) {
        const summary = event.summary || "(タイトルなし)";

        // 開始時刻
        let startText = "終日";
        if (event.start?.dateTime) {
            const startDate = new Date(event.start.dateTime);
            const jstDate = new Date(startDate.getTime() + JST_OFFSET_MS);
            const hour = jstDate.getHours().toString().padStart(2, "0");
            const minute = jstDate.getMinutes().toString().padStart(2, "0");
            startText = `${hour}:${minute}`;
        }

        lines.push(`• ${startText} - ${summary}`);
    }

    const message = lines.join("\n");
    await notifyDiscord(message);
}

/**
 * エントリーポイント
 * 引数でモードを変えられるようにしておく（後で 30分前通知や編集通知も追加）
 */
async function main() {
    const mode = process.argv[2] || "daily";

    try {
        if (mode === "daily") {
            await sendTodaySummary();
        } else {
            console.log(`不明なモード: ${mode}`);
        }
    } catch (err) {
        console.error("calendar-notify 実行中にエラー:", err);
        process.exit(1);
    }
}

main();
