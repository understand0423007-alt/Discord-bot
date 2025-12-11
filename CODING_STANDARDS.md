# コード規約

このドキュメントは、Discord_bot_POCプロジェクトで使用されているコード規約をまとめたものです。

## 基本設定

- **モジュールシステム**: ES6モジュール（`import`/`export`）
- **Node.js**: `"type": "module"` を `package.json` で指定

## インデントとフォーマット

- **インデント**: スペース4つ（推奨）
  - 注: `deploy-commands.js` では2スペースが使用されているが、プロジェクト全体では4スペースを推奨
- **行末**: セミコロン（`;`）を使用
- **文字列**: ダブルクォート（`"`）を使用

## 命名規則

- **変数・関数**: camelCase
  - 例: `subcommand`, `serviceAccount`, `getSubcommand()`
- **定数**: UPPER_SNAKE_CASE
  - 例: `DATA_FILE`, `DISCORD_TOKEN`
- **ファイル名**: kebab-case（小文字とハイフン）
  - 例: `remind.js`, `firebase.js`, `deploy-commands.js`

## コーディングスタイル

### インポート

- Node.js組み込みモジュールは `node:` プレフィックスを使用
  ```javascript
  import { readFile, writeFile } from "node:fs/promises";
  import { readFileSync } from "node:fs";
  import { resolve } from "node:path";
  ```
- 外部パッケージは通常のインポート
  ```javascript
  import admin from "firebase-admin";
  import { Client, GatewayIntentBits, Events } from "discord.js";
  ```

### 非同期処理

- `async/await` を使用（Promiseチェーンは避ける）
- エラーハンドリングは `try-catch` を使用
  ```javascript
  try {
      // 処理
  } catch (err) {
      console.error("エラーメッセージ:", err);
      // エラー処理
  }
  ```

### オブジェクトと配列

- オブジェクトのプロパティはインデントを揃える
- 配列の要素は改行して記述（長い場合）
- JSON.stringify ではインデント2スペースを使用
  ```javascript
  JSON.stringify(current, null, 2)
  ```

### コメント

- 日本語で記述
- 単行コメントは `//` を使用
- セクション区切りには `// --- セクション名 ---` を使用
- 重要な説明は行末コメントまたは上記コメントで記述

### 条件分岐

- `if` 文は中括弧 `{}` を使用
- 早期リターン（early return）を推奨
  ```javascript
  if (subcommand === "test") {
      await interaction.reply("Hello World");
      return;
  }
  ```

### 関数定義

- 関数は `async` キーワードを使用（非同期処理の場合）
- アロー関数ではなく通常の関数定義を使用（`deploy-commands.js` の `main()` など）

### エクスポート

- デフォルトエクスポートを使用（コマンドモジュール）
  ```javascript
  export default {
      data: { ... },
      async execute(interaction) { ... }
  };
  ```
- 名前付きエクスポートを使用（ユーティリティモジュール）
  ```javascript
  export { admin, db };
  ```

## エラーハンドリング

- エラーログには `console.error()` を使用
- エラーメッセージは日本語で記述
- ユーザー向けメッセージとログメッセージを分ける

## ファイル構造

- コマンドは `src/commands/` ディレクトリに配置
- メインエントリーポイントは `src/index.js`
- 設定ファイルはプロジェクトルートに配置

## 注意事項

- タイポに注意（例: `rewuired` → `required`, `lenth` → `length`, `interavtion` → `interaction`）
- 一貫性のないインデント（2スペース vs 4スペース）を統一することを推奨
- 未使用の変数やインポートを削除






