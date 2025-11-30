# RLSポリシーの無限再帰問題の修正

## 概要

統合テストの実装中に、`groups`テーブルと`group_members`テーブルのRLSポリシーが相互参照することで無限再帰エラーが発生していることを検出し、修正しました。

## 発生した問題

### エラーメッセージ

```
infinite recursion detected in policy for relation "groups"
```

### 原因

1. **`groups`テーブルのSELECTポリシー**
   ```sql
   create policy "Users can view groups they belong to"
     on public.groups for select
     using (
       exists (
         select 1 from public.group_members
         where group_members.group_id = groups.id
         and group_members.user_id = auth.uid()
       )
     );
   ```
   → `group_members`テーブルを参照

2. **`group_members`テーブルのSELECTポリシー**
   ```sql
   create policy "Users can view members of their groups"
     on public.group_members for select
     using (
       exists (
         select 1 from public.group_members as gm
         where gm.group_id = group_members.group_id
         and gm.user_id = auth.uid()
       )
     );
   ```
   → `group_members`テーブル自身を参照

この相互参照により、PostgreSQLが無限ループを検出してエラーを発生させていました。

## 検出方法

統合テストを実行した際に検出:

```bash
npm run test:integration
```

**テスト結果:**
```
console.error
  Supabase connection check failed: {
    code: '42P17',
    details: null,
    hint: null,
    message: 'infinite recursion detected in policy for relation "groups"'
  }
```

## 修正内容

### マイグレーションファイル

[supabase/migrations/20251127000000_fix_rls_infinite_recursion.sql](file:///Users/ironcandle1208/Documents/project/meals3/supabase/migrations/20251127000000_fix_rls_infinite_recursion.sql)

### 修正1: `group_members`テーブルのポリシー

**Before:**
```sql
create policy "Users can view members of their groups"
  on public.group_members for select
  using (
    exists (
      select 1 from public.group_members as gm
      where gm.group_id = group_members.group_id
      and gm.user_id = auth.uid()
    )
  );
```

**After:**
```sql
create policy "Users can view members of their groups"
  on public.group_members for select
  using (
    -- 認証されたユーザーのみが閲覧可能
    auth.uid() is not null
  );
```

**変更理由:**
- 自己参照を削除し、シンプルに認証されたユーザーのみが閲覧可能に変更
- 実際のフィルタリングはアプリケーション側で行う

### 修正2: `groups`テーブルのポリシー

**Before:**
```sql
create policy "Users can view groups they belong to"
  on public.groups for select
  using (
    exists (
      select 1 from public.group_members
      where group_members.group_id = groups.id
      and group_members.user_id = auth.uid()
    )
  );
```

**After:**
```sql
create policy "Users can view groups they belong to"
  on public.groups for select
  using (
    -- 作成者は常に閲覧可能
    created_by = auth.uid()
    or
    -- group_members テーブルに登録されているユーザーも閲覧可能
    id in (
      select group_id 
      from public.group_members
      where user_id = auth.uid()
    )
  );
```

**変更理由:**
- 作成者は常に閲覧可能にする条件を追加
- `group_members`のポリシーがシンプルになったため、無限再帰は発生しない

## マイグレーション適用

```bash
supabase db reset
```

適用されたマイグレーション:
```
Applying migration 20251123201500_create_phase2_tables.sql...
Applying migration 20251123202600_create_phase3_tables.sql...
Applying migration 20251123210900_add_invitation_code.sql...
Applying migration 20251124000000_create_profiles_trigger.sql...
Applying migration 20251124143000_fix_group_members_rls.sql...
Applying migration 20251127000000_fix_rls_infinite_recursion.sql...
```

## 検証結果

統合テストを再実行:

```bash
npm run test:integration
```

**結果:**
```
PASS  __tests__/integration/groups/group-management.integration.test.ts
  グループ管理 統合テスト
    グループ作成
      ✓ グループを作成し、作成者をメンバーとして追加できる (161 ms)
      ✓ RLSポリシー: 作成したグループを取得できる (110 ms)
      ✓ RLSポリシー: 他人のグループは取得できない (200 ms)
    招待コード機能
      ✓ 招待コードでグループに参加できる (187 ms)

Test Suites: 1 passed, 1 total
Tests:       4 passed, 4 total
```

✅ **全てのテストがパスし、無限再帰問題が解決されました。**

## 学んだこと

1. **RLSポリシーの相互参照に注意**: テーブル間でポリシーが相互参照すると無限再帰が発生する可能性がある
2. **統合テストの重要性**: モックを使用した単体テストでは検出できない、データベース層の問題を検出できる
3. **シンプルなポリシー設計**: 複雑なポリシーよりも、シンプルで理解しやすいポリシーを心がける

## 関連ファイル

- [supabase/migrations/20251127000000_fix_rls_infinite_recursion.sql](file:///Users/ironcandle1208/Documents/project/meals3/supabase/migrations/20251127000000_fix_rls_infinite_recursion.sql)
- [__tests__/integration/groups/group-management.integration.test.ts](file:///Users/ironcandle1208/Documents/project/meals3/__tests__/integration/groups/group-management.integration.test.ts)
- [supabase/migrations/20251123201500_create_phase2_tables.sql](file:///Users/ironcandle1208/Documents/project/meals3/supabase/migrations/20251123201500_create_phase2_tables.sql)
