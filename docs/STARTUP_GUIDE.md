# Meals3 アプリ起動ガイド

## 前提条件

1. **Node.jsとnpmがインストールされていること**
2. **Expoアプリがスマートフォンにインストールされていること**
   - iOS: App Storeから「Expo Go」をダウンロード
   - Android: Google Playから「Expo Go」をダウンロード

## 初回セットアップ

### 1. 依存関係のインストール

```bash
cd /Users/ironcandle1208/Documents/project/meals3
npm install --legacy-peer-deps
```

### 2. 環境変数の設定

`.env`ファイルにSupabaseの認証情報を設定:

```
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 3. データベースマイグレーションの実行

`docs/MIGRATION_GUIDE.md`を参照してSupabaseでマイグレーションを実行してください。

## アプリの起動方法

### 方法1: 開発サーバーの起動（推奨）

```bash
npm start
```

起動後:
1. ターミナルにQRコードが表示されます
2. スマートフォンのExpo Goアプリでスキャン
3. アプリが起動します

### 方法2: iOSシミュレーターで起動

```bash
npm run ios
```

### 方法3: Androidエミュレーターで起動

```bash
npm run android
```

### 方法4: Webブラウザで起動

```bash
npm run web
```

## トラブルシューティング

### エラー: "Cannot find module 'babel-preset-expo'"

```bash
npm install babel-preset-expo --save-dev --legacy-peer-deps
```

### エラー: "ERESOLVE could not resolve"

依存関係の競合エラーです。`--legacy-peer-deps`フラグを使用:

```bash
npm install --legacy-peer-deps
```

### エラー: "Metro bundler failed"

キャッシュをクリア:

```bash
npx expo start --clear
```

### エラー: Supabase接続エラー

1. `.env`ファイルが正しく設定されているか確認
2. Supabase URLとANON KEYが正しいか確認
3. アプリを再起動

### エラー: "Table does not exist"

データベースマイグレーションが実行されていません:
1. `docs/MIGRATION_GUIDE.md`を参照
2. Supabaseダッシュボードでマイグレーションを実行

## 開発時のヒント

### ホットリロード

コードを変更すると自動的にアプリが更新されます。
手動でリロードする場合は、Expo Goアプリで画面を振るか、`r`キーを押します。

### デバッグ

- ターミナルで`j`キーを押すとデバッガーが開きます
- `console.log()`の出力はターミナルに表示されます

### ログの確認

```bash
# すべてのログを表示
npm start

# エラーログのみ表示
npm start -- --no-dev
```

## 次のステップ

1. アプリが起動したら、まずサインアップ
2. グループを作成
3. レシピを追加
4. スケジュールを登録
5. 買い物リストを生成

問題が解決しない場合は、`node_modules`を削除して再インストール:

```bash
rm -rf node_modules
npm install --legacy-peer-deps
```
