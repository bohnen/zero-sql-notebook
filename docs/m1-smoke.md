# M1 Smoke Checklist

M1 の完了判定は以下 8 項目をすべて通過することを条件とする。実行環境は `pnpm dev`(= `netlify dev`)で起動した `http://localhost:8888`。

## 前提

```sh
pnpm install
pnpm dev
# → http://localhost:8888 が表示されたらブラウザで開く
```

別ターミナルで CI 相当ゲートも一発で確認できる:

```sh
pnpm lint && pnpm test && pnpm build
```

## チェック項目

1. **初回プロビジョニング**
   - DevTools > Application > Local Storage → `http://localhost:8888` で `tidb-zero-instance-v1` を削除
   - ページをリロード
   - スプラッシュ「Connecting to TiDB Cloud Zero…」 → Welcome ノートブックが表示される
   - Network タブで `/api/instance` が 1 回呼ばれ 200 で返る

2. **初期 SELECT 1 の実行**
   - 初期ノートブックの SQL セルの `▶ Run` をクリック
   - 結果パネルに `elapsed XXX ms · 1 rows` と `hello` 列(BIGINT)の `1` が右寄せで表示される

3. **新しい SQL セル追加 → 実行**
   - 下部の `+ sql` をクリック
   - エディタに `SELECT table_schema, table_name FROM information_schema.tables LIMIT 3;` と入力
   - `▶ Run`(または Cmd/Ctrl+Enter)で実行 → 3 行のテーブルが表示される

4. **Markdown プレビュー / 編集切替**
   - `+ md` で Markdown セルを追加
   - クリック → textarea で `# Heading\n\n**bold** text` を入力 → 外側をクリックしてフォーカス外す
   - プレビューが大きな見出しと **太字** としてレンダリングされる

5. **全削除 → 再ロードでの空ノートブック復元**
   - すべてのセルの `×` をクリックして削除
   - ページをリロード
   - "This notebook has no cells yet." のメッセージが残ったまま(= localStorage に 0 セル状態が保存されている)

6. **並び替え → 再ロードで順序保存**
   - 新しく md / sql / env を 1 つずつ追加
   - 一番下のセルを `▲` で 2 回押して先頭に移動
   - リロード後も同じ順序で復元される

7. **インスタンスキャッシュ**
   - 再読み込み
   - Network タブで `/api/instance` が **呼ばれない**ことを確認(localStorage の L1 キャッシュが効いている)
   - 5 分以内の再プロビジョンは発生しないはず

8. **Markdown の XSS 不発火**
   - Markdown セルに `<img src=x onerror="alert(1)">` と `<script>alert(1)</script>` を入力
   - フォーカスを外してプレビュー表示
   - アラートが出ないこと。DOMPurify により危険な属性/要素が除去される

## 実装ギャップ(M2 以降で追加)

- env セルは今は textarea として保持されるだけで、`${VAR}` 展開は行われない(M2)
- Run All / Cancel / タイムアウトは未実装(M2)
- 複数ノートブック管理 / インポート・エクスポート / Gist 共有は未実装(M2〜M3)
- CSV ダウンロードと Markdown コピー、1000 行制限バナーは M4
