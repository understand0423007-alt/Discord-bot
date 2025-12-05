<h1 align="center">📘 Discord Remind Bot — POC</h1>

<p align="center">
  Discord → Firebase（Firestore）→ Google Calendar を自動連携する Proof of Concept
</p>

---

## 🚀 主な機能
- `/remind test`：Bot 動作確認（Hello World を返す）
- `/remind local`：ローカルファイル `remind-local.json` に保存
- `/remind list`：Firestore に保存した自分のデータ一覧を表示
- `/remind firebase text:XXXX`：日時を自動解析 → Firestore 保存 → 未登録なら Google カレンダーへ登録
- `/remind calendar text:XXXX`：指定タイトルを直接 Google カレンダーに登録
- Admin Web UI：ローカル Web サーバから Firestore データ一覧を閲覧

---

## 📁 プロジェクト構成
```
Discord_bot_POC/
├── src/
│   ├── index.js          # Discord クライアント
│   ├── firebase.js       # Firestore クライアント
│   ├── googleCalendar.js # Google カレンダー連携
│   ├── adminServer.js    # Admin UI
│   └── commands/
│       └── remind.js     # SlashCommand 実装
├── .env                  # トークン類（Git へ公開禁止）
├── firebase-key.json     # サービスアカウント鍵（公開禁止）
├── package.json
└── .gitignore
```

---

## 🔧 セットアップ
### 1. 依存パッケージ
```bash
npm install
npm install discord.js dotenv @google-cloud/firestore googleapis express
```

### 2. `.env` 設定
```env
DISCORD_TOKEN=your-discord-token
DISCORD_CLIENT_ID=your-discord-client-id
GCP_PROJECT_ID=discord-bot-poc-480206
GOOGLE_APPLICATION_CREDENTIALS=./firebase-key.json
GCAL_CALENDAR_ID=your-calendar-id
ADMIN_PORT=3000
```
⚠ `.env` と `firebase-key.json` は必ず `.gitignore` に含めてください。

### 3. Firestore 設定
- Firestore Database を作成（Native、リージョン例: asia-northeast1）
- Firestore API を有効化
- サービスアカウントを作成し JSON 鍵を `firebase-key.json` として保存
- 上記値を `.env` に設定
- 利用コレクション：`remind_logs`

### 4. Google Calendar 設定
- Google Calendar API を有効化
- カレンダーの共有設定でサービスアカウントを追加（権限: 予定の変更）
- カレンダー ID（`xxx@group.calendar.google.com`）を `.env` へ設定

---

## 🤖 起動方法
```bash
npm start          # Bot 起動
npm run admin      # Admin Web UI 起動
```
Admin UI: http://localhost:3000/reminds  
Firestore のデータ一覧（最新 100 件）を確認できます。

---

## 🧠 日付解析仕様
解析可能な形式：
```
YYYY/MM/DD HH:MM タイトル
例: 2025/12/25 18:00 クリスマスパーティ
```
解析成功時:
- `title` = "クリスマスパーティ"
- `startAt` = 2025-12-25T09:00:00.000Z（JST → UTC 変換後）

解析失敗時:
- `title` = 入力テキスト
- `startAt` = null

カレンダー登録は「現在時刻 +5分」から自動作成。

---

## 📦 `.gitignore` 推奨
```
node_modules/
.env
firebase-key.json
remind-local.json
*.log
.DS_Store
.vscode/
.idea/
```

---

## 🎉 完了した POC 要件
| ステップ | 内容 | 状態 |
| --- | --- | --- |
| 1 | /remind test → Hello World | ✔ |
| 2 | /remind local → ローカル保存 | ✔ |
| 3 | /remind list → ローカル表示（Firebase 版へ移行済） | ✔ |
| 4 | Firebase 保存 | ✔ |
| 5 | Google Calendar 登録 | ✔ |
| 6 | Firebase → Calendar 自動同期（日付解析付き） | ✔ |
| 7 | 管理画面（Admin UI） | ✔ |

<h2 align="center">✨ 今後の発展（Next Step）</h2>

- 自然言語での日時解析（例：「明日18時」など）
- Google カレンダーとの双方向同期
- Next.js + Firebase Hosting で本格管理画面
- Cloud Functions で自動通知リマインダ