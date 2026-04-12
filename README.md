# Spotify Playlist Organizer

Spotify のプレイリストを読み込み、曲ごとにタグを付けて、タグで絞り込んだ新しいプレイリストを作るためのアプリです。

## このアプリでできること

手元の Spotify プレイリストを読み込み、曲に自動タグ・手動タグを付けて整理し、そのタグを使って新しいプレイリストを作成できます。

## できること

- Spotify にログインする
- プレイリスト一覧を見る
- 選択したプレイリストの曲を確認する
- 自動タグを付ける
- 手動タグを追加、削除する
- 自動タグまたは手動タグで曲を絞り込み、新しいプレイリストを作る
- ブラウザに保存されたタグやキャッシュを確認、削除する

## 使い方

1. `Spotifyでログイン` を押します。
2. プレイリスト一覧から見たいプレイリストを選びます。
3. 楽曲一覧で自動タグを確認し、必要に応じて手動タグを追加します。
4. `プレイリスト作成` で使いたいタグを選び、新しいプレイリストを作成します。
5. 必要なら `保存データの管理` から保存済みデータを削除します。

## 補足

- 自動タグは Spotify のジャンル情報をもとに付与されます。
- ジャンル情報が弱い場合は、アーティスト名を補助タグとして使います。
- Spotify の仕様上、一部のプレイリストは一覧に見えていても楽曲を取得できないことがあります。
- タグやキャッシュはこのブラウザ内に保存されます。

## 保存される主なデータ

- Spotify のログイン情報
- 自動タグと手動タグ
- アーティスト情報のキャッシュ

これらはアプリ内の `保存データの管理` から削除できます。

## ローカル開発

ローカルで動かす場合は `frontend/` 配下でセットアップしてください。

- Spotify Developers で取得した Client ID が必要です
  - https://developer.spotify.com/dashboard
- `frontend/.env` を作成する
- `VITE_SPOTIFY_CLIENT_ID` を設定する
- 必要なら `VITE_SPOTIFY_REDIRECT_URI` を設定する

ローカルのコールバック URL 例:

- `http://127.0.0.1:5173/`

## Cloudflare で公開する場合

Cloudflare Worker Builds を使って公開できます。

推奨設定:

1. Root directory: `frontend`
2. Build command: `npm run build`
3. Deploy command: `npm run cf:deploy`
4. Version command: `npm run cf:versions`
5. Variables and secrets: `VITE_SPOTIFY_CLIENT_ID`
