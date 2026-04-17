# M6 Smoke Checklist

Project export (`.zip`) を実機確認する手順。`?github=` import の対称となる出力なので、**ラウンドトリップ**(export → GitHub に push → import)が最重要。

```sh
pnpm lint && pnpm test && pnpm build
```

## チェック項目

1. **単一ノートブックの export**
   - Welcome ノートブック 1 つの状態で `Export…` → モーダルが開く
   - Title: `Welcome`(先頭ノートブック名が初期値)、Filename: `welcome.zip`
   - 1 件チェック、`Download (1)` クリック
   - `welcome.zip` がダウンロードされる
   - `unzip -l welcome.zip` → `welcome/project.yaml` と `welcome/welcome.md` の 2 ファイル
   - `project.yaml` に `title: Welcome` と `notebooks: [welcome.md]`
   - `welcome.md` 先頭 frontmatter に `title` のみ(`gist_id` は **無い**)

2. **複数ノートブックの export**
   - `+ New` で 3 ノートブックを作り、▲▼ で好きな順に並べる
   - `Export…` → チェックは全件 ON、Title = 最初の notebook のタイトル(編集可能)
   - `Download (3)` → zip 内のファイル名は **サイドバー順**
   - `project.yaml` の `notebooks:` 配列も同じ順序

3. **部分選択**
   - 3 ノートブック中 1 件だけチェックを外して Download
   - zip には残り 2 件のみ、`project.yaml` も 2 エントリ
   - ボタンラベルが `Download (2)` になっていること

4. **0 件選択の disabled**
   - 全件アンチェック → `Download (0)` が disabled

5. **タイトル衝突のサフィックス**
   - 同じタイトルで 2 ノートブックを作る(Rename で揃える)
   - Export → zip 内ファイル名が `foo.md` と `foo-2.md` に分岐
   - `project.yaml` の `notebooks` も同じサフィックス付き

6. **タイトルカスタマイズ**
   - モーダルの Title フィールドを編集
   - Filename プレビューがそれに合わせて変わる(`my-workshop.zip` など)
   - Download 後のファイル名と zip 内の親フォルダ名が一致

7. **ラウンドトリップ(本番向け)**
   - export した zip を解凍 → public な新 repo に push(例 `tadapin/zero-notebook-export-test`)
   - `http://localhost:8888/?github=<owner>/<repo>` を開く
   - サイドバーに元と同じタイトル・順序で並び、Run も動く
   - GitHub の Web UI からも `project.yaml` と各 `.md` が読める状態

## 既知の制約(M7 以降)

- GitHub への直接 push はまだ無い(ローカル解凍 → 手動 push)
- README.md の自動生成はしない(インポート側は `README.md` を除外する既定挙動なので、欲しければ手動追加)
- zip import(`.zip` をアップロードしてローカルに展開)は未対応 — 対称化したいなら後日
- env/実行結果のスナップショットは zip に含まれない(env は `.md` 内の fenced block としてはそのまま入る)
