// src/googleCalendar.js
import { google } from "googleapis";

const CALENDAR_ID = process.env.GCAL_CALENDAR_ID;

const auth = new google.auth.GoogleAuth({
    keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS, // 例: ./firebase-key.json
    scopes: ["https://www.googleapis.com/auth/calendar"],
});

// 日時指定にも対応した createSimpleEvent（これを1個だけ定義）
export async function createSimpleEvent({ summary, description, startDate } = {}) {
    const authClient = await auth.getClient();
    const calendar = google.calendar({ version: "v3", auth: authClient });

    let start;
    if (startDate instanceof Date) {
        // 解析済みの日時が渡されている場合
        start = startDate;
    } else {
        // 渡されていない場合は「今から5分後」をデフォルトにする
        const now = new Date();
        start = new Date(now.getTime() + 5 * 60 * 1000);
    }

    const end = new Date(start.getTime() + 30 * 60 * 1000); // 30分に固定

    const event = {
        summary,
        description,
        start: {
            dateTime: start.toISOString(),
        },
        end: {
            dateTime: end.toISOString(),
        },
    };

    const res = await calendar.events.insert({
        calendarId: CALENDAR_ID,
        requestBody: event,
    });

    return res.data;
}

// 既存イベント検索用
export async function findEventBySummary(summary) {
    const authClient = await auth.getClient();
    const calendar = google.calendar({ version: "v3", auth: authClient });

    const now = new Date();
    const timeMin = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); // 過去30日
    const timeMax = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000); // 1年後

    const res = await calendar.events.list({
        calendarId: CALENDAR_ID,
        timeMin: timeMin.toISOString(),
        timeMax: timeMax.toISOString(),
        singleEvents: true,
        orderBy: "startTime",
    });

    const events = res.data.items ?? [];
    const found = events.find(event => event.summary === summary) || null;

    return found;
}

import { google } from "googleapis";

// --- Google カレンダーAPIクライアントの準備 ---

// 環境変数から認証情報を取得する想定
// GOOGLE_CLIENT_EMAIL と GOOGLE_PRIVATE_KEY は
// サービスアカウントの情報を設定しておく
const SCOPES = ["https://www.googleapis.com/auth/calendar.readonly"];

const jwtClient = new google.auth.JWT(
    process.env.GOOGLE_CLIENT_EMAIL,
    null,
    // 改行が潰れている場合があるので置換
    process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    SCOPES
);

const calendar = google.calendar({ version: "v3", auth: jwtClient });

// すでに通知したイベントIDを保存しておく簡易メモリ
// （本番では Firestore などに保存した方が安全）
const notifiedEventIds = new Set();

// --- 直近の予定を取得する関数 ---

async function fetchUpcomingEvents(calendarId, timeWindowMinutes = 10) {
    const now = new Date();
    const timeMin = now.toISOString();

    const timeMax = new Date(now.getTime() + timeWindowMinutes * 60 * 1000);
    const timeMaxIso = timeMax.toISOString();

    const res = await calendar.events.list({
        calendarId,
        timeMin,
        timeMax: timeMaxIso,
        singleEvents: true,
        orderBy: "startTime",
        maxResults: 10
    });

    return res.data.items ?? [];
}

// --- Discord Bot から呼び出すウォッチャーを起動する関数 ---

function startCalendarWatcher(discordClient) {
    const calendarId = process.env.GOOGLE_CALENDAR_ID;
    if (!calendarId) {
        console.error("GOOGLE_CALENDAR_ID が設定されていません。");
        return;
    }

    const channelId = process.env.DISCORD_NOTIFY_CHANNEL_ID;
    if (!channelId) {
        console.error("DISCORD_NOTIFY_CHANNEL_ID が設定されていません。");
        return;
    }

    // 1分ごとにカレンダーをチェック
    setInterval(async () => {
        try {
            const events = await fetchUpcomingEvents(calendarId, 10);

            if (!events.length) {
                return;
            }

            const channel = await discordClient.channels.fetch(channelId);
            if (!channel || !channel.isTextBased()) {
                console.error("通知先チャンネルが見つからないか、テキストチャンネルではありません。");
                return;
            }

            for (const event of events) {
                // すでに通知済みのイベントはスキップ
                if (notifiedEventIds.has(event.id)) {
                    continue;
                }

                const start = event.start?.dateTime ?? event.start?.date;
                const summary = event.summary ?? "無題の予定";

                const message =
                    "⏰ まもなく予定が開始されます！\n" +
                    `タイトル: ${summary}\n` +
                    `開始時刻: ${start}\n`;

                await channel.send(message);

                // 通知済みとして記録
                notifiedEventIds.add(event.id);
            }
        } catch (err) {
            console.error("Google カレンダーからの取得中にエラーが発生しました:", err);
        }
    }, 60 * 1000); // 60,000ms = 1分
}

export { startCalendarWatcher };
