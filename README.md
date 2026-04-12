# Spotify Playlist Organizer

Spotify のプレイリストを読み込み、曲ごとにタグを付けて、タグで絞り込んだ新しいプレイリストを作るためのアプリです。

## できること

- Spotify にログインする
- 自分のプレイリスト一覧を見る
- 選択したプレイリストの曲を確認する
- 自動タグを付ける
  - Spotify のジャンル情報があればそれを利用
  - ジャンル情報が弱い場合はアーティスト名を補助タグとして利用
- 手動タグを追加・削除する
- 自動タグまたは手動タグで曲を絞り込み、新しい Spotify プレイリストを作る
- ブラウザに保存されたタグやキャッシュを確認・削除する

## 使い方

1. アプリを開いて `Spotifyでログイン` を押します。
2. プレイリスト一覧から見たいプレイリストを選びます。
3. 楽曲一覧で自動タグを確認し、必要に応じて手動タグを追加します。
4. `プレイリスト作成` で使いたいタグを選び、新しいプレイリストを作成します。
5. 必要なら `保存データの管理` からキャッシュや保存済みタグを削除します。

## 画面の見方

- `Spotifyログイン`
  - ログイン状態とリダイレクト URI を確認できます
- `プレイリスト一覧`
  - 自分のプレイリストを確認して選択できます
- `楽曲一覧`
  - 曲情報、自動タグ、手動タグを確認できます
- `プレイリスト作成`
  - 自動タグまたは手動タグで絞り込んだ新しいプレイリストを作れます
- `保存データの管理`
  - ブラウザ内に保存されたタグやアーティスト情報キャッシュを管理できます

## 注意点

- Spotify の仕様上、一覧に見えていても楽曲を取得できないプレイリストがあります
  - 自分が所有しているか、共同編集しているプレイリストが主な対象です
- Spotify のアーティスト情報が不足している場合、自動タグが少なくなることがあります
- Spotify の rate limit に当たると、一時的に自動タグ取得が失敗することがあります
- タグやキャッシュはブラウザの `localStorage` に保存されます
  - 別ブラウザや別端末には自動では共有されません

## Spotify アプリ設定

このアプリを使うには Spotify Developer Dashboard 側の設定が必要です。

- `VITE_SPOTIFY_CLIENT_ID` を設定する
- リダイレクト URI を Spotify アプリに登録する
- `Development mode` の場合は、利用する Spotify アカウントを `Users and Access` に追加する

## ローカル開発

1. `frontend/.env` を作成します
2. `VITE_SPOTIFY_CLIENT_ID` を設定します
3. 必要なら `VITE_SPOTIFY_REDIRECT_URI` を設定します
4. `frontend/` でアプリを起動します

ローカルのコールバック URL 例:

- `http://127.0.0.1:5173/`

`VITE_SPOTIFY_REDIRECT_URI` を設定しない場合は、現在開いている URL を自動で使います。

## Cloudflare で公開する場合

Cloudflare Worker Builds を使って公開できます。

推奨設定:

1. Root directory: `frontend`
2. Build command: `npm run build`
3. Deploy command: `npm run cf:deploy`
4. Version command: `npm run cf:versions`
5. Variables and secrets: `VITE_SPOTIFY_CLIENT_ID`

補足:

- `frontend/wrangler.toml` で `dist` を配信する設定になっています
- Spotify のリダイレクト URI は、公開 URL と完全一致で登録する必要があります
- Preview URL を使う場合は、その Preview URL も Spotify 側に登録が必要です

## 保存データについて

このアプリは主に次の情報をブラウザに保存します。

- Spotify セッション
- 自動タグと手動タグ
- アーティスト情報キャッシュ

不要になった場合は、アプリ内の `保存データの管理` から削除できます。
