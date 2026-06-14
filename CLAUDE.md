# GenDrop — Claude Code 開発ガイド

このファイルは **Claude Code**（および Cursor 以外の AI 開発環境）向けのプロジェクトコンテキストです。  
Cursor で push したあと `git clone` → Claude Code で `/init` 相当としてこのファイルを読んで開発を継続してください。

- **リポジトリ**: https://github.com/hiroshiandailab/gendrop  
- **図解レポート（Surge）**: https://hiroshi-tsutsumi-202604-gendrop.surge.sh/  
- **YouTube Shorts**: https://www.youtube.com/@hiroshiandailab/shorts  
- **p5 Web エディタ（ソース参考）**: https://editor.p5js.org/hiroshiandailab/sketches  

---

## プロジェクト概要

**GenDrop** = p5.js スケッチを **Puppeteer 録画** → **FFmpeg** → **Gemini 文案** → **Google Drive**（＋任意 **Google Chat**）するパイプライン。

人が行うのは最終確認のみ: 音楽付与・YouTube アップロード・投稿文の確定。

### 現行の動画出力（2026-05 仕様）

| 成果物 | 録画 | ローカル | Drive |
|--------|------|----------|-------|
| **9:16 フル尺（1 周）** | 1080×1920 | `output/SKETCH-shorts.mp4` | **`shorts/`** · `…-9x16.mp4` |
| **16:9 フル尺（1 周）** | 1920×1080 | `output/SKETCH-full.mp4` | **`full/`** · `…-16x9.mp4` |
| サムネ | 9:16 から切り出し | `output/SKETCH-thumb.jpg` | **thumbs/** |
| 文案（日英） | Gemini | `output/SKETCH-post.txt` 等 | **metadata/** |

**仕様変更の理由**: 旧方式（960×540 + `start_time` 切り出し + ブラー背景）は、作品ごとに見せどころが異なり **録画スタート秒の固定が困難**だったため、**常に先頭から 1 周**のフル尺 2 本に統一。

---

## リポジトリ構成

```
gendrop/
├── AGENTS.md              ← Codex 用引き継ぎ
├── CLAUDE.md              ← Claude Code 用引き継ぎ
├── README.md              ← ユーザー向け概要
├── sketches/              ← p5 作品（001-… 〜 024-… など）
│   └── <sketch_id>/
│       ├── index.html
│       ├── sketch.js
│       └── meta.json      ← animation_loop_seconds 推奨
├── automation/            ← Node パイプライン（ここで npm ci）
│   ├── record.js          ← 9:16 + 16:9 の WebM 録画
│   ├── process.js         ← FFmpeg → MP4 + サムネ
│   ├── generate-metadata.js
│   ├── upload.js          ← Drive OAuth
│   ├── post-chat.js       ← Record 後の Chat 投稿
│   ├── nightly-notify.js  ← 夜間 Chat（録画なし）
│   ├── rotation.js        ← state.json ローテーション（日次録画では未使用）
│   ├── state.json         ← cursor（手動 Record では自動 advance なし）
│   ├── vendor/p5.min.js   ← CI 用オフライン p5
│   └── output/            ← gitignore（生成物）
└── .github/workflows/
    ├── record.yml         ← 手動: 録画〜Drive〜任意 Chat
    ├── scheduled.yml      ← cron 20:00 JST: Chat 通知のみ
    └── verify-all.yml     ← マトリクス検証
```

---

## ローカルセットアップ

```bash
git clone https://github.com/hiroshiandailab/gendrop.git
cd gendrop
cd automation && npm ci && cd ..
```

**要件**: Node **≥ 20**、ローカル録画テスト時は **FFmpeg**、**Puppeteer** 用 Chromium（`npm ci` で取得）。

### ローカル実行例（Secrets は環境変数）

```bash
cd automation

# 録画（sketch パスは sketches/ からの相対）
node record.js ../sketches/001-ma-26039 30 30 0

# エンコード（第2引数 = サムネ seek 秒）
node process.js 001-ma-26039 3 30

# メタ生成（GEMINI_API_KEY 必須）
node generate-metadata.js 001-ma-26039

# Drive（各 GOOGLE_OAUTH_* / DRIVE_*_FOLDER_ID 必須）
node upload.js 001-ma-26039 3
```

---

## GitHub Actions

| ワークフロー | トリガー | 内容 |
|--------------|----------|------|
| **GenDrop - Record p5.js Sketch** | 手動 | 録画 → process → Gemini → Drive → 任意 Chat |
| **GenDrop - Scheduled Nightly Notify** | 毎日 11:00 UTC (20:00 JST) | Chat 通知のみ |
| **verify-all** | 手動 | 複数スケッチ並列検証 |

### Record の主な inputs

- `sketch_id` — 例 `002-ma-260214`
- `fps` — 既定 30
- `thumb_seek_seconds` — サムネ位置（既定 3）
- `post_to_chat` — 既定 true
- `skip_full_drive_upload` — true で 16:9 の Drive 省略

### 必須 Secrets（Record / upload）

- `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET`, `GOOGLE_OAUTH_REFRESH_TOKEN`
- `DRIVE_SHORTS_FOLDER_ID`, `DRIVE_THUMBS_FOLDER_ID`, `DRIVE_METADATA_FOLDER_ID`
- `DRIVE_FULL_FOLDER_ID` — **16:9 用（未設定だと Record は失敗**、`skip_full_drive_upload` で回避可）
- `GEMINI_API_KEY`
- `GOOGLE_CHAT_WEBHOOK_URL` — Chat 投稿時

### Variables

- `GENDROP_CHAT_NOTIFY` — `false` で夜間 Chat オフ

---

## 1 周の長さの決め方（record.js）

優先順:

1. スケッチ `window.__GENDROP_LOOP_SEC` または `__GENDROP_LOOP_FRAMES`
2. `meta.json` の `animation_loop_seconds`（後方互換 `loop_seconds`）
3. `record.js` 第6引数（緊急）
4. 環境変数 `GENDROP_ANIMATION_LOOP_DEFAULT` → 既定 90 秒

---

## 開発時の注意

- **Secrets / トークンをコミットしない**（`automation/.gitignore` 参照）。
- **スケッチ追加**: `sketches/NNN-id/` に `index.html`, `sketch.js`, `meta.json`。
- **コミット**: ユーザーが明示したときのみ（Cursor / Claude Code 共通）。
- **push 後**: **AGENTS.md** と **CLAUDE.md** の **作業状況** を同期更新してから push すると、Cursor / Claude Code / Codex の切り替えがスムーズ。
- 図解レポート（Surge）は **別ディレクトリ**（`hiroshi-tsutsumi-202604-gendrop`）— 本リポジトリ外。仕様変更時はそちらも手動デプロイ。

---

## 作業状況（Handoff）

> **更新ルール**: Cursor / Claude Code / Codex で作業を終えるたびに、**CLAUDE.md と AGENTS.md の両方**の作業状況を同期更新する。

### 最終更新: 2026-05-08

| 項目 | 状態 |
|------|------|
| パイプライン | ✅ 9:16 → shorts/、16:9 → full/（commit `990416c` 付近） |
| 日次ジョブ | ✅ 20:00 JST Chat のみ（録画なし） |
| Record + Chat | ✅ `post-chat.js`、日英 `post.txt` |
| Drive フル必須チェック | ✅ `GENDROP_REQUIRE_FULL_DRIVE_UPLOAD` on Record |
| ローテーション | ⚠️ `state.json` cursor=1。日次録画廃止のため **Record 成功時は advance しない** |
| verify-all | ✅ 新 record/process に追従済み |
| 図解 Surge | ✅ 仕様変更・変更理由・画像3枚反映済み |
| 引き継ぎ | ✅ AGENTS.md · CLAUDE.md |

### 次にやること（候補）

- [ ] 全 24 スケッチで Record 再実行し shorts/full に揃える
- [ ] 必要なら Record 成功時に `rotation.js advance` を復活
- [ ] 新スケッチ `025-…` 追加手順のテンプレ整備

### 直近の決定事項

- Shorts 用は **9:16 フル 1 周**を Drive shorts に置き、人がトリムして YouTube 投稿。
- **`start_time` による途中切り出しは廃止**（固定困難が理由）。

---

## Claude Code で始める手順

```bash
git clone https://github.com/hiroshiandailab/gendrop.git
cd gendrop
# Claude Code 起動後:
#   /init   … 既に CLAUDE.md がある場合は内容確認・追記
#   このファイルの「作業状況」を読んでからタスク着手
```

開発後:

```bash
git add -A
git status
git commit -m "..."
git push origin main
# → Cursor 側でも pull 可能
```

---

## 関連リンク

- GitHub Actions: リポジトリ **Actions** タブ  
- GitHub Pages スケッチ例: https://hiroshiandailab.github.io/gendrop/sketches/001-ma-26039/  
- OAuth セットアップ: `node automation/auth-setup.js`（ローカル、README 参照）
