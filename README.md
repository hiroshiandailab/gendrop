# GenDrop

Generative Video Flow — p5.js を録画し、YouTube Shorts 向けに加工するパイプラインです。

**Claude Code で開発する場合** → リポジトリ直下の [`CLAUDE.md`](CLAUDE.md)（セットアップ・作業状況・Handoff）を参照してください。

## リポジトリ

- https://github.com/hiroshiandailab/gendrop

ローカルでクローン済みの場合、`origin` が古いユーザー名のままなら次で更新してください。

```bash
git remote set-url origin https://github.com/hiroshiandailab/gendrop.git
git remote -v
```

SSH の場合:

```bash
git remote set-url origin git@github.com:hiroshiandailab/gendrop.git
```

## GitHub Pages

ユーザー／組織サイトの URL は **`hiroshiandailab.github.io`** になります。

- リポジトリをサイトとして公開している場合の例:  
  https://hiroshiandailab.github.io/gendrop/
- 特定スケッチの例:  
  https://hiroshiandailab.github.io/gendrop/sketches/001-ma-26039/

（実際のパスはリポジトリの Pages 設定に合わせてください。）

## Google Cloud OAuth（Drive 連携）

`automation/auth-setup.js` でリフレッシュトークンを取得するときのリダイレクト URI は次の固定値です（GitHub のユーザー名とは無関係です）。

- **承認済みのリダイレクト URI**: `http://localhost:3000/oauth2callback`

Google Cloud Console → **API とサービス** → **認証情報** → 使用中の OAuth 2.0 クライアントで、上記 URI が登録されていれば、GitHub アカウント名変更後もそのまま利用できます。

もし検証用に **GitHub Pages の URL** を「承認済みの JavaScript 生成元」やリダイレクト URI に追加していた場合は、`hiroshiandai.github.io` を **`hiroshiandailab.github.io`** に書き換えて保存してください。

GitHub Actions での Drive アップロードはリポジトリの Secrets（`GOOGLE_OAUTH_*`）を使用するため、**ユーザー名変更だけでは Secrets の再登録は不要**です（別アカウントに移した場合は別途対応が必要です）。

## 動画出力（9:16 + 16:9 フル尺）

1回の **GenDrop - Record** で、**アニメ 1 周ずつ**のフル尺を **2 アスペクト**で録画・エンコードします。

| 出力 | ローカルファイル | Google Drive フォルダ |
|------|------------------|------------------------|
| **9:16 フル尺** | `SKETCH-shorts.mp4` | **`shorts/`**（`DRIVE_SHORTS_FOLDER_ID`）· ファイル名例 `…-9x16.mp4` |
| **16:9 フル尺** | `SKETCH-full.mp4` | **`full/`**（`DRIVE_FULL_FOLDER_ID`）· ファイル名例 `…-16x9.mp4` |

- 録画ビューポート: **9:16** = 1080×1920、**16:9** = 1920×1080。いずれも **はじめから 1 周**（`meta.json` の `animation_loop_seconds` やスケッチの `__GENDROP_LOOP_*` 等で尺を決定）。
- 旧仕様の「960×540 短尺クリップ＋ブラー背景 Shorts」は廃止しました。
- **16:9** を Drive に上げるには **`DRIVE_FULL_FOLDER_ID`** が必要です。**GenDrop - Record** では未設定だと **失敗**します（`skip_full_drive_upload=true` で 16:9 のみスキップ可）。**verify-all** では Secret が無いとき 16:9 アップロードのみスキップします。

## スケジュール実行（毎晩 Google Chat 通知）

ワークフロー **「GenDrop - Scheduled Nightly Notify」**（`.github/workflows/scheduled.yml`）は **録画・Drive には触れません**（それらは **GenDrop - Record** の手動実行のみ）。

1. `sketches/` 以下に **`.txt` がある場合**: その中から **ランダムに 1 ファイル**を選び、本文を Google Chat に投稿します。  
2. **`.txt` が 1 つもない場合**: スケッチフォルダから **ランダムに 1 本**選び、`generate-metadata.js`（Gemini）で **`SKETCH_ID-post.txt`** を生成してから、その内容を Chat に投稿します（このとき **`GEMINI_API_KEY`** が必要です）。

**Cron**: デフォルト **毎日 11:00 UTC**（**日本時間 20:00**）。変更する場合は YAML の `cron` を編集してください。

**Chat のオン／オフ**: リポジトリ **Settings → Secrets and variables → Actions → Variables** に **`GENDROP_CHAT_NOTIFY`** を追加し、無効にしたいときだけ値を **`false`**（または **`0`**）にします。未設定のときは通知対象として扱います（Webhook が無ければ投稿はスキップされ、ジョブは成功で終わります）。

**Webhook**: Secrets に **`GOOGLE_CHAT_WEBHOOK_URL`**（Google Chat の受信 Webhook URL）を登録します。未設定の場合、投稿は行われず成功で終了します。

**手動テスト**: Actions タブから **Run workflow** を実行できます。入力 **`chat_notify`** に `true` / `false` を入れると、その回だけ Variable を上書きします（空欄なら Variable の値を使用）。
