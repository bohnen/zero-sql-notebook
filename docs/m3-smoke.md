# M3 Smoke Checklist

M3 で追加された GitHub OAuth と Gist 共有機能の確認。

## Netlify 環境変数の準備

以下を Netlify の Site configuration > Environment variables に設定しておく。GitHub OAuth App は "Authorization callback URL" にデプロイ先 origin(例: `https://sql-notebook.netlify.app/`)を登録する。

| 変数名 | 内容 |
| --- | --- |
| `GITHUB_OAUTH_CLIENT_ID` | GitHub OAuth App の Client ID |
| `GITHUB_OAUTH_CLIENT_SECRET` | Client Secret |

ローカルで試すには `netlify env:set --scope dev` で設定するか、`.env` を用意し Netlify CLI に読ませる。OAuth App の callback には `http://localhost:8888/` を含めておく必要あり。

## チェック項目

1. **未設定時の挙動**
   - `GITHUB_OAUTH_CLIENT_ID` 未設定のまま `Share` を押すと、ツールバーに赤字で "GitHub OAuth is not configured on this deploy (set GITHUB_OAUTH_CLIENT_ID)" が表示される
   - `/api/oauth/config` は `{"clientId":null}` を返す

2. **Share 初回(未ログイン)**
   - `Share (sign in)` を押すとブラウザが `github.com/login/oauth/authorize` に遷移
   - 認可後、`?code=&state=` で戻ってくる
   - 戻った直後に自動で Gist が作成され、`Share URL` のプロンプトが出る
   - 以降ツールバーは `Update Gist` に変わる

3. **secret gist の確認**
   - GitHub > Your gists で作成された gist が "secret" とラベル付きで出ている
   - ファイルは `notebook.md`、中身の先頭に以下のフロントマター:
     ```
     ---
     title: <notebook title>
     gist_id: <gist id>
     ---
     ```

4. **Update Gist**
   - セル内容を編集して `Update Gist` を押す
   - 同じ gist が PATCH され、新規 gist は作られない

5. **?gist_id= 読み込み**
   - 別ブラウザ(未ログイン状態)で `https://<site>/?gist_id=<id>` を開く
   - ノートブックがサイドバー + 既存アクティブの **代わりに** 読み取り専用モードで表示される
   - タイトルは `h2` 表示、セルは編集不可、追加/削除/並び替えボタンは非表示
   - `Shared` バッジと `Copy to My Notebooks` / `✕` ボタンが上部に表示される

6. **SQL 実行は共有ビューでも可能**
   - 読み取り専用モードでも `▶ Run` は動作し、閲覧者自身の TiDB Cloud Zero で SQL が実行される

7. **Copy to My Notebooks**
   - 共有ビューで `Copy to My Notebooks` を押すと localStorage に新 id で複製が作られ、サイドバーに現れる
   - そのノートブックが active になり、編集可能になる
   - 複製後は `gist_id` フロントマターが引き継がれるので、自分の gist として Update するにはログイン + (gist 所有者なら更新可能、そうでなければ 403)

8. **Disconnect GitHub**
   - ツールバーの `⎋` アイコンをクリック
   - localStorage の `github-oauth-v1` が消える
   - 再度 Share しようとするとログインフローが再発

9. **CSRF state 不一致の検出**
   - devtools で `sessionStorage.setItem('github-oauth-state-v1', 'wrong')` に書き換え → GitHub からのコールバック着地で "OAuth state mismatch" のエラーバナー

10. **302 先の URL の整形**
    - 認可後の URL が `https://<site>/` に戻り、`?code=&state=` は `history.replaceState` で消えている

## 既知の制約(M4)

- `Share URL` は window.prompt で出す簡易実装。モーダル UI は未実装
- 401/403 時の自動リトライや Reprovision 誘導は未実装
- CSV / Markdown コピー、1000 行バナーは M4
- 削除 Undo Toast、localStorage 容量警告は M4
