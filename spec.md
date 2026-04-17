# SQL ノートブック 仕様書

## 1. 概要

Jupyter Notebook 風の **SQL ノートブック Web アプリケーション**。Markdown をベースとしたノートブックを、ブロック(セル)単位の UI で編集・実行する。SQL の実行基盤には [TiDB Cloud Zero](https://zero.tidbapi.com) を用い、アプリケーションは静的サイトとして Netlify にデプロイする。

### 1.1 主要な機能

- Markdown / SQL / env(変数定義) の 3 種類のセルを持つブロック型エディタ
- セル単位・ノートブック全体での SQL 実行と結果テーブル表示
- ノートブックの複数管理(localStorage)、Markdown ファイルのインポート/エクスポート
- GitHub Gist を用いたノートブックの共有と URL による読み込み
- TiDB Cloud Zero インスタンスの自動プロビジョニングと寿命管理

### 1.2 非スコープ(明示的に作らないもの)

- ユーザー登録・複数アカウント管理(GitHub OAuth は Gist 操作のためだけに利用)
- サーバー側でのノートブックの永続化(Gist が唯一のリモート保存先)
- 実行結果の永続化(結果は Markdown にも localStorage にも書き戻さない)
- リアルタイム共同編集、スキーマブラウザ、クエリビルダ、可視化/グラフ
- モバイル向けレイアウト最適化(デスクトップブラウザを主ターゲット)

---

## 2. 用語

| 用語 | 意味 |
| --- | --- |
| **ノートブック** | Markdown 形式で表現される、SQL セル・env セル・Markdown セルの並び。保存単位。 |
| **セル** | ノートブックを構成する 1 ブロック。`markdown` / `sql` / `env` のいずれかの種別を持つ。Markdown 上はそれぞれ本文または fenced code block に対応。 |
| **インスタンス** | TiDB Cloud Zero が払い出す一時的な TiDB クラスタ。接続文字列と有効期限(30 日)を持つ。 |
| **Zero API** | `https://zero.tidbapi.com` 配下の、インスタンス払い出しと SQL 実行のための HTTP API。 |

---

## 3. システムアーキテクチャ

```
┌─────────────────────────── Browser (SPA) ──────────────────────────┐
│  Svelte UI (CodeMirror 6 for SQL, marked for Markdown)              │
│   ├─ localStorage: notebooks / active id / instance cache / OAuth   │
│   └─ fetch ──────────────────────────────────────────────┐         │
└──────────────────────────────────────────────────────────┼─────────┘
                                                           │
┌──────────────────── Netlify (静的配信 + Functions) ──────┼─────────┐
│  index.html + bundled assets (Vite build output)         │         │
│  Netlify Functions (ESM, netlify/functions/*.mjs)        │         │
│   ├─ POST /api/instance   … TiDB Zero のインスタンス払い出し/再利用│
│   ├─ POST /api/sql        … SQL 実行(Basic認証は Function 内で付与)│
│   └─ POST /api/oauth/token … GitHub OAuth code → access_token 交換 │
└──────────────────────────────────────────────────────────┼─────────┘
                                                           │
                ┌──────────────────────────────────────────┘
                ▼
 ┌─────────────────────────┐   ┌──────────────────────┐   ┌─────────────────┐
 │ zero.tidbapi.com        │   │ http-<host>/v1beta/  │   │ github.com       │
 │ /v1alpha1/instances     │   │ sql                  │   │ login/oauth/     │
 │                         │   │                      │   │ access_token     │
 └─────────────────────────┘   └──────────────────────┘   └─────────────────┘
```

### 3.1 コンポーネントの責務

- **Browser (SPA)**: すべての UI 状態、ノートブックの編集、変数展開、結果レンダリング。TiDB や GitHub への通信は Netlify Functions 経由でのみ行う。
- **Netlify Functions**: (a) 認証情報(GitHub client secret)を隠蔽するための OAuth プロキシ、(b) ブラウザから直接叩くと CORS / 認証情報管理が面倒な TiDB Zero API の薄いプロキシ。ビジネスロジックは持たない。
- **TiDB Cloud Zero**: SQL 実行エンジン。30 日で失効する。
- **GitHub Gist API**: ノートブック共有時のリモート保存先。

---

## 4. ノートブックのデータモデル

### 4.1 物理形式 (Markdown)

ノートブックは 1 つの Markdown テキストとして保存される。セル種別は Markdown の構造に 1 対 1 対応する。

| セル種別 | Markdown 上の表現 |
| --- | --- |
| `markdown` | fenced code block 以外のすべての連続した行。 |
| `sql` | 言語指定が `sql` の fenced code block。 |
| `env` | 言語指定が `env` の fenced code block。 |

パース時には **上から順にブロックを走査し、言語指定付き fenced code block を 1 つのセルとし、その間の(空行を含む)テキストを Markdown セルとする**。空の Markdown セルは無視する(保持しない)。

ノートブックの先頭に YAML フロントマターを置いてメタデータを表現できる(任意):

```markdown
---
title: My Notebook
gist_id: abc123def456    # 紐づく Gist がある場合のみ
---
```

フロントマターがない場合、`title` はノートブック内最初の `#` 見出しから推測し、見つからなければ `Untitled`。

### 4.2 論理モデル (メモリ上の型)

```ts
type Notebook = {
  id: string;              // UUID v4。localStorage 内の一意キー。
  title: string;
  cells: Cell[];
  gistId?: string;         // 紐づく Gist。共有/更新に使用。
  createdAt: string;       // ISO8601
  updatedAt: string;       // ISO8601
};

type Cell =
  | { id: string; type: 'markdown'; source: string }
  | { id: string; type: 'sql';      source: string }
  | { id: string; type: 'env';      source: string };
```

`id` はセル単位の React/Svelte のキーとして使うためのランタイム ID で、Markdown にシリアライズする際には書き出さない。

### 4.3 シリアライズ規則

- ラウンドトリップ(Markdown → 論理 → Markdown)で意味的に等価な結果になること。
- 連続する Markdown セルは結合してよい(パーサが分割しないので実用上はほとんど 1 つ)。
- fenced code block のデリミタは **3 連バッククォート** で統一。本文に ``` ``` ``` が含まれるときのみ 4 連以上に拡張する。

---

## 5. 編集 UI: セル方式

```
┌─ [md]  # 見出し                        [✎] [×]
│
├─ [env] KEY=VALUE                        [✎] [▲▼] [×]
│
├─ [sql] SELECT ... ;              [▶ Run] [▲▼] [×]
│  ┌─ Result (elapsed 12ms, 3 rows) ─────┐
│  │ id │ name │ created_at               │
│  └──────────────────────────────────────┘
│
└─ [+ md] [+ sql] [+ env]
```

### 5.1 セル共通

- **追加**: ノートブック末尾のフッターにある `[+ md] [+ sql] [+ env]` ボタン、またはセル間のホバーでのインラインボタン。
- **削除**: 各セル右上の `[×]`。確認ダイアログなしで削除し、直後に Toast 上で Undo を提示する(5 秒)。
- **並び替え**: `[▲▼]` ボタン、または将来的にドラッグ&ドロップ。
- **フォーカス**: セル本体のクリックで編集モードへ。Markdown セルは編集モードでテキストエリア、非フォーカス時は marked によるプレビュー表示。

### 5.2 SQL セル

- エディタは **CodeMirror 6 + `@codemirror/lang-sql`**。TiDB の SQL 方言は MySQL モードで近似する。
- 行番号表示、最低 3 行・最大 30 行の高さを自動調整。
- 右上の `[▶ Run]` ボタンと `Cmd/Ctrl+Enter` ショートカットで実行。
- 結果は同じセル直下のパネルに表示する(保存はしない)。再実行で上書き。

### 5.3 env セル

- UI は行ベースのキー/値エディタか、`KEY=VALUE` をそのまま書ける単純な textarea のいずれか。**初期実装では textarea ベース**(Markdown のソースに素直に一致するため)。
- 1 行 1 変数。構文:

  ```
  # コメント行は # で始まる
  KEY=VALUE
  QUOTED="spaces ok"
  ```

- 構文規則:
  - `KEY` は `[A-Za-z_][A-Za-z0-9_]*`。
  - `=` の前後の空白は無視しない(`K =v` は `K ` という不正キーなのでエラー)。
  - 値はダブルクォートで囲った場合のみ、前後の空白を保持し、`\\` / `\"` / `\n` / `\t` のエスケープを解釈する。
  - 囲っていない場合は `\n` まで / 行末のコメント `# ...` までをそのまま値とし、前後の空白はトリムする。
- 不正な行があればその行番号と理由をセル下に警告表示し、**正常な行だけをマージ対象にする**(セル全体を捨てない)。

### 5.4 Markdown セル

- プレビューレンダリングには [`marked`](https://github.com/markedjs/marked) を使用。
- HTML サニタイズは [`DOMPurify`](https://github.com/cure53/DOMPurify) で実施。Gist からインポートする Markdown も同じ経路で描画されるため必須。
- コードブロック(`sql`/`env` 以外)もハイライトして表示してよい(Prism.js または highlight.js 相当)。必須ではない。

### 5.5 ノートブック全体のツールバー

| 操作 | 場所 | ショートカット |
| --- | --- | --- |
| `[▶▶ Run All]` | ツールバー左 | なし |
| `[■ Cancel]` | 実行中のみ表示 | `Esc` |
| 保存(ローカル) | 自動(デバウンス 500ms) | `Cmd/Ctrl+S` で強制保存 |
| 名前変更 | タイトル部分クリックで編集 | - |
| エクスポート .md | ツールバー右 `[…]` メニュー | - |
| インポート .md | サイドバー新規メニュー | - |
| Share via Gist | ツールバー右 | - |
| Update Gist | ツールバー右(`gistId` がある時のみ) | - |
| 接続情報表示 / Reprovision | トップバー右 | - |

---

## 6. 変数と展開

### 6.1 スコープとマージ

- すべての `env` セルは **ノートブック全体で 1 つのグローバル変数空間** を共有する。
- 有効な変数セットは以下のアルゴリズムで決まる:
  1. ノートブック内の `env` セルを **上から順に** 列挙する。
  2. 各セルの中身を行順にパースし、変数を dict に追加する。同名キーは **後勝ち**(上書き)。
- この変数セットは **SQL セル実行のたびに再計算**する。実行順ではなく **ノートブックの文書順**に基づくため、実行順序に依存しない(Jupyter との重要な差分)。

### 6.2 展開構文

- SQL セル内の `${VAR}` をキー `VAR` の値に置換する。`${` と `}` の間に許される文字は §6.1 の `KEY` と同じ(`[A-Za-z_][A-Za-z0-9_]*`)のみ。マッチしない `${...}` はエラーではなく **そのまま残す**(例: `${1abc}` は SQL にそのまま渡り、TiDB 側の構文エラーになる)。
- 置換は **テキスト置換**であり、SQL の文字列リテラル内・コメント内であっても区別せず置換する(プリプロセッサ的挙動)。
- **エスケープ構文は持たない**。`$` は常にリテラル、`${VAR}` だけが置換の対象。`${` をリテラルとして SQL に書く方法は提供しない(TiDB の SQL では事実上不要なため)。

### 6.3 未定義変数

- `${VAR}` が解決できない場合は **SQL を Zero に送る前にクライアント側でエラー**とし、該当セルの結果パネルに「未定義変数: `VAR`」とその出現位置(行・列)を表示する。
- 実行は発火しない(`/api/sql` には届かない)。

### 6.4 特殊変数

| 変数 | 役割 | デフォルト |
| --- | --- | --- |
| `DATABASE` | SQL 実行時に `TiDB-Database` ヘッダとして送る値 | `test` |

- `DATABASE` も通常の env 変数と同じく `${DATABASE}` として SQL 内で展開できる。
- SQL 内に `USE db;` を書いた場合の効果は単一文内に閉じる(セルをまたがない)。複数文にわたってスキーマを切り替えたい場合は `DATABASE` を使うこと。

---

## 7. SQL 実行

### 7.1 実行単位と順序

- **単一セルの実行**: `[▶ Run]` または `Cmd/Ctrl+Enter`。フォーカス中の SQL セルを実行する。Markdown/env セルにフォーカス中でショートカットを押した場合は無視。
- **Run All**: ノートブック内の SQL セルを文書順に 1 つずつ逐次実行する。1 つでも失敗したら以降を中止し、エラーを出したセルで停止する。
- 複数セルの並列実行は行わない(Zero インスタンスは単一のため、実用上の意味がない)。

### 7.2 1 セル内の複数文

- セル内のソースを `;` で分割し、順に `/api/sql` に送る。
  - 分割ロジックは素朴: `--` 以降の行コメントを除去してから `;` で split する。`/* */` 形式ブロックコメントや文字列リテラル内の `;` は考慮しない(ref 実装と同じ制限)。初期実装ではこれで運用する。
- 結果パネルの表示規則:
  - 最後の文が SELECT(`types` と `rows` を返す): それをテーブルとして表示。
  - 最後の文が DML(`rowsAffected` のみ): 影響行数と、中間文も含むサマリ一覧を表示。

### 7.3 キャンセルとタイムアウト

- クライアント側で `AbortController` を持ち、ユーザーの `[■ Cancel]` / `Esc` で `fetch` を中断する。
- デフォルトタイムアウトは **30 秒**。到達したらクライアントから中断し、「タイムアウト」として結果パネルに表示。
- 中断は **クライアント側の待機を終わらせる** ことしか保証しない。TiDB 側のクエリは実行され続けうるため、その旨を UI に注記する。

### 7.4 エラー表示

- HTTP 4xx/5xx、ネットワーク失敗、TiDB 返却エラーのいずれも、セル直下の結果パネルに赤色で表示する。
- TiDB のエラーレスポンス(SQL syntax error 等)はメッセージをそのまま表示。
- インスタンスの期限切れが疑われる HTTP 401/403 の場合は「Reprovision が必要かもしれません」のヒントを併記する。

---

## 8. 結果の表示

### 8.1 テーブル描画

- カラム名と型(Zero API の `types[i].name` / `types[i].type`)をヘッダーに表示。
- 数値型(int/float/decimal 系)は右寄せ、それ以外は左寄せ。
- `NULL` は `null` とイタリック + グレーで表示。
- メタ行に「elapsed: Xms, N rows (of M)」を表示。

### 8.2 大きな結果

- 返却された行数が **1,000 行を超える場合、最初の 1,000 行のみレンダリング**し、下部に「残り K 行は表示されていません。`LIMIT` の付加を検討してください」のバナーを表示する。
- ダウンロードは切り詰めずに全行が対象(ブラウザのメモリ上にはある)。

### 8.3 結果の持ち出し

- **CSV ダウンロード**: RFC 4180 準拠。カラム名を先頭行に含める。ファイル名は `<notebook-title>_<cellIndex>_<YYYYMMDD-HHMMSS>.csv`。
- **Markdown テーブルとしてクリップボードにコピー**: `| col1 | col2 |` 形式。セル内改行は `<br>` に置換。
- ソートや列フィルタはスコープ外。

---

## 9. TiDB Cloud Zero 連携

### 9.1 インスタンスの所有モデル

- **1 ブラウザにつき 1 インスタンスを共有**する。ノートブックごとにインスタンスを分けない。
- 初回ロード時、localStorage にインスタンス情報がなければプロビジョニング API を叩く。その後はキャッシュヒット。
- インスタンスは 30 日の TTL を持つ。期限まで 5 分を切った時点で期限切れと扱い、自動で再プロビジョニングする。

### 9.2 localStorage 上の保存内容

```json
// key: "tidb-zero-instance-v1"
{
  "connectionString": "mysql://USER:PASS@HOST:4000/test",
  "expiresAt": "2026-05-17T00:00:00Z",
  "claimInfo": { "claimUrl": "https://..." }  // 任意
}
```

- `connectionString` から `{host, username, password, database}` をクライアント側で分解し、`/api/sql` 呼び出し時に渡す。
- DB 名は env の `DATABASE` で上書きされる(接続文字列の path は使わない)。

### 9.3 UI

- トップバーに `[● connected / expires in N days]` インジケータを表示。
- クリックすると接続情報モーダルを開き、接続文字列・有効期限・Claim URL(あれば) を表示。
- モーダルには `[Reprovision]` ボタンがあり、押下で `/api/instance` に `{ "force": true }` を送って新しいインスタンスを取得、localStorage を上書きする(古いインスタンスのデータは失われる旨を確認ダイアログで警告)。
- 有効期限まで 1 日を切ったら警告バナーを表示。

### 9.4 スプラッシュ/初回体験

- 初回または期限切れ時、画面全体をスプラッシュで覆い「Provisioning…」を表示。完了後にフェードアウトして通常の UI へ遷移する(ref 実装と同じ体験)。
- プロビジョン失敗時はエラーメッセージと `[Retry]`。

---

## 10. ローカル保存

### 10.1 localStorage のキー一覧

| キー | 内容 |
| --- | --- |
| `notebooks-v1` | `Record<id, Notebook>`(または `Notebook[]`) |
| `active-notebook-id-v1` | 現在開いているノートブックの id |
| `tidb-zero-instance-v1` | インスタンスのキャッシュ(§9.2) |
| `github-oauth-v1` | GitHub OAuth の access_token と scope(§12.1) |
| `ui-prefs-v1` | UI 側のソフト設定(バナー既読など) |

### 10.2 保存タイミング

- 編集のたびにインメモリ状態を更新し、**500ms のデバウンスで localStorage に書き出す**。
- `Cmd/Ctrl+S` で即時書き出し + Toast 表示。
- タブを閉じる `beforeunload` でも書き出す(デバウンスの未フラッシュ対策)。

### 10.3 インポート / エクスポート

- **エクスポート**: ツールバーから `Download .md`。YAML フロントマター付きの Markdown をブラウザダウンロードとして保存。ファイル名は `<title>.md`(slug 化)。
- **インポート**: サイドバーの `[+ New] > [Import from file…]`。`.md` を読み込み、パースしてから **新しい id で作成**する(同名でも上書きしない)。
- ノートブック一覧に「複製」操作も提供する(現在のノートブックの `id` 以外を維持して別 id で保存)。

---

## 11. ノートブック管理 UI

### 11.1 サイドバー(左)

```
┌─ Notebooks ──────────────────┐
│  [+ New]  [+ Import .md]     │
│  ┌──────────────────────────┐│
│  │ ● My Notebook            ││
│  │   Updated 2m ago         ││
│  ├──────────────────────────┤│
│  │   Weekly Report          ││
│  │   Updated yesterday      ││
│  ├──────────────────────────┤│
│  │   (Shared) …Alice's demo ││
│  │   read-only              ││
│  └──────────────────────────┘│
└──────────────────────────────┘
```

- 最終更新時刻でソート、デフォルトは降順。
- 各行の右クリック(またはケバブメニュー)で **Rename / Duplicate / Export / Delete**。
- 共有 URL で開かれた読み取り専用ノートブックは一覧では特別扱いし、`(Shared)` バッジ付きで **「Copy to My Notebooks」** 操作が前面に出る。

### 11.2 ノートブック切り替え

- アクティブセル・編集中テキスト・実行結果は **ノートブックを閉じた瞬間に捨てる**(結果は永続化しない方針の帰結)。
- 未保存変更の概念はない(常にデバウンス保存されているため)。

---

## 12. 共有: Gist 連携

### 12.1 認証フロー

標準的な GitHub OAuth App の Web フローを採用する。`client_secret` を秘匿するため、code→token 交換のみ Netlify Function で行う。

```
 1. [Share] クリック
 2. window.location → https://github.com/login/oauth/authorize
        ?client_id=XXX
        &scope=gist
        &redirect_uri=<app>/oauth/callback
        &state=<random>
 3. GitHub → <app>/oauth/callback?code=...&state=...
 4. ブラウザが POST /api/oauth/token { code }
 5. Function が client_secret 付きで GitHub にアクセス、access_token を取得して返す
 6. localStorage に { access_token, scope, obtained_at } を保存
 7. 元のノートブック画面に復帰し Share ダイアログを続行
```

- 必要スコープは **`gist` のみ**。
- `state` は CSRF 対策として `sessionStorage` に保持しコールバックで照合。
- ログアウト: ユーザーメニューに `Disconnect GitHub`。localStorage の token を削除するのみ(GitHub 側の revoke API 呼び出しは任意/スコープ外)。

### 12.2 Gist のレイアウト

1 つの Gist に 1 つのノートブックを対応させる。Gist のファイル構成:

| ファイル名 | 内容 |
| --- | --- |
| `notebook.md` | ノートブック本体(YAML フロントマター付き Markdown) |

`description` は `Notebook.title` とする。

### 12.3 作成・更新・共有

- **Share(初回)**: `POST https://api.github.com/gists` で **secret gist(`public: false`)** を作成。返却の `id` を `Notebook.gistId` に保存し、同時に localStorage も更新。共有ダイアログに `https://<app>/?gist_id=<id>` を表示してコピー。
- **Update**: `Notebook.gistId` が既にあるノートブックでは `[Share]` ではなく `[Update Gist]` を表示する。`PATCH /gists/:id` で `notebook.md` を上書き。
- **Fork 相当(他人の Gist からのコピー)**: §12.5 を参照。
- 公開/非公開の切り替え UI は提供しない(常に secret で作成)。ユーザーは GitHub 側で必要なら変更できる。

### 12.4 URL パラメータによる読み込み

- `https://<app>/?gist_id=<id>` で起動されたとき:
  1. `GET https://api.github.com/gists/:id` を **未認証で** 呼ぶ(public gist または secret gist + URL を知っている場合にのみ読める)。
  2. `notebook.md` を取得・パースしてメモリ上のノートブックとしてマウントする。
  3. 画面には `(Shared) <title>` とバッジを出し、セルは **編集不可(読み取り専用)**、Run は **可能**(自分の TiDB インスタンスに対して実行される)。
  4. ツールバーに `[Copy to My Notebooks]` を目立つボタンとして配置。押下で新しい `id` を振って localStorage に保存し、以後は通常の編集可能ノートブックとして扱う。
- `gist_id` で開いた状態では、サイドバーの他ノートブックには自由に切り替えられる(戻ると再度 Gist を取り直す)。

### 12.5 エッジケース

- 同じ `gist_id` を既に自分が所有している場合(`localStorage` 内のノートブックの `gistId` と一致): 読み取り専用で開くのではなく、その自分のノートブックをそのまま開く。
- OAuth 未ログイン状態で `[Share]` を押した場合、認証フローに入り、完了後に共有を続行する。
- Gist 取得 401/404 は「存在しない、または非公開の Gist です」と表示。

---

## 13. Netlify Functions API 仕様

すべて ESM(`netlify/functions/*.mjs`)で実装する。`api/*.js`(Vercel 互換)は採用しない。

### 13.1 `POST /api/instance`

| | |
| --- | --- |
| Request | `{ "force"?: boolean }` |
| Response 200 | `{ "connectionString": string, "expiresAt": string (ISO8601), "claimInfo"?: { claimUrl: string } }` |
| Response 5xx | `{ "error": string }` |

- モジュールスコープの `cached` を保持。`force === true` ならキャッシュを破棄して再プロビジョニング。
- 期限まで 5 分を切ったら自動再プロビジョニング。
- 認証は行わない(パブリックに露出する前提で、濫用抑止は上流 Zero API 側に依存)。

### 13.2 `POST /api/sql`

| | |
| --- | --- |
| Request | `{ host: string, username: string, password: string, database?: string, query: string }` |
| Response | TiDB Zero API のレスポンスをそのまま返す |

- `Authorization: Basic base64(username:password)` を Function 内で組み立てる(ブラウザから Basic 認証ヘッダを直送しないのは CORS と履歴漏洩を避けるため)。
- `TiDB-Database` ヘッダに `database || 'test'` を設定。
- タイムアウトは Netlify Function 側でも 26 秒(クライアントのデフォルト 30 秒より短く)とし、どちらが先に切れても握りつぶさない。

### 13.3 `POST /api/oauth/token`

| | |
| --- | --- |
| Request | `{ code: string }` |
| Response 200 | `{ access_token: string, scope: string, token_type: "bearer" }` |
| Response 4xx/5xx | `{ error: string }` |

- 環境変数: `GITHUB_OAUTH_CLIENT_ID`, `GITHUB_OAUTH_CLIENT_SECRET`。
- `code` と `client_id`/`client_secret` を `https://github.com/login/oauth/access_token` に POST し、`Accept: application/json` で受ける。

### 13.4 CORS / ヘッダ

- すべての Function レスポンスに `Content-Type: application/json` を付与する。
- `netlify.toml` で静的配信部分に `Access-Control-Allow-Origin: *` を設定している既存設定を踏襲する。Function は同一オリジンから呼ばれる想定なので実質不要だが、上書きはしない。

---

## 14. 技術スタックとディレクトリ構成

### 14.1 スタック

- **ビルド**: Vite 5+
- **言語**: TypeScript(strict)
- **UI フレームワーク**: Svelte 4 以降
- **SQL エディタ**: CodeMirror 6(`@codemirror/lang-sql`, `@codemirror/theme-one-dark` 等)
- **Markdown**: `marked` + `DOMPurify`
- **アイコン**: Lucide (svelte port)
- **フォーマッタ/リンタ**: Prettier、ESLint(typescript-eslint、eslint-plugin-svelte)
- **テスト**:
  - ユニット: Vitest(Markdown パーサ、env パーサ、変数展開、CSV 生成などの純粋ロジック対象)
  - E2E は当面ナシ。必要になれば Playwright を検討。

### 14.2 ディレクトリ構成(案)

```
/
├── index.html
├── package.json
├── vite.config.ts
├── tsconfig.json
├── netlify.toml
├── src/
│   ├── app/               # Svelte コンポーネント(App.svelte, Notebook.svelte, Sidebar.svelte, Cell/* など)
│   ├── editor/            # CodeMirror 初期化ラッパ
│   ├── lib/
│   │   ├── notebook/      # Markdown ↔ Notebook のパーサ/シリアライザ
│   │   ├── env/           # env セルのパーサ、変数展開、未定義検出
│   │   ├── execute/       # /api/sql 呼び出し、タイムアウト、キャンセル
│   │   ├── instance/      # /api/instance 呼び出しと localStorage キャッシュ
│   │   ├── gist/          # GitHub Gist API クライアント
│   │   └── storage/       # localStorage ラッパ(スキーマバージョニング)
│   └── main.ts
├── netlify/
│   └── functions/
│       ├── instance.mjs
│       ├── sql.mjs
│       └── oauth-token.mjs
└── ref/                    # 既存のサンプル実装(読み取り専用)
```

### 14.3 ビルド / 開発コマンド(初期実装時に定義)

- `npm run dev` … Vite dev server + Netlify CLI(`netlify dev`)で Functions もプロキシ。
- `npm run build` … Vite プロダクションビルドを `dist/` へ。
- `npm run preview` … ビルド結果のローカルプレビュー。
- `npm run test` … Vitest。
- `npm run lint` / `npm run format`。

`netlify.toml` の `[build]` は `publish = "dist"`、`command = "npm run build"`、`functions = "netlify/functions"` に変更する(ref と異なる点)。

---

## 15. セキュリティ

- **GitHub client_secret** は Netlify 環境変数に格納し、クライアントバンドルには含めない。
- **XSS**: Markdown レンダリングは必ず DOMPurify 経由。SQL 結果のセル値は **常にテキストとしてエスケープ**して DOM に挿入する(innerHTML 経由の注入を作らない)。
- **TiDB 認証情報**: 接続文字列は localStorage に平文で保存する(同一ブラウザ上の他スクリプトから読める前提)。秘匿情報としての強度は Zero インスタンスの 30 日 TTL と `http-<host>` の非推測性に依存する。これ以上の保護はスコープ外。
- **OAuth state** は `sessionStorage` に保持し、コールバック後に削除する。
- **CSP**: 初期はゆるめに設定する(インラインスタイル・フォント CDN・api.github.com 等への `connect-src` を許可)。リリース前に `netlify.toml` の `[[headers]]` で明示する。
- **レートリミット**: 実装しない。悪用は Netlify/TiDB Zero/GitHub 側の上限に委ねる。

---

## 16. エラー処理とデグラデーション

| 状態 | 挙動 |
| --- | --- |
| TiDB インスタンスのプロビジョニング失敗 | スプラッシュにエラー表示 + `[Retry]`。ノートブック編集 UI は無効のまま(ノートブックが見えても Run できないのは混乱するため)。 |
| 既存インスタンスが期限切れ/401/403 | 次回 Run 時にバックオフ無しで 1 回再試行し、それでも失敗なら Reprovision を案内するモーダル。 |
| `/api/sql` のネットワーク失敗 | セル直下にエラー + `[Retry]`。ノートブック全体は壊さない。 |
| Gist API 失敗 | ダイアログでエラーメッセージ。ノートブックのローカル状態は保持。 |
| localStorage 容量不足 | 保存失敗を Toast 通知。最古の非アクティブノートブックの削除を提案するダイアログを出す(自動削除はしない)。 |
| OAuth トークン失効(401) | 次回 Gist 操作で検知 → 再認証フローに誘導。 |

---

## 17. 想定外に扱わない(将来検討)

- 実行結果の Markdown 書き戻し(現状の方針では保存しない)。実装するなら ```result ブロックを検討。
- ノートブックのタグ付け、全文検索。
- 他人の Gist 編集/Fork。
- 複数ノートブックの同時タブ表示。
- スキーマエクスプローラ、テーブル一覧、カラムの型情報表示。
- テーマ切替(ref と同じダーク基調で固定してよいが、CSS 変数で将来の切替余地を残す)。
- 結果の可視化(グラフ)。
- モバイル最適化。
- リアルタイム共同編集。

---

## 18. マイルストーン案

1. **M1 — ローカルノートブック MVP**
   - Vite + Svelte + CodeMirror のスケルトン
   - Markdown ⇔ Notebook パーサ/シリアライザ
   - セル UI(md/sql/env)と追加・削除・並び替え
   - `/api/instance` と `/api/sql` を ref からポート、Run 単体セル実行
   - 単一ノートブックだけ、localStorage 保存あり

2. **M2 — マルチノートブック + env 完全対応**
   - サイドバー、複数ノートブック、インポート/エクスポート
   - env パーサと変数展開、未定義エラー、`DATABASE` 対応
   - Run All、Cancel、タイムアウト

3. **M3 — 共有**
   - `/api/oauth/token` と GitHub OAuth フロー
   - Gist 作成・更新・読み取り専用モード
   - `?gist_id=` による外部起動と「Copy to My Notebooks」

4. **M4 — 仕上げ**
   - 結果の CSV/Markdown コピー、1000 行制限バナー
   - 接続情報モーダル、Reprovision
   - エラー処理の網羅、CSP、リリースチェックリスト
