import { createClient } from '@supabase/supabase-js';
import { Database } from '../../types/database.types';

// テスト用Supabaseクライアント（ローカルSupabaseを使用）
// 環境変数が設定されていない場合はデフォルトでローカルSupabaseのURLを使用
const supabaseUrl = process.env.TEST_SUPABASE_URL || 'http://127.0.0.1:54321';
const supabaseAnonKey = process.env.TEST_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

export const supabaseTest = createClient<Database>(supabaseUrl, supabaseAnonKey);

// 新しいSupabaseクライアントを作成する関数
export function createTestClient() {
  return createClient<Database>(supabaseUrl, supabaseAnonKey);
}

// 一意なメールアドレスを生成するヘルパー関数
function generateUniqueEmail(prefix = 'test'): string {
  // タイムスタンプ + ランダム値で一意性を確保
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `${prefix}-${timestamp}-${random}@example.com`;
}

// リトライロジック付きのユーザー作成ヘルパー
async function createUserWithRetry(
  client: ReturnType<typeof createClient<Database>>,
  email: string,
  password: string,
  maxRetries = 3
) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      // サインアップを試みる
      const { data, error } = await client.auth.signUp({ email, password });
      
      if (error) {
        // 既に存在する場合はサインイン
        if (error.message.includes('already registered')) {
          const { data: signInData, error: signInError } = 
            await client.auth.signInWithPassword({ email, password });
          if (signInError) throw signInError;
          if (!signInData.user) throw new Error('User sign in failed');
          return signInData.user;
        }
        throw error;
      }
      
      if (!data.user) throw new Error('User creation failed');
      return data.user;
    } catch (error) {
      // 最後の試行でエラーが発生した場合は例外をスロー
      if (attempt === maxRetries - 1) {
        throw error;
      }
      
      // リトライ前に少し待機（100ms）
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // 次の試行では新しいメールアドレスを生成
      email = generateUniqueEmail();
    }
  }
  
  throw new Error('Failed to create user after retries');
}

// テストユーザー作成ヘルパー（既存の共有クライアント用）
export async function createTestUser(email?: string, password = 'password123') {
  // emailが指定されていない場合は一意なメールアドレスを生成
  const userEmail = email || generateUniqueEmail();
  return createUserWithRetry(supabaseTest, userEmail, password);
}

// ユーザーと専用クライアントを作成（複数ユーザーのセッションをサポート）
export async function createTestUserWithClient(email?: string, password = 'password123') {
  const client = createTestClient();
  
  // emailが指定されていない場合は一意なメールアドレスを生成
  const userEmail = email || generateUniqueEmail();
  const user = await createUserWithRetry(client, userEmail, password);
  
  return { user, client };
}

// テストデータクリーンアップ
export async function cleanupTestData() {
  // テストで作成されたデータを削除
  // 外部キー制約があるため、子テーブルから順に削除
  
  // 1. 買い物リスト
  await supabaseTest.from('shopping_items').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  
  // 2. スケジュール
  await supabaseTest.from('schedules').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  
  // 3. レシピ関連（タグ紐付け、材料）
  await supabaseTest.from('recipe_tags').delete().neq('recipe_id', '00000000-0000-0000-0000-000000000000');
  await supabaseTest.from('ingredients').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  
  // 4. レシピ本体
  await supabaseTest.from('recipes').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  
  // 5. タグ
  await supabaseTest.from('tags').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  
  // 6. グループメンバー
  await supabaseTest.from('group_members').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  
  // 7. グループ
  await supabaseTest.from('groups').delete().neq('id', '00000000-0000-0000-0000-000000000000');
}


