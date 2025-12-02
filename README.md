Discord Remind Bot

Discord × Web × Google Calendar / ToDo が同期するタスク・イベント管理 Bot


 概要

この Bot は、Discord で入力したタスクやイベントを、
Web 管理画面や Google カレンダー / Google ToDo と自動同期して扱えるシステムです。

ユーザーは Discord に文章を投げるだけで、Bot が予定を解析・登録し、
必要なときにリマインドを送ってくれます。

 主な機能
 1. TODO リストのリマインド

期限付きタスクを追加

Discord で自然文を解析
→ タスク名 / 実行日時 / リマインドタイミングを抽出

Google ToDo / Google カレンダーに自動登録

リスト表示・編集・削除

期限前に Discord に通知

2. イベントリマインド

日付＋時間のイベントを登録

Google カレンダーに予定として追加

イベント開始の○分前 / ○時間前に通知

将来的にメール自動生成も対応

  アーキテクチャ
flowchart LR
  User -->|入力| Discord
  Discord -->|Webhook/API| CloudRun
  CloudRun --> Firestore
  CloudRun --> GoogleCalendar
  CloudRun --> GoogleTasks
  Firestore --> WebApp
  CloudScheduler --> CloudRun

 使用技術（Tech Stack）
Backend / Bot

Node.js / TypeScript

Discord.js

Google Calendar API

Google Tasks API

Gmail API（予定）

Cloud Run / Cloud Functions

Frontend

React / Vue（SPA）

Firebase Hosting

Infra

Firestore

Cloud Scheduler

 セットアップ
1. Clone
git clone https://github.com/yourname/discord-remind-bot.git
cd discord-remind-bot

2. Install
npm install

3. .env 作成
DISCORD_TOKEN=xxxx
GOOGLE_CLIENT_ID=xxxx
GOOGLE_CLIENT_SECRET=xxxx
GOOGLE_REDIRECT_URI=xxxx

4. Bot 起動
npm run dev

 使い方
 タスク追加例
明日の13時に資料作成 30分前に教えて


Bot が以下のように解析：

項目	内容
タスク名	資料作成
実行日時	明日 13:00
リマインド	30分前
 Web 管理画面でできること

タスク / イベント一覧

ユーザー別 / サーバー別表示

追加者・更新情報の確認

Google 同期状態のチェック

 今後の予定

Google からの双方向同期

Slack 対応

Web からの編集・追加

イベントメール送信機能