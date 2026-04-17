# M4 Smoke Checklist

M4 の仕上げ機能を確認。

```sh
pnpm lint && pnpm test && pnpm build
```

## チェック項目

1. **接続情報モーダル**
   - トップバーの `● connected · expires in Nd` バッジをクリック
   - 接続文字列が code ブロックで表示、`Copy` ボタンでクリップボードへ
   - 有効期限とローカルタイムスタンプ、claim URL(ある場合)が出る
   - 背景クリックまたは `×` / Close で閉じる

2. **Reprovision**
   - モーダル下部の赤い `Reprovision` を押す → 確認ダイアログ → 新しい接続情報で上書き
   - `localStorage.tidb-zero-instance-v1` が更新される
   - バッジに新しい期限が反映される

3. **1000 行制限**
   - `SELECT * FROM information_schema.columns;` 等 1000 行を超えるクエリを実行
   - テーブルは最初の 1,000 行のみ、下に黄色バナー `Only the first 1,000 rows are rendered...`
   - メタ行: `N rows (showing first 1,000)`

4. **CSV ダウンロード**
   - 結果パネルメタ行の `CSV` ボタンをクリック
   - `<title>_<cellIdx>_<YYYYMMDD-HHMMSS>.csv` として保存される
   - 中身は RFC 4180(CRLF、ダブルクォートエスケープ)で **全行**
   - 1000 行超過時も全行入っていること

5. **Markdown コピー**
   - `Copy MD` で結果をクリップボードに Markdown テーブルとして
   - 隣に `Copied` と緑のインジケータ(1.5 秒)

6. **セル削除 Undo**
   - セル削除 `×` をクリック → 右下に `Cell removed` トーストが出る
   - `Undo` を押すと同じ位置に戻る
   - 5 秒で自動的に消える

7. **401/403 自動リトライ**
   - (条件を作るのが難しい項目。Netlify 側で手動に期限切らして試すか、runCell のテストで SqlFetchError を投げるモックで確認)
   - 期限切れを踏んだ時、"Instance looks expired. Reprovisioning…" トーストが出て、裏で再プロビジョンし、同じクエリが自動再実行

8. **期限 1 日未満の警告**
   - バッジが黄色のドット + `expires in Nh` 表示
   - Reprovision を誘導する色合い

9. **Markdown の XSS(M1 項目の再確認)**
   - CSP が有効になっても既存の `<script>` 禁止が機能していること

10. **CSP / セキュリティヘッダ**
    - DevTools > Network で index.html のレスポンスヘッダを確認
    - `Content-Security-Policy`, `X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy`, `X-Content-Type-Options: nosniff` が付いている
    - コンソールに CSP 違反の警告が出ていない(警告があれば該当 directive を緩める)

## 既知の制約 / 今後の改善

- Run All 中の Cancel 機能と 30s タイムアウトは M2 完了済
- 結果のソートや列フィルタはスコープ外
- モバイル最適化は非対応
