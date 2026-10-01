# 訪日外客数 × 気候データ ダッシュボード

JNTO の訪日外客数データと気候データ（平均気温・降水量）を可視化するインタラクティブ・ダッシュボードです。
Plotly.js で地図・散布図・時系列・EEMD 分解などを描画します。

## ファイル構成（すべて同じフォルダに置いてください）

```
index.html   ← ページ本体。このファイルを開きます
style.css    ← デザイン（CSS）
data.js      ← データ本体（訪日客数・気温・降水量）
main.js      ← 描画・計算ロジック
.nojekyll    ← GitHub Pages の Jekyll 処理を無効化
README.md
```

> ⚠️ **重要**：5つのファイルは**同じ階層（同じフォルダ）**に置いてください。
> `index.html` は `style.css` / `data.js` / `main.js` を同じフォルダから読み込みます。
> サブフォルダに分けると読み込みに失敗し、**デザインが崩れた素の HTML 表示**になります。

もともと 1 ファイル（約 2.5 MB）に全部入っていたものを、GitHub で扱いやすいように分割したものです。
データは約 2.5 MB と大きいため `data.js` として分離しています。

## ローカルで開く

`index.html` をブラウザで開くだけで動作します（サーバー不要）。
※ Plotly.js は CDN から読み込むため、表示にはインターネット接続が必要です。

ローカルサーバー経由で見たい場合:

```bash
python3 -m http.server 8000
# → http://localhost:8000/index.html
```

## GitHub Pages で公開する手順（おすすめ）

1. GitHub で **＋ → New repository** から新規リポジトリを作成（例: `visit-japan-dashboard`、Public）
2. リポジトリの画面で **Add file → Upload files**
3. **5つのファイルをまとめて選択**してドラッグ＆ドロップ
   （`index.html` / `style.css` / `data.js` / `main.js` / `.nojekyll` / `README.md`）
   - フォルダを作らず、**すべてリポジトリ直下**に置きます
4. **Commit changes** をクリック
5. **Settings → Pages** を開く
6. Source を `Deploy from a branch`、Branch を `main` ＋ フォルダを `/ (root)` にして **Save**
7. 1〜2 分待つと、以下で公開されます

```
https://<ユーザー名>.github.io/<リポジトリ名>/
```

### うまく表示されないときのチェック

- `style.css` がリポジトリ直下にあるか（`css/style.css` になっていないか）
- ファイル名の大文字・小文字が一致しているか
- 公開直後は反映に 1〜2 分かかることがあります（再読み込み / スーパーリロード）

### コマンドライン（git）でアップロードする場合

```bash
git init
git add .
git commit -m "Add visit Japan dashboard"
git branch -M main
git remote add origin https://github.com/<ユーザー名>/<リポジトリ名>.git
git push -u origin main
```

## データ出典

- 訪日外客数: JNTO（日本政府観光局）訪日外客数データ
- 年平均気温 / 月平均気温: [Our World in Data](https://ourworldindata.org/grapher/average-annual-surface-temperature)
- 平均年間降水量: [World Bank](https://data.worldbank.org/indicator/AG.LND.PRCP.MM)

## データを更新する場合

`data.js` の `annualData` / `monthlyData` を書き換えてください。
HTML やロジックを触らずにデータだけ差し替えられます。
