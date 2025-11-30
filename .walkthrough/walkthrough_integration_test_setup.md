# 統合テスト環境の構築（TypeScript対応）

## 概要

TypeScript化されたプロジェクトに対して、実際のローカルSupabaseデータベースを使用する統合テスト環境を構築しました。これにより、RLSポリシーやデータベース制約などの問題を早期に検出できるようになりました。

## 背景

### 既存のテストの問題点

- 既存の単体テストはSupabaseをモック化している
- 実際のデータベースやRLSポリシーをテストしていない
- データベース層の問題（RLSポリシーの無限再帰など）を検出できない

### テストピラミッドの改善

**Before:**
```
  /\
 /  \
/単体 \
------
```

**After:**
```
  /\
 /E2E\
/統合 \
/単体  \
--------
```

## 実装内容

### 1. テスト用Supabaseクライアントの作成

[__tests__/setup/supabase-test.ts](file:///Users/ironcandle1208/Documents/project/meals3/__tests__/setup/supabase-test.ts)

```typescript
import { createClient } from '@supabase/supabase-js';
import { Database } from '../../types/database.types';

// テスト用Supabaseクライアント（ローカルSupabaseを使用）
export const supabaseTest = createClient<Database>(
  process.env.TEST_SUPABASE_URL || 'http://127.0.0.1:54321',
  process.env.TEST_SUPABASE_ANON_KEY || 'eyJhbGci...'
);

// テストユーザー作成ヘルパー
export async function createTestUser(email = 'test@example.com', password = 'password123') {
  const { data, error } = await supabaseTest.auth.signUp({ email, password });
  
  if (error) {
    if (error.message.includes('already registered')) {
        const { data: signInData, error: signInError } = 
          await supabaseTest.auth.signInWithPassword({ email, password });
        if (signInError) throw signInError;
        if (!signInData.user) throw new Error('User sign in failed');
        return signInData.user;
    }
    throw error;
  }
  
  if (!data.user) throw new Error('User creation failed');
  return data.user;
}

// テストデータクリーンアップ
export async function cleanupTestData() {
  // 外部キー制約があるため、子テーブルから順に削除
  await supabaseTest.from('shopping_items').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabaseTest.from('schedules').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabaseTest.from('recipe_tags').delete().neq('recipe_id', '00000000-0000-0000-0000-000000000000');
  await supabaseTest.from('ingredients').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabaseTest.from('recipes').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabaseTest.from('tags').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabaseTest.from('group_members').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabaseTest.from('groups').delete().neq('id', '00000000-0000-0000-0000-000000000000');
}
```

**ポイント:**
- `Database`型を使用して型安全性を確保
- テストユーザーが既に存在する場合はサインインする
- 外部キー制約を考慮した順序でデータをクリーンアップ

### 2. 環境変数の設定

[.env.test](file:///Users/ironcandle1208/Documents/project/meals3/.env.test)

```bash
TEST_SUPABASE_URL=http://127.0.0.1:54321
TEST_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0
```

### 3. package.jsonのスクリプト更新

[package.json](file:///Users/ironcandle1208/Documents/project/meals3/package.json)

```json
{
  "scripts": {
    "test": "jest",
    "test:unit": "jest --testPathPattern=__tests__/unit",
    "test:integration": "jest --testPathPattern=__tests__/integration",
    "test:e2e": "jest --testPathPattern=__tests__/e2e",
    "test:all": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "pretest:integration": "supabase start",
    "pretest:e2e": "supabase start"
  }
}
```

**ポイント:**
- テスト種別ごとに実行スクリプトを分離
- 統合テストとE2Eテストの実行前にSupabaseを自動起動
- Homebrewでインストール済みの`supabase`コマンドを使用

### 4. jest.setup.tsの調整

[jest.setup.ts](file:///Users/ironcandle1208/Documents/project/meals3/jest.setup.ts)

```typescript
// Supabase のモック（単体テストのみ）
// 統合テストとE2Eテストでは実際のSupabaseクライアントを使用するため、モックをスキップ
const isIntegrationOrE2ETest = process.env.JEST_TEST_PATH?.includes('integration') || 
                                process.env.JEST_TEST_PATH?.includes('e2e');

if (!isIntegrationOrE2ETest) {
  jest.mock('./lib/supabase', () => ({
    supabase: {
      // モック実装
    },
  }));
}
```

**ポイント:**
- テストパスに応じてモックの有効/無効を切り替え
- 統合テストでは実際のSupabaseクライアントを使用

### 5. グループ管理の統合テスト実装

[__tests__/integration/groups/group-management.integration.test.ts](file:///Users/ironcandle1208/Documents/project/meals3/__tests__/integration/groups/group-management.integration.test.ts)

```typescript
import { supabaseTest, createTestUser, cleanupTestData } from '../../setup/supabase-test';

describe('グループ管理 統合テスト', () => {
  let testUser: any;

  beforeAll(async () => {
    // ローカルSupabaseが起動していることを確認
    const { data, error } = await supabaseTest.from('groups').select('count');
    if (error) {
        console.error('Supabase connection check failed:', error);
        throw new Error('Supabase connection failed. Make sure local Supabase is running.');
    }
    expect(data).toBeDefined();
  });

  beforeEach(async () => {
    testUser = await createTestUser(`test-${Date.now()}@example.com`);
  });

  afterEach(async () => {
    await cleanupTestData();
  });

  describe('グループ作成', () => {
    it('グループを作成し、作成者をメンバーとして追加できる', async () => {
      // テスト実装
    });

    it('RLSポリシー: 作成したグループを取得できる', async () => {
      // テスト実装
    });

    it('RLSポリシー: 他人のグループは取得できない', async () => {
      // テスト実装
    });
  });

  describe('招待コード機能', () => {
    it('招待コードでグループに参加できる', async () => {
      // テスト実装
    });
  });
});
```

## 実行方法

### ローカルSupabaseの起動

```bash
supabase start
```

### 統合テストの実行

```bash
npm run test:integration
```

### テスト結果

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

## 成果

### 1. RLSポリシーの問題を検出

統合テストにより、以下のエラーを検出:
```
infinite recursion detected in policy for relation "groups"
```

このエラーは単体テスト（モック使用）では検出できませんでした。

### 2. 型安全性の向上

TypeScriptの`Database`型を使用することで、テストコードでも型安全性が確保されています。

### 3. テスト実行の自動化

`pretest:integration`スクリプトにより、Supabaseの起動を自動化し、テスト実行のハードルを下げました。

## 学んだこと

1. **統合テストの重要性**: モックでは検出できない、データベース層の問題を検出できる
2. **テスト環境の分離**: 単体テスト、統合テスト、E2Eテストで環境を分離することで、それぞれの目的に応じたテストが可能
3. **型安全性**: TypeScriptの型定義を活用することで、テストコードの品質も向上

## 次のステップ

- [ ] レシピ管理の統合テスト実装
- [ ] スケジュール・買い物リストの統合テスト実装
- [ ] E2Eテスト環境のセットアップ（Detox）
- [ ] CI/CDパイプラインへの統合

## 関連ファイル

- [__tests__/setup/supabase-test.ts](file:///Users/ironcandle1208/Documents/project/meals3/__tests__/setup/supabase-test.ts)
- [.env.test](file:///Users/ironcandle1208/Documents/project/meals3/.env.test)
- [package.json](file:///Users/ironcandle1208/Documents/project/meals3/package.json)
- [jest.setup.ts](file:///Users/ironcandle1208/Documents/project/meals3/jest.setup.ts)
- [__tests__/integration/groups/group-management.integration.test.ts](file:///Users/ironcandle1208/Documents/project/meals3/__tests__/integration/groups/group-management.integration.test.ts)
