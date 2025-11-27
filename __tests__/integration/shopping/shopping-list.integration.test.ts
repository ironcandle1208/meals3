import { supabaseTest, createTestUser, createTestUserWithClient, cleanupTestData } from '../../setup/supabase-test';

describe('買い物リスト管理 統合テスト', () => {
  let testUser: any;
  let testGroup: any;

  beforeAll(async () => {
    // ローカルSupabaseが起動していることを確認
    const { data, error } = await supabaseTest.from('shopping_items').select('count');
    if (error) {
        console.error('Supabase connection check failed:', error);
        throw new Error('Supabase connection failed. Make sure local Supabase is running.');
    }
    expect(data).toBeDefined();
  });

  beforeEach(async () => {
    // テストユーザーを作成（メールアドレスは自動生成）
    testUser = await createTestUser();
    
    // テスト用グループを作成
    const { data: group } = await supabaseTest
      .from('groups')
      .insert([{ name: 'Test Group', created_by: testUser.id }])
      .select()
      .single();
    
    if (!group) throw new Error('Group creation failed');

    await supabaseTest
      .from('group_members')
      .insert([{ group_id: group.id, user_id: testUser.id, role: 'admin' }]);
    
    testGroup = group;
  });

  afterEach(async () => {
    // テストデータをクリーンアップ
    await cleanupTestData();
  });

  describe('買い物アイテム作成', () => {
    it('買い物アイテムを作成できる', async () => {
      const { data: item, error } = await supabaseTest
        .from('shopping_items')
        .insert([{
          group_id: testGroup.id,
          name: 'Tomato',
          is_purchased: false,
          source_type: 'manual'
        }])
        .select()
        .single();

      expect(error).toBeNull();
      expect(item).toBeDefined();
      expect(item?.name).toBe('Tomato');
      expect(item?.is_purchased).toBe(false);
      expect(item?.source_type).toBe('manual');
    });

    it('自動生成された買い物アイテムを作成できる', async () => {
      const { data: item, error } = await supabaseTest
        .from('shopping_items')
        .insert([{
          group_id: testGroup.id,
          name: 'Onion',
          source_type: 'auto'
        }])
        .select()
        .single();

      expect(error).toBeNull();
      expect(item).toBeDefined();
      expect(item?.source_type).toBe('auto');
      expect(item?.is_purchased).toBe(false); // デフォルト値
    });
  });

  describe('買い物アイテム取得', () => {
    it('自分のグループの買い物アイテムを取得できる', async () => {
      // 買い物アイテムを作成
      await supabaseTest
        .from('shopping_items')
        .insert([
          { group_id: testGroup.id, name: 'Milk', is_purchased: false },
          { group_id: testGroup.id, name: 'Bread', is_purchased: true },
          { group_id: testGroup.id, name: 'Eggs', is_purchased: false }
        ]);

      // 買い物アイテムを取得
      const { data: items } = await supabaseTest
        .from('shopping_items')
        .select('*')
        .eq('group_id', testGroup.id)
        .order('name');

      expect(items).toHaveLength(3);
      expect(items![0].name).toBe('Bread');
      expect(items![1].name).toBe('Eggs');
      expect(items![2].name).toBe('Milk');
    });

    it('未購入のアイテムのみを取得できる', async () => {
      // 買い物アイテムを作成
      await supabaseTest
        .from('shopping_items')
        .insert([
          { group_id: testGroup.id, name: 'Apple', is_purchased: false },
          { group_id: testGroup.id, name: 'Banana', is_purchased: true },
          { group_id: testGroup.id, name: 'Orange', is_purchased: false }
        ]);

      // 未購入のアイテムのみを取得
      const { data: unpurchasedItems } = await supabaseTest
        .from('shopping_items')
        .select('*')
        .eq('group_id', testGroup.id)
        .eq('is_purchased', false)
        .order('name');

      expect(unpurchasedItems).toHaveLength(2);
      expect(unpurchasedItems![0].name).toBe('Apple');
      expect(unpurchasedItems![1].name).toBe('Orange');
    });
  });

  describe('買い物アイテム更新', () => {
    it('アイテムを購入済みにマークできる', async () => {
      // 買い物アイテムを作成
      const { data: item } = await supabaseTest
        .from('shopping_items')
        .insert([{
          group_id: testGroup.id,
          name: 'Cheese',
          is_purchased: false
        }])
        .select()
        .single();

      if (!item) throw new Error('Shopping item creation failed');

      // 購入済みにマーク
      const { data: updatedItem, error } = await supabaseTest
        .from('shopping_items')
        .update({ is_purchased: true })
        .eq('id', item.id)
        .select()
        .single();

      expect(error).toBeNull();
      expect(updatedItem?.is_purchased).toBe(true);
    });

    it('アイテム名を更新できる', async () => {
      // 買い物アイテムを作成
      const { data: item } = await supabaseTest
        .from('shopping_items')
        .insert([{
          group_id: testGroup.id,
          name: 'Original Name'
        }])
        .select()
        .single();

      if (!item) throw new Error('Shopping item creation failed');

      // アイテム名を更新
      const { data: updatedItem, error } = await supabaseTest
        .from('shopping_items')
        .update({ name: 'Updated Name' })
        .eq('id', item.id)
        .select()
        .single();

      expect(error).toBeNull();
      expect(updatedItem?.name).toBe('Updated Name');
    });
  });

  describe('買い物アイテム削除', () => {
    it('買い物アイテムを削除できる', async () => {
      // 買い物アイテムを作成
      const { data: item } = await supabaseTest
        .from('shopping_items')
        .insert([{
          group_id: testGroup.id,
          name: 'Item to Delete'
        }])
        .select()
        .single();

      if (!item) throw new Error('Shopping item creation failed');

      // アイテムを削除
      const { error } = await supabaseTest
        .from('shopping_items')
        .delete()
        .eq('id', item.id);

      expect(error).toBeNull();

      // 削除されたことを確認
      const { data: deletedItem } = await supabaseTest
        .from('shopping_items')
        .select('*')
        .eq('id', item.id)
        .single();

      expect(deletedItem).toBeNull();
    });

    it('購入済みアイテムを一括削除できる', async () => {
      // 買い物アイテムを作成
      await supabaseTest
        .from('shopping_items')
        .insert([
          { group_id: testGroup.id, name: 'Item 1', is_purchased: true },
          { group_id: testGroup.id, name: 'Item 2', is_purchased: false },
          { group_id: testGroup.id, name: 'Item 3', is_purchased: true }
        ]);

      // 購入済みアイテムを一括削除
      const { error } = await supabaseTest
        .from('shopping_items')
        .delete()
        .eq('group_id', testGroup.id)
        .eq('is_purchased', true);

      expect(error).toBeNull();

      // 未購入アイテムのみ残っていることを確認
      const { data: remainingItems } = await supabaseTest
        .from('shopping_items')
        .select('*')
        .eq('group_id', testGroup.id);

      expect(remainingItems).toHaveLength(1);
      expect(remainingItems![0].name).toBe('Item 2');
    });
  });

  describe('RLSポリシーの検証', () => {
    it('複数ユーザー: 他人のグループの買い物アイテムは見えない', async () => {
      // ユーザーAとそのクライアントを作成
      const { user: userA, client: clientA } = await createTestUserWithClient();

      // ユーザーAのグループを作成
      const { data: groupA } = await clientA
        .from('groups')
        .insert([{ name: 'Group A', created_by: userA.id }])
        .select()
        .single();

      if (!groupA) throw new Error('Group A creation failed');

      await clientA
        .from('group_members')
        .insert([{ group_id: groupA.id, user_id: userA.id, role: 'admin' }]);

      // ユーザーAの買い物アイテムを作成
      await clientA
        .from('shopping_items')
        .insert([{
          group_id: groupA.id,
          name: 'Item A'
        }]);

      // ユーザーBとそのクライアントを作成
      const { user: userB, client: clientB } = await createTestUserWithClient();

      // ユーザーBのグループを作成
      const { data: groupB } = await clientB
        .from('groups')
        .insert([{ name: 'Group B', created_by: userB.id }])
        .select()
        .single();

      if (!groupB) throw new Error('Group B creation failed');

      await clientB
        .from('group_members')
        .insert([{ group_id: groupB.id, user_id: userB.id, role: 'admin' }]);

      // ユーザーBの買い物アイテムを作成
      await clientB
        .from('shopping_items')
        .insert([{
          group_id: groupB.id,
          name: 'Item B'
        }]);

      // ユーザーAのクライアントで全アイテムを取得
      const { data: itemsForA } = await clientA
        .from('shopping_items')
        .select('*');

      // ユーザーAはGroup Aのアイテムのみ見える
      expect(itemsForA).toHaveLength(1);
      expect(itemsForA![0].name).toBe('Item A');

      // ユーザーBのクライアントで全アイテムを取得
      const { data: itemsForB } = await clientB
        .from('shopping_items')
        .select('*');

      // ユーザーBはGroup Bのアイテムのみ見える
      expect(itemsForB).toHaveLength(1);
      expect(itemsForB![0].name).toBe('Item B');
    });

    it('グループメンバー間でアイテムを共有できる', async () => {
      // ユーザーA（グループ作成者）
      const { user: userA, client: clientA } = await createTestUserWithClient();

      // グループを作成
      const { data: group } = await clientA
        .from('groups')
        .insert([{ name: 'Shared Group', created_by: userA.id }])
        .select()
        .single();

      if (!group) throw new Error('Group creation failed');

      await clientA
        .from('group_members')
        .insert([{ group_id: group.id, user_id: userA.id, role: 'admin' }]);

      // ユーザーB（招待されるユーザー）
      const { user: userB, client: clientB } = await createTestUserWithClient();

      // ユーザーBを招待
      await clientA
        .from('group_members')
        .insert([{ group_id: group.id, user_id: userB.id, role: 'member' }]);

      // ユーザーAがアイテムを作成
      await clientA
        .from('shopping_items')
        .insert([{ group_id: group.id, name: 'Item by A' }]);

      // ユーザーBがアイテムを作成
      await clientB
        .from('shopping_items')
        .insert([{ group_id: group.id, name: 'Item by B' }]);

      // ユーザーAは両方のアイテムを見える
      const { data: itemsForA } = await clientA
        .from('shopping_items')
        .select('*')
        .eq('group_id', group.id)
        .order('name');

      expect(itemsForA).toHaveLength(2);

      // ユーザーBも両方のアイテムを見える
      const { data: itemsForB } = await clientB
        .from('shopping_items')
        .select('*')
        .eq('group_id', group.id)
        .order('name');

      expect(itemsForB).toHaveLength(2);
    });
  });
});
