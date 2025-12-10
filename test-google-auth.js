import "dotenv/config";
import { google } from "googleapis";

async function testGoogleAuth() {
    try {
        const auth = new google.auth.JWT(
            process.env.GOOGLE_CLIENT_EMAIL,
            null,
            process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
            ["https://www.googleapis.com/auth/calendar"]
        );

        await auth.authorize(); // 認証テスト

        console.log("✅ Google カレンダーと正常に認証できました！");
    } catch (err) {
        console.error("❌ 認証エラー:", err);
    }
}

testGoogleAuth();