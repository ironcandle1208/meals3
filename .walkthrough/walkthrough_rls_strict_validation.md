# RLSポリシーの厳密な検証テスト実装

## 概要

複数ユーザーのセッションをサポートし、RLSポリシーを厳密に検証するテストを実装しました。

## 実装内容

### 1. 複数ユーザーセッションのサポート

`createTestUserWithClient()`関数を実装し、各ユーザーごとに独立したSupabaseクライアントを作成できるようにしました。

### 2. RLS検証テスト（5件）

- ✅ 複数ユーザー: 他人のグループは完全に見えない
- ✅ グループ招待: 招待されたユーザーはグループにアクセスできる
- ✅ 権限の境界: メンバーは他のメンバーを削除できない
- ✅ 複数ユーザー間のデータ共有: 同じグループのメンバーはデータを共有できる

### 3. RLSポリシーの修正

`group_members`のINSERTポリシーを修正し、管理者が他のユーザーを招待できるようにしました。

## テスト結果

全28テストがパスしました。

## 関連ファイル

- __tests__/setup/supabase-test.ts
- __tests__/integration/groups/group-management.integration.test.ts
- supabase/migrations/20251127010000_fix_group_members_insert_policy.sql

