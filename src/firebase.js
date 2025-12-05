// src/firebase.js
import { Firestore } from "@google-cloud/firestore";

// Firestore クライアントの初期化
export const db = new Firestore({
    projectId: process.env.GCP_PROJECT_ID,
});