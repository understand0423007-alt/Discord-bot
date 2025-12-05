<h1 align="center">📘 Discord Remind Bot — POC</h1>

<p align="center">
  Discord → Firebase（Firestore）→ Google Calendar の自動連携を実現する Proof of Concept
</p>

---

<h2>🚀 主な機能</h2>

### `/remind test`
- Bot の動作確認  
- **Hello World** を返します。

### `/remind local`
- ローカルファイル（remind-local.json）にテキストを保存。

### `/remind list`
- Firebase（Firestore）に保存した **自分のデータ一覧を表示**。

### `/remind firebase text:XXXX`
- テキストに含まれる **日時を自動解析**（例：`2025/12/25 18:00 タイトル`）
- Firestore に保存  
- Google カレンダーに **未登録であれば自動登録**

### `/remind calendar text:XXXX`
- 指定したタイトルの予定を Google カレンダーに直接登録。

### Admin Web UI
ローカル Web サーバから Firestore のデータ一覧が閲覧できます。

---

<h2>📁 プロジェクト構成</h2>

Discord_bot_POC/
src/
index.js # Discord クライアント
firebase.js # Firestore クライアント
googleCalendar.js # Google カレンダー連携
adminServer.js # Admin UI
commands/
remind.js # SlashCommand 実装
.env # トークンなど（※絶対に Git に公開しない）
firebase-key.json # サービスアカウント鍵（※絶対に公開しない）
package.json
.gitignore

yaml
コードをコピーする

---

<h2>🔧 セットアップ手順</h2>

### 1. 依存パッケージインストール
```bash
npm install
追加パッケージ：

bash
コードをコピーする
npm install discord.js dotenv @google-cloud/firestore googleapis express
<h2>🔑 .env 設定</h2>
env
コードをコピーする
DISCORD_TOKEN=your-discord-token
DISCORD_CLIENT_ID=your-discord-client-id

GCP_PROJECT_ID=discord-bot-poc-480206
GOOGLE_APPLICATION_CREDENTIALS=./firebase-key.json

GCAL_CALENDAR_ID=your-calendar-id
ADMIN_PORT=3000
⚠ .env と firebase-key.json は 必ず .gitignore に入れてください。

<h2>🔥 Firestore 設定手順</h2>
Firestore Database を作成（Native / asia-northeast1 推奨）

Firestore API を有効化

サービスアカウントを作成 → JSON鍵を firebase-key.json として保存

.env に設定

コレクション remind_logs を利用します

<h2>📅 Google Calendar 設定手順</h2>
Google Calendar API を有効化

カレンダーの「共有」設定から、サービスアカウントを追加
→ 権限：予定の変更

カレンダーID（xxx@group.calendar.google.com）を .env に設定

<h2>🤖 Bot 起動</h2>
bash
コードをコピーする
npm start
<h2>🌐 Admin Web UI 起動</h2>
bash
コードをコピーする
npm run admin
アクセス：

bash
コードをコピーする
http://localhost:3000/reminds
Firestore のデータ一覧（最新100件）が確認できます。

<h2>🧠 日付解析仕様</h2>
Botは以下の形式を解析できます：

css
コードをコピーする
YYYY/MM/DD HH:MM タイトル
例：

swift
コードをコピーする
2025/12/25 18:00 クリスマスパーティ
解析成功時：

title = "クリスマスパーティ"

startAt = 2025-12-25T09:00:00.000Z（JST → UTC変換後）

解析失敗時：

title = 入力テキスト

startAt = null

カレンダーは「現在時刻 +5分」から自動作成

<h2>📦 .gitignore（推奨）</h2>
gitignore
コードをコピーする
node_modules/
.env
firebase-key.json
remind-local.json

*.log
.DS_Store
.vscode/
.idea/
<h2>🎉 完了した POC 要件</h2>
ステップ	内容	状態
1	/remind test → Hello World	✔
2	/remind local → ローカル保存	✔
3	/remind list → ローカル表示	✔（Firebase版へ移行済）
4	Firebase 保存	✔
5	Google Calendar 登録	✔
6	Firebase → Calendar 自動同期（日付解析付き）	✔
7	管理画面（Admin UI）	✔

<h2 align="center">✨ 今後の発展（Next Step）</h2>
自然言語での日時解析（例：「明日18時」など）

Google カレンダーとの双方向同期

Next.js + Firebase Hosting で本格管理画面

Cloud Functions で自動通知リマインダ