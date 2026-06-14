# GenDrop — Codex エージェント引き継ぎ（AGENTS.md）

**OpenAI Codex**（および Cursor / Claude Code 以外のエージェント）向けのリポジトリ指示です。  
作業開始前に **このファイル全体** と **「作業状況（Handoff）」** を読んでから変更してください。

| 用途 | ファイル |
|------|----------|
| Codex | **AGENTS.md**（このファイル） |
| Claude Code | [CLAUDE.md](CLAUDE.md) |
| 人向け概要 | [README.md](README.md) |

**Handoff 同期**: セッション終了時は **AGENTS.md と CLAUDE.md の「作業状況」を同じ内容に更新**してから push する。

---

## リンク

- リポジトリ: https://github.com/hiroshiandailab/gendrop  
- 図解（Surge）: https://hiroshi-tsutsumi-202604-gendrop.surge.sh/  
- YouTube Shorts: https://www.youtube.com/@hiroshiandailab/shorts  
- p5 エディタ: https://editor.p5js.org/hiroshiandailab/sketches  

---

## プロジェクト概要

**GenDrop** — p5.js を **Puppeteer 録画** → **FFmpeg** → **Gemini（日英文案）** → **Google Drive**（＋任意 **Google Chat**）。

人の作業: 音楽・YouTube 投稿・投稿文の最終確定のみ。

### 現行仕様（2026-05）

| 出力 | ビューポート | ローカル | Google Drive |
|------|-------------|----------|--------------|
| 9:16 フル尺 1 周 | 1080×1920 | `automation/output/<id>-shorts.mp4` | **shorts/** · `…-9x16.mp4` |
| 16:9 フル尺 1 周 | 1920×1080 | `automation/output/<id>-full.mp4` | **full/** · `…-16x9.mp4` |
| サムネ | 9:16 から | `…-thumb.jpg` | **thumbs/** |
| 文案 | Gemini | `…-post.txt`, `…-meta.json` | **metadata/** |

**廃止**: 960×540 + `start_time` 切り出し + ブラー Shorts（スタート秒の固定が困難なため、**先頭から 1 周**に統一）。

---

## ディレクトリ

```
sketches/<sketch_id>/     index.html, sketch.js, meta.json
automation/               Node パイプライン（npm ci はここ）
  record.js               9:16 + 16:9 WebM 録画
  process.js              MP4 + サムネ
  generate-metadata.js    Gemini 日英
  upload.js               Drive OAuth
  post-chat.js            Record 後 Chat
  nightly-notify.js       夜間 Chat のみ
.github/workflows/        record.yml, scheduled.yml, verify-all.yml
```

---

## セットアップ

```bash
git clone https://github.com/hiroshiandailab/gendrop.git
cd gendrop/automation
npm ci
```

- **Node ≥ 20**、ローカル録画テスト時 **FFmpeg** 必須  
- `automation/output/` は gitignore（生成物をコミットしない）

---

## よく使うコマンド

```bash
cd automation

node record.js ../sketches/001-ma-26039 30 30 0
node process.js 001-ma-26039 3 30
node generate-metadata.js 001-ma-26039   # GEMINI_API_KEY
node upload.js 001-ma-26039 3            # OAuth + Drive folder IDs
```

**1 周の長さ**（`record.js`）: `__GENDROP_LOOP_*` → `meta.json` `animation_loop_seconds` → argv[6] → env 既定 90s。

---

## GitHub Actions

| ワークフロー | 用途 |
|--------------|------|
| **GenDrop - Record p5.js Sketch** | 手動: 録画〜Drive〜任意 Chat |
| **GenDrop - Scheduled Nightly Notify** | 毎日 20:00 JST · Chat のみ |
| **verify-all** | マトリクス検証 |

Record inputs: `sketch_id`, `fps`, `thumb_seek_seconds`, `post_to_chat`, `skip_full_drive_upload`.

---

## エージェント向けルール

1. **Secrets / `.env` / token をコミットしない**（`automation/.gitignore` 参照）。
2. **コミットはユーザーが明示したときのみ**。
3. **破壊的 git 操作**（force push、hard reset）はユーザー指示がない限り禁止。
4. 変更は **最小スコープ** — 既存の命名・スタイルに合わせる（CommonJS、Puppeteer、spawn FFmpeg）。
5. スケッチ追加: `sketches/NNN-name/` + `animation_loop_seconds` in `meta.json`。
6. 仕様変更時: README・AGENTS.md・CLAUDE.md・Surge 図解（リポジトリ外）の整合をユーザーに確認。
7. **`DRIVE_FULL_FOLDER_ID` 未設定** → Record は 16:9 アップロードで失敗（`skip_full_drive_upload=true` で回避）。

---

## 作業状況（Handoff）

> **更新ルール**: Cursor / Claude Code / Codex のいずれでも、終了前に **AGENTS.md と CLAUDE.md の両方**のこのセクションを同期更新する。

### 最終更新: 2026-05-08

| 項目 | 状態 |
|------|------|
| パイプライン | ✅ 9:16 → shorts/、16:9 → full/ |
| 日次 | ✅ 20:00 JST Chat のみ（録画なし） |
| Record + Chat | ✅ 日英 post.txt · `post-chat.js` |
| Drive 16:9 | ✅ Record で `DRIVE_FULL_FOLDER_ID` 必須（省略 input あり） |
| ローテーション | ⚠️ `state.json` — Record では advance しない |
| 引き継ぎ | ✅ CLAUDE.md 追加済み · **AGENTS.md 本ファイル** |

### 次にやること（候補）

- [ ] 全 24 スケッチで Record 再実行し shorts/full を揃える
- [ ] Record 成功時の `rotation.js advance` 要否を決める
- [ ] 新スケッチ `025-…` 追加

### 直近の決定

- Shorts 素材 = **9:16 フル 1 周**（Drive shorts）。人がトリムして YouTube へ。
- **`start_time` 途中切り出し廃止**。

---

## Codex での開始手順

```bash
git clone https://github.com/hiroshiandailab/gendrop.git
cd gendrop
# Codex: リポジトリルートで AGENTS.md をコンテキストに含める
# 上記「作業状況」を確認してからタスク実行
```

作業後:

```bash
git status
git add <変更ファイル>
git commit -m "..."
git push origin main
```

Cursor / Claude Code 側は `git pull` で同期。
