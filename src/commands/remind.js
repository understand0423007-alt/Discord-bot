// src/commands/remind.js
import { readFile, writeFile } from "node:fs/promises";
import { db } from "../firebase.js";
import { createSimpleEvent, findEventBySummary } from "../googleCalendar.js";

const DATA_FILE = "remind-local.json"; // /remind local 用（まだ残しておく）

// "2025/12/25 18:00 クリスマスパーティ" 形式を解析
function parseTextToSchedule(text) {
    // 先頭: YYYY/MM/DD HH:MM タイトル
    const m = text.match(
        /^(\d{4})\/(\d{1,2})\/(\d{1,2})\s+(\d{1,2}):(\d{2})\s+(.+)$/
    );
    if (!m) {
        return null;
    }

    const [, yearStr, monthStr, dayStr, hourStr, minuteStr, title] = m;

    const year = Number(yearStr);
    const month = Number(monthStr);
    const day = Number(dayStr);
    const hour = Number(hourStr);
    const minute = Number(minuteStr);

    // JST 前提で Date を生成
    const jst = new Date(year, month - 1, day, hour, minute);

    return {
        title,
        startDate: jst,
    };
}

// Firebase: ユーザーごとのリマインド一覧取得
async function loadFirebaseReminds(userId) {
    try {
        const snap = await db
            .collection("remind_logs")
            .where("userId", "==", userId)
            .get();

        let items = snap.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
        }));

        // createdAt で新しい順にソート
        items.sort((a, b) => {
            const da = new Date(a.createdAt).getTime();
            const db_ = new Date(b.createdAt).getTime();
            return db_ - da;
        });

        return items;
    } catch (err) {
        console.error("Firebase 読み込みエラー:", err);
        return [];
    }
}

export default {
    // deploy-commands.js から参照される Slash コマンド定義
    data: {
        name: "remind",
        description: "remind POC command",
        options: [
            {
                type: 1, // SUB_COMMAND
                name: "test",
                description: "POC: reply Hello World",
            },
            {
                type: 1, // SUB_COMMAND
                name: "local",
                description: "ローカルにテキストを保持するPOC",
                options: [
                    {
                        type: 3, // STRING
                        name: "text",
                        description: "保存したいテキスト",
                        required: true,
                    },
                ],
            },
            {
                type: 1, // SUB_COMMAND
                name: "list",
                description: "Firebase に保存したテキスト一覧を表示するPOC",
            },
            {
                type: 1, // SUB_COMMAND
                name: "firebase",
                description: "Firebase にテキストを保存してカレンダーと同期するPOC",
                options: [
                    {
                        type: 3, // STRING
                        name: "text",
                        description: "保存するテキスト（例: 2025/12/25 18:00 クリスマスパーティ）",
                        required: true,
                    },
                ],
            },
        ],
    },

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();

        // --- test ---
        if (subcommand === "test") {
            await interaction.reply("Hello World");
            return;
        }

        // --- local: ローカルファイルに保存 ---
        if (subcommand === "local") {
            const text = interaction.options.getString("text");

            const entry = {
                userId: interaction.user.id,
                userName: interaction.user.username,
                text,
                createdAt: new Date().toISOString(),
            };

            try {
                let current = [];
                try {
                    const raw = await readFile(DATA_FILE, "utf8");
                    current = JSON.parse(raw);
                } catch (err) {
                    if (err.code !== "ENOENT") {
                        throw err;
                    }
                }

                current.push(entry);

                await writeFile(
                    DATA_FILE,
                    JSON.stringify(current, null, 2),
                    "utf8",
                );

                await interaction.reply(`ローカルに保存しました: ${text}`);
            } catch (err) {
                console.error("ローカル保存エラー:", err);
                await interaction.reply("ローカル保存に失敗しました...");
            }

            return;
        }

        // --- list: Firebase から一覧取得 ---
        if (subcommand === "list") {
            try {
                const userId = interaction.user.id;
                const logs = await loadFirebaseReminds(userId);

                if (logs.length === 0) {
                    await interaction.reply(
                        "Firebase に保存されたデータはありません。",
                    );
                    return;
                }

                const lines = logs.map((entry, index) => {
                    const created = new Date(entry.createdAt).toLocaleString(
                        "ja-JP",
                        { timeZone: "Asia/Tokyo" },
                    );
                    const title = entry.title ?? entry.text;
                    return `${index + 1}. ${title} (${created}) [ID: ${
                        entry.id
                    }]`;
                });

                await interaction.reply(
                    `Firebase に保存されたデータ:\n${lines.join("\n")}`,
                );
            } catch (err) {
                console.error("Firebase list エラー:", err);
                await interaction.reply(
                    "Firebase からの読み込みに失敗しました...",
                );
            }

            return;
        }

        // --- firebase: Firebase 保存 ＋ カレンダー同期（日時自動パース） ---
        if (subcommand === "firebase") {
            const rawText = interaction.options.getString("text");

            // Interaction タイムアウト回避
            await interaction.deferReply();

            // 1) テキストから日時＋タイトルを解析
            const parsed = parseTextToSchedule(rawText);
            const title = parsed ? parsed.title : rawText;
            const startDate = parsed ? parsed.startDate : null;

            const entry = {
                userId: interaction.user.id,
                userName: interaction.user.username,
                text: rawText, // 元テキスト
                title,         // 解釈したタイトル
                startAt: startDate ? startDate.toISOString() : null,
                createdAt: new Date().toISOString(),
            };

            try {
                console.log("=== Firebase 保存開始 ===");
                console.log("entry:", entry);

                // 2) Firebase に保存
                const docRef = await db.collection("remind_logs").add(entry);
                console.log("Firebase 保存成功! Document ID:", docRef.id);

                // 3) カレンダーに同じタイトルの予定があるかチェック
                console.log("Google カレンダー照会開始:", title);
                const existing = await findEventBySummary(title);

                let calendarMessage = "";

                if (existing) {
                    console.log("既存イベントを発見:", existing.id);
                    calendarMessage =
                        "カレンダーには同じタイトルの予定が既に存在するため、新規作成はしませんでした。";
                } else {
                    console.log("既存イベントなし → 新規作成します");
                    const event = await createSimpleEvent({
                        summary: title,
                        description: `Created from Discord by ${entry.userName}\nOriginal text: ${rawText}`,
                        startDate, // 解析できていれば指定日時で登録
                    });
                    console.log("Google カレンダー作成成功:", event.id);
                    calendarMessage =
                        "カレンダーにも新しい予定を追加しました。";
                }

                const parsedInfo = parsed
                    ? `解釈した日時: ${startDate.toLocaleString("ja-JP", {
                          timeZone: "Asia/Tokyo",
                      })}\nタイトル: ${title}`
                    : "日時情報は見つからなかったため、カレンダーは現在時刻ベースで扱います。";

                await interaction.editReply(
                    [
                        `Firebase に保存しました: ${rawText}`,
                        `ID: ${docRef.id}`,
                        parsedInfo,
                        calendarMessage,
                    ].join("\n"),
                );
            } catch (err) {
                console.error("=== Firebase + カレンダー同期エラー ===");
                console.error(err);
                console.error("=== エラーここまで ===");

                await interaction.editReply(
                    "Firebase 保存またはカレンダー同期に失敗しました。ログを確認してください。",
                );
            }

            return;
        }
    },
};
