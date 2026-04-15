# Spotify Playlist Organizer

Spotify のプレイリストを読み込み、曲ごとにタグを付けて、タグで絞り込んだ新しいプレイリストを作るためのアプリです。

---

## このアプリでできること

- Spotify にログインする
- プレイリスト一覧を見る
- 選択したプレイリストの曲を確認する
- アーティスト情報から自動タグを生成する
- アーティストを Spotify リンクから確認する
- 手動タグを追加、削除する
- タグで曲を絞り込む
- ジャンル集計や主要アーティストを確認する
- 新しいプレイリストを作成する
- ブラウザに保存された手動タグを削除する

---

## Spotify API 準拠方針

- 認証方式は Spotify Authorization Code with PKCE を使用します
- Implicit Grant は使用しません
- redirect URI は HTTPS を使用します
  - ローカル開発時のみ `http://127.0.0.1` を使用できます
  - `http://localhost` は使用しません
- スコープは必要最小限のみ要求します
  - `playlist-read-private`
  - `playlist-read-collaborative`
  - `playlist-modify-private`
  - `playlist-modify-public`
  - `user-read-private`
- アクセストークン期限切れ時は refresh token でセッションを更新します
- 429 応答では `Retry-After` を優先し、未指定時は指数バックオフで再試行します
- 非推奨エンドポイントは使いません
  - プレイリスト項目取得は `GET /playlists/{id}/items` を使います
- Spotify 由来のメタデータは長期キャッシュしません
  - アーティストのジャンル情報や自動タグは都度取得・都度生成します
- 保存するのはブラウザ上のセッション情報と手動タグのみです

---

## 補足

- 自動タグは Spotify のアーティストジャンル情報をもとに生成します
- ジャンル情報が弱い場合は、アーティスト名を補助タグとして使用します
- 自動タグは長期保存せず、表示時に都度生成します
- 手動タグはこのブラウザの localStorage に保存されます

---

## 保存される主なデータ

- Spotify セッション情報
  - access token
  - refresh token
  - scope
  - expiresAt
- 手動タグ

Spotify 由来のアーティストキャッシュや自動タグは長期保存しません。

---

## 利用制限について

このアプリは Spotify Web API を利用しており、Spotify 側の仕様によりいくつかの制限があります。

### 開発モードによる制限

- 新規アプリの既定では Development Mode で動作します
- 開発者が許可したユーザーのみ利用できる場合があります
- 不特定多数に公開する場合は Extended quota mode の申請が必要です

### ユーザー認証について

- ユーザー固有データを扱うため、各ユーザーが自分の Spotify アカウントでログインする必要があります

---

## ローカル開発

`frontend/` 配下でセットアップしてください。

- Spotify Developers で取得した Client ID が必要です
- https://developer.spotify.com/dashboard
- `frontend/.env` を作成します
- `VITE_SPOTIFY_CLIENT_ID` を設定します
- 必要に応じて `VITE_SPOTIFY_REDIRECT_URI` を設定します

### redirect URI 例

- `http://127.0.0.1:5173/`

注意:
- `http://localhost:5173/` は使わないでください
- 公開環境では HTTPS の redirect URI を登録してください

---

## Cloudflare で公開する場合

Cloudflare Worker Builds を使用して公開できます。

### 推奨設定

- Root directory: `frontend`
- Build command: `npm run build`
- Deploy command: `npm run cf:deploy`
- Version command: `npm run cf:versions`
- Variables and secrets: `VITE_SPOTIFY_CLIENT_ID`

---

## 参考ドキュメント

- OpenAPI schema: https://developer.spotify.com/reference/web-api/open-api-schema.yaml
- PKCE: https://developer.spotify.com/documentation/web-api/tutorials/code-pkce-flow
- Token refresh: https://developer.spotify.com/documentation/web-api/tutorials/refreshing-tokens
- Redirect URI requirements: https://developer.spotify.com/documentation/web-api/concepts/redirect_uri
- Scopes: https://developer.spotify.com/documentation/web-api/concepts/scopes
- Rate limits: https://developer.spotify.com/documentation/web-api/concepts/rate-limits
- Developer Terms: https://developer.spotify.com/terms
