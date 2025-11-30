# 統合テストの安定性向上（Phase 1）

## 概要

統合テストの安定性を向上させるため、メールアドレスの自動生成とリトライロジックを実装しました。

## 実装内容

### 1. 一意なメールアドレスの自動生成

```typescript
function generateUniqueEmail(prefix = 'test'): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `${prefix}-${timestamp}-${random}@example.com`;
}
```

### 2. リトライロジック

- 最大3回まで自動リトライ
- 失敗時は100ms待機後に再試行
- 次の試行では新しいメールアドレスを生成

### 3. テストファイルの更新

手動でメールアドレスを生成していた箇所を自動生成に変更。

## パフォーマンス

- 改善前: 2.3秒
- 改善後: 2.3-2.7秒
- 影響: ほぼゼロ

## 安定性

- 改善前: 約5%の失敗率
- 改善後: ほぼ0%（予想）

## 関連ファイル

- __tests__/setup/supabase-test.ts
- __tests__/integration/groups/group-management.integration.test.ts
- __tests__/integration/recipes/recipe-management.integration.test.ts

