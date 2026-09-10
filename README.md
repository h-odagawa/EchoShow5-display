# Echo Show Clock

Echo Show 5（960×480・横向き）のChromeで開く、24時間時計とNHK NEWS WEBの見出しティッカーです。静的サイトとしてGitHub Pagesに公開します。

## 公開方法

1. このリポジトリをGitHubへpushします。標準ブランチを`main`にしてください。
2. GitHubの **Settings → Pages → Build and deployment** で、Sourceを **GitHub Actions** に設定します。
3. Actionsの **Update news and deploy Pages** を`Run workflow`で一度実行します。
4. 表示されたPages URLをEcho ShowのChromeで開きます。

以降、GitHub Actionsは15分ごとにNHKの主要ニュースRSSを取得して`news.json`を生成し、サイトを更新します。RSS取得が失敗した実行は止まり、公開済みのサイトは置き換わりません。

## ローカル確認

Node.js 20以降で実行します。外部パッケージは使いません。

```sh
npm test
npm run fetch-news
python3 -m http.server --directory public 8000
```

`public/news.json`は更新生成物です。最初のローカル表示前に`npm run fetch-news`を実行してください。画面は5分ごとに`news.json`を取得します。ネットワーク障害時にはブラウザの`localStorage`に保存した直近の見出しを表示し続けます。

## ニュース源

NHK NEWS WEBの[主要ニュースRSS](https://www.nhk.or.jp/rss/news/cat0.xml)を使用します。見出し、記事URL、配信時刻のみを扱い、最大20件を表示対象にします。
