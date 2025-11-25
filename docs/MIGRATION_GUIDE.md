# Supabaseデータベースマイグレーション実行ガイド

## 概要
以下の3つのマイグレーションファイルをSupabaseで実行する必要があります。

## マイグレーションファイル

1. `20251123201500_create_phase2_tables.sql` - Phase 2のテーブル（グループ、レシピ、材料、タグ）
2. `20251123202600_create_phase3_tables.sql` - Phase 3のテーブル（スケジュール、買い物リスト）
3. `20251123210900_add_invitation_code.sql` - グループ招待コード機能

## 実行手順

### 方法1: Supabase Dashboard（推奨）

1. **Supabase Dashboardにアクセス**
   - https://app.supabase.com にアクセス
   - プロジェクトを選択

2. **SQL Editorを開く**
   - 左サイドバーから「SQL Editor」をクリック
   - 「New query」をクリック

3. **マイグレーションを順番に実行**
   
   **Step 1: Phase 2テーブルの作成**
   ```
   supabase/migrations/20251123201500_create_phase2_tables.sql
   ```
   - ファイルの内容をコピー
   - SQL Editorに貼り付け
   - 「Run」をクリック
   - エラーがないことを確認

   **Step 2: Phase 3テーブルの作成**
   ```
   supabase/migrations/20251123202600_create_phase3_tables.sql
   ```
   - 同様に実行

   **Step 3: 招待コード機能の追加**
   ```
   supabase/migrations/20251123210900_add_invitation_code.sql
   ```
   - 同様に実行

   **Step 4: プロフィール自動作成トリガーの追加**
   ```
   supabase/migrations/20251124000000_create_profiles_trigger.sql
   ```
   - 同様に実行
   - このトリガーにより、新規ユーザー登録時に自動的にprofilesテーブルにレコードが作成されます

4. **確認**
   - 左サイドバーから「Table Editor」をクリック
   - 以下のテーブルが作成されていることを確認:
     - groups
     - group_members
     - recipes
     - ingredients
     - tags
     - recipe_tags
     - schedules
     - shopping_items
     - profiles (新規追加)

### 方法2: Supabase CLI（オプション）

Supabase CLIがインストールされている場合:

```bash
# プロジェクトディレクトリで実行
cd /Users/ironcandle1208/Documents/project/meals3

# Supabaseにリンク（初回のみ）
supabase link --project-ref your-project-ref

# マイグレーションを実行
supabase db push
```

## トラブルシューティング

### エラー: "relation already exists"
- テーブルが既に存在する場合は、そのテーブルの作成部分をスキップ
- または、テーブルを削除してから再実行

### エラー: "permission denied"
- Supabaseダッシュボードで実行していることを確認
- プロジェクトの管理者権限があることを確認

### RLSポリシーの確認
- Table Editorで各テーブルを選択
- 「RLS」タブでポリシーが設定されていることを確認

## 次のステップ

マイグレーション完了後:
1. アプリを起動して動作確認
2. グループを作成してみる
3. レシピを追加してみる
4. スケジュールと買い物リストを試す
