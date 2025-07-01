# ぷよぷよもどき

Next.js + React + Tailwind CSS で作った「ぷよぷよ」風落ち物パズルゲームです。

![screenshot](./public/screenshot.png)

## 遊び方
- 画面上部から2つ1組のカラフルなぷよが落ちてきます。
- 同じ色のぷよが縦横に4つ以上つながると消えます。
- 連鎖も自動で発生します。
- ぷよが積み上がって動かせなくなるとゲームオーバーです。

## 操作方法
- **← →**：左右に移動
- **↓**：高速落下
- **Z または ↑**：回転
- **リトライボタン**：ゲームリセット

## 技術構成
- [Next.js 15 (App Router)](https://nextjs.org/)
- [React 18](https://react.dev/)
- [Tailwind CSS](https://tailwindcss.com/)
- TypeScript
- SVGによるぷよ描画（画像素材不要）

## 開発・起動方法
```bash
# 依存インストール
npm install

# 開発サーバー起動
npm run dev

# ブラウザで http://localhost:3000 を開く
```

## ディレクトリ構成
- `src/app/page.tsx` ... ゲーム本体
- `src/app/globals.css` ... スタイル
- `public/` ... 静的ファイル

## ライセンス
MIT

---

> このアプリは公式「ぷよぷよ」とは関係ありません。個人学習・デモ用です。
