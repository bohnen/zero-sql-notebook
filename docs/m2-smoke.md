# M2 Smoke Checklist

M2 で追加された機能の動作確認。前提は `pnpm dev` で `http://localhost:8888` にアクセス。

```sh
pnpm lint && pnpm test && pnpm build
```

## チェック項目

1. **サイドバー初期表示**
   - 初回起動で Welcome ノートブックのみがサイドバーに表示される
   - 各行にホバーすると `✎ ⎘ ↓ ×` の 4 ボタンが出る

2. **複数ノートブックの作成と切替**
   - サイドバー `+ New` で新規作成 → active になる
   - Welcome をクリックすると active が切り替わり、メインエリアが Welcome の内容に戻る
   - リロード後も最後に active だったノートブックが復元される

3. **Rename / Duplicate / Delete**
   - 行右の `✎` で Rename(`prompt` ダイアログ)
   - `⎘` で複製 → `<title> (copy)` が追加され active になる
   - `×` で削除 → 確認ダイアログ → 0 件になる場合は新規 Untitled が作られる

4. **env パーサと変数展開**
   - env セルに以下を入力:
     ```env
     DATABASE=test
     TBL=information_schema.tables
     MSG="hello\nworld"
     ```
   - SQL セルに `SELECT COUNT(*) AS n FROM ${TBL};` を入力
   - `▶ Run` / `Cmd+Enter` で 139 程度の行数が返る(環境により変動)
   - env セル下に `3 variables` のバッジが出る

5. **env パーサのエラー表示**
   - env セルに `BAD LINE` を足すと 赤字で `line N: missing "="` のような警告が出る
   - SQL 実行は正常値のみ使用して動作する(不正行はスキップ)

6. **未定義変数のエラー**
   - env から `TBL` を削除して `Run` すると、結果パネルに `Undefined variable ${TBL} at line 1, col N` が表示される
   - `/api/sql` は呼ばれない(Network タブで確認)

7. **Run All と Cancel**
   - SQL セルを 2〜3 個並べて上部 `▶▶ Run All` をクリック
   - 上から順に実行され、各セル結果が出る
   - 実行中に `■ Cancel (Esc)` または Esc キーで中断

8. **30 秒タイムアウト**
   - 長時間クエリ(例: `SELECT SLEEP(60);`)を実行 → 30 秒経過後に結果に `Timed out`
   - 再度実行するとデフォルトに戻る

9. **Markdown エクスポート**
   - サイドバー行の `↓` でブラウザがダウンロードを開始
   - ファイル名は `<slug>.md`、中身は ``` ```sql ... ``` ``` ブロックを含む生 Markdown

10. **Markdown インポート**
    - `Import` ボタンで `.md` を選択
    - `# 見出し` がタイトルとして採用され、セル配列が再現されて新 id のノートブックが追加

11. **DATABASE 特殊変数**
    - env に `DATABASE=information_schema` を置き、SQL に `SHOW TABLES;` を書く
    - `/api/sql` の `database` フィールドが `information_schema` で送られ、テーブル一覧が返る

## 既知の制約(M3 以降)

- Gist 共有 / OAuth は未実装(M3)
- CSV / Markdown テーブルコピー、1000 行バナー、Reprovision UI は M4
- 削除 Undo Toast、localStorage 容量警告は M4
