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
