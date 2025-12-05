// src/adminServer.js
import express from "express";
import "dotenv/config";
import { db } from "./firebase.js";

const app = express();
const PORT = process.env.ADMIN_PORT || 3000;

// シンプルなトップページ
app.get("/", (req, res) => {
    res.send(
        `<h1>Discord Remind Admin</h1>
        <p><a href="/reminds">/reminds を開くと Firestore の remind_logs を確認できます。</a></p>`
    );
});

// remind_logs 一覧表示
app.get("/reminds", async (req, res) => {
    try {
        const snapshot = await db
            .collection("remind_logs")
            .orderBy("createdAt", "desc")
            .limit(100)
            .get();

        const rows = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                userId: data.userId,
                userName: data.userName,
                text: data.text,
                title: data.title ?? "",
                startAt: data.startAt ?? "",
                createdAt: data.createdAt ?? "",
            };
        });

        // とりあえず素朴な HTML テーブルで表示
        const htmlRows = rows
            .map(r => {
                return `
<tr>
  <td>${r.id}</td>
  <td>${r.userName} (${r.userId})</td>
  <td>${r.text}</td>
  <td>${r.title}</td>
  <td>${r.startAt}</td>
  <td>${r.createdAt}</td>
</tr>`;
            })
            .join("");

        const html = `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8" />
  <title>Remind Logs Admin</title>
  <style>
    body { font-family: system-ui, sans-serif; padding: 16px; }
    table { border-collapse: collapse; width: 100%; }
    th, td { border: 1px solid #ccc; padding: 4px 8px; font-size: 12px; }
    th { background: #f0f0f0; }
    tr:nth-child(even) { background: #fafafa; }
  </style>
</head>
<body>
  <h1>remind_logs 一覧</h1>
  <p>最新100件まで表示しています。</p>
  <table>
    <thead>
      <tr>
        <th>Doc ID</th>
        <th>User</th>
        <th>Text</th>
        <th>Title</th>
        <th>StartAt</th>
        <th>CreatedAt</th>
      </tr>
    </thead>
    <tbody>
      ${htmlRows}
    </tbody>
  </table>
</body>
</html>`;

        res.send(html);
    } catch (err) {
        console.error("admin /reminds error:", err);
        res.status(500).send("Error loading reminds. Check server logs.");
    }
});

app.listen(PORT, () => {
    console.log(`Admin server running: http://localhost:${PORT}`);
});
