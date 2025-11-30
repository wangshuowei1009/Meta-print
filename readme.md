# Metaprint – 3DモデルNFTの作成・取引プラットフォーム

Metaprint は、**Solana** をベースにした「3DプリントモデルNFT」を扱う実験的なプロジェクトです。  
本プロジェクトは次の 3 つのレイヤーで構成されています：

- **ブロックチェーン層**：Solana + Metaplex Auction House + Irys（Arweave 永続ストレージ）
- **フロントエンド（DApp）**：ブラウザ + Phantom ウォレット
- **バックエンド**：Firebase Functions（Node.js）+ Firestore

目的：  
クリエイターが 3D モデルファイルをアップロードし、NFT を mint し、Auction House に出品できるようにすること。  
ユーザーはブラウザからウォレットを接続し、NFT の表示・検証・購入ができる。

---

## 🧱 アーキテクチャ概要

### 1. ブロックチェーン & ストレージ層

- **Solana Devnet**
  - NFT の mint
  - Metaplex Auction House の出品 / キャンセル / 購入
- **Metaplex**
  - `mpl-token-metadata`：NFT メタデータ管理
  - Auction House SDK：出品（List）・取消（Cancel）・購入（Buy）
- **Irys / Arweave**
  - STL / OBJ / 3MF などの 3D モデルファイルのアップロード
  - プレビュー画像・アニメーションなども保存
  - `https://gateway.irys.xyz/...` の永続URLを NFT metadata として使用

---

## 2. フロントエンド（DApp）

ブラウザ上で動作するフロントエンド JavaScript で、主な機能：

- **Phantom ウォレット接続**
- Irys を使ったファイルアップロード & コスト見積もり
- Umi + Metaplex による **NFT の mint（作成）**
- `/api/nft/verify` を呼び出して NFT を Collection に紐付けるトランザクションを取得し、  
  → Phantom で署名して送信
- ウォレットが所有している NFT を取得し、  
  指定コレクション（Metaprint Collection）の NFT のみをフィルタリング
- Metaplex Auction House を利用した：
  - 出品（List）
  - 出品取消（Unlist）
  - 購入（Buy）
- Auction House に基づく listing 状態の表示

> フロントエンドは HTML + JS ベースで、ページのボタンに `addEventListener` で機能を割り当てています。

---

## 3. バックエンド（Firebase Functions）

Firebase Cloud Functions の Node.js バックエンドは主に 2 つの役割：

### ① 定期的に Auction House のトランザクションをスキャン

- 5 分ごとに Pub/Sub 実行
- 取引を取得し、Metaplex の指令（sell / cancel / buy など）を解析
- Firestore に反映：
  - `activeListings`：現在有効な listingReceipt の一覧
  - `settings/lastSignature`：最後に処理したトランザクションの署名（次回の差分取得用）

### ② フロントエンド用 API 提供

- `POST /api/nft/verify`
  - mint とユーザーの公開鍵を受け取り
  - backend signer（コレクション権限）で `verifyCollection` トランザクションを作成
  - fee payer をユーザーに設定
  - Base64 形式のシリアライズ済みトランザクションを返す  
    → フロントエンドが Phantom で署名して送信する

- `GET /api/nft/activeListings`
  - Firestore の activeListings を返す
  - 現在出品中の NFT をフロントに表示できる

---

## 🔄 ユーザーフロー（シンプル版）

1. **ウォレット接続**  
   「Connect Phantom」を押して Devnet ウォレットを接続。

2. **3D モデルをアップロードして NFT を作成**
   - 名前 / 説明 / 手数料 / 外部URLなどを入力
   - STL / OBJ / 3MF / プレビュー画像などを選択
   - 「Estimate」で Irys アップロードコストを見積もる
   - 「Create NFT」で Irys にファイルをアップ → metadata を生成 → Solana に NFT を mint

3. **NFT の Collection 検証（verify）**
   - フロントエンドが `/api/nft/verify` を呼ぶ
   - backend から返ってきたトランザクションを Phantom で署名
   - NFT がコレクションに正式登録される

4. **出品 / キャンセル / 購入**
   - 出品：Metaplex SDK で Auction House に listing
   - キャンセル：receipt を指定して取消
   - 購入：receipt を指定して buy
   - バックエンドが定期的に activeListings を同期

---

## 🧰 使用技術

### ブロックチェーン
- Solana Devnet  
- Metaplex Token Metadata / Auction House  
- Irys（Arweave 永続ストレージ）

### フロントエンド
- Phantom Wallet Adapter  
- @solana/web3.js  
- @metaplex-foundation/umi  
- @metaplex-foundation/mpl-token-metadata  
- @metaplex-foundation/js（Auction House）

### バックエンド
- Firebase Cloud Functions  
- Firestore  
- Express + CORS  
- @solana/web3.js  
- @metaplex-foundation/umi  
- bs58 などの補助ライブラリ

---

