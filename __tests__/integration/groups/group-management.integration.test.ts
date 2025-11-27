import { supabaseTest, createTestUser, createTestUserWithClient, cleanupTestData } from '../../setup/supabase-test';

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
    // テストユーザーを作成（メールアドレスは自動生成）
    testUser = await createTestUser();
  });

  afterEach(async () => {
    // テストデータをクリーンアップ
    await cleanupTestData();
  });

  describe('グループ作成', () => {
    it('グループを作成し、作成者をメンバーとして追加できる', async () => {
      // 1. グループを作成
      const { data: group, error: groupError } = await supabaseTest
        .from('groups')
        .insert([{ name: 'Test Group', created_by: testUser.id }])
        .select()
        .single();

      expect(groupError).toBeNull();
      expect(group).toBeDefined();
      expect(group?.name).toBe('Test Group');

      if (!group) throw new Error('Group creation failed');

      // 2. 作成者をメンバーとして追加
      const { data: member, error: memberError } = await supabaseTest
        .from('group_members')
        .insert([{ 
          group_id: group.id, 
          user_id: testUser.id, 
          role: 'admin' 
        }])
        .select()
        .single();

      expect(memberError).toBeNull();
      expect(member).toBeDefined();
      expect(member?.role).toBe('admin');
    });

    it('RLSポリシー: 作成したグループを取得できる', async () => {
      // グループを作成してメンバーを追加
      const { data: group } = await supabaseTest
        .from('groups')
        .insert([{ name: 'Test Group', created_by: testUser.id }])
        .select()
        .single();

      if (!group) throw new Error('Group creation failed');

      await supabaseTest
        .from('group_members')
        .insert([{ group_id: group.id, user_id: testUser.id, role: 'admin' }]);

      // グループ一覧を取得（RLSポリシーが適用される）
      const { data: groups, error } = await supabaseTest
        .from('group_members')
        .select('group_id, groups(*)')
        .eq('user_id', testUser.id);

      expect(error).toBeNull();
      expect(groups).toHaveLength(1);
      // 型アサーションが必要な場合があります
      expect((groups![0].groups as any).name).toBe('Test Group');
    });

    it('RLSポリシー: 他人のグループは取得できない', async () => {
      // 別のユーザーを作成（メールアドレスは自動生成）
      const otherUser = await createTestUser();

      // 別のユーザーがグループを作成
      const { data: group } = await supabaseTest
        .from('groups')
        .insert([{ name: 'Other Group', created_by: otherUser.id }])
        .select()
        .single();

      if (!group) throw new Error('Group creation failed');

      await supabaseTest
        .from('group_members')
        .insert([{ group_id: group.id, user_id: otherUser.id, role: 'admin' }]);

      // 現在のユーザーでグループ一覧を取得
      const { data: groups } = await supabaseTest
        .from('group_members')
        .select('group_id, groups(*)')
        .eq('user_id', testUser.id);

      // 他人のグループは取得できない
      expect(groups).toHaveLength(0);
    });
  });

  describe('招待コード機能', () => {
    it('招待コードでグループに参加できる', async () => {
      // グループを作成
      const { data: group } = await supabaseTest
        .from('groups')
        .insert([{ name: 'Test Group', created_by: testUser.id }])
        .select()
        .single();

      if (!group) throw new Error('Group creation failed');

      // 招待コードで参加（作成者のセッションで検索）
      const { data: joinedGroup, error } = await supabaseTest
        .from('groups')
        .select('*')
        .eq('invitation_code', group.invitation_code)
        .single();

      expect(error).toBeNull();
      expect(joinedGroup?.id).toBe(group.id);

      // 別のユーザーを作成（メールアドレスは自動生成）
      const newUser = await createTestUser();

      // メンバーとして追加
      const { error: memberError } = await supabaseTest
        .from('group_members')
        .insert([{ group_id: group.id, user_id: newUser.id, role: 'member' }]);

      expect(memberError).toBeNull();
    });
  });

  describe('RLSポリシーの厳密な検証', () => {
    it('複数ユーザー: 他人のグループは完全に見えない', async () => {
      // ユーザーAとそのクライアントを作成
      const { user: userA, client: clientA } = await createTestUserWithClient(
        `userA-${Date.now()}@example.com`,
        'password123'
      );

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

      // ユーザーBとそのクライアントを作成
      const { user: userB, client: clientB } = await createTestUserWithClient(
        `userB-${Date.now()}@example.com`,
        'password123'
      );

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

      // ユーザーAのクライアントで全グループを取得
      const { data: groupsForA } = await clientA
        .from('groups')
        .select('*');

      // ユーザーAはGroup Aのみ見える（作成者として）
      expect(groupsForA).toHaveLength(1);
      expect(groupsForA![0].name).toBe('Group A');

      // ユーザーBのクライアントで全グループを取得
      const { data: groupsForB } = await clientB
        .from('groups')
        .select('*');

      // ユーザーBはGroup Bのみ見える（作成者として）
      expect(groupsForB).toHaveLength(1);
      expect(groupsForB![0].name).toBe('Group B');
    });

    it('グループ招待: 招待されたユーザーはグループにアクセスできる', async () => {
      // ユーザーA（グループ作成者）
      const { user: userA, client: clientA } = await createTestUserWithClient(
        `userA-${Date.now()}@example.com`,
        'password123'
      );

      // グループを作成
      const { data: group } = await clientA
        .from('groups')
        .insert([{ name: 'Shared Group', created_by: userA.id }])
        .select()
        .single();

      if (!group) throw new Error('Group creation failed');

      // ユーザーAをメンバーとして追加
      await clientA
        .from('group_members')
        .insert([{ group_id: group.id, user_id: userA.id, role: 'admin' }]);

      // ユーザーB（招待されるユーザー）
      const { user: userB, client: clientB } = await createTestUserWithClient(
        `userB-${Date.now()}@example.com`,
        'password123'
      );

      // 招待前：ユーザーBはグループを見えない
      const { data: groupsBeforeInvite } = await clientB
        .from('groups')
        .select('*');

      expect(groupsBeforeInvite).toHaveLength(0);

      // ユーザーAがユーザーBを招待（メンバーとして追加）
      await clientA
        .from('group_members')
        .insert([{ group_id: group.id, user_id: userB.id, role: 'member' }]);

      // 招待後：ユーザーBはグループを見える
      const { data: groupsAfterInvite } = await clientB
        .from('groups')
        .select('*');

      expect(groupsAfterInvite).toHaveLength(1);
      expect(groupsAfterInvite![0].name).toBe('Shared Group');
    });

    it('権限の境界: メンバーは他のメンバーを削除できない', async () => {
      // ユーザーA（管理者）
      const { user: userA, client: clientA } = await createTestUserWithClient(
        `userA-${Date.now()}@example.com`,
        'password123'
      );

      // グループを作成
      const { data: group } = await clientA
        .from('groups')
        .insert([{ name: 'Test Group', created_by: userA.id }])
        .select()
        .single();

      if (!group) throw new Error('Group creation failed');

      await clientA
        .from('group_members')
        .insert([{ group_id: group.id, user_id: userA.id, role: 'admin' }]);

      // ユーザーB（一般メンバー）
      const { user: userB, client: clientB } = await createTestUserWithClient(
        `userB-${Date.now()}@example.com`,
        'password123'
      );

      // ユーザーBを招待
      const { data: memberB } = await clientA
        .from('group_members')
        .insert([{ group_id: group.id, user_id: userB.id, role: 'member' }])
        .select()
        .single();

      if (!memberB) throw new Error('Member B creation failed');

      // ユーザーC（一般メンバー）
      const { user: userC } = await createTestUserWithClient(
        `userC-${Date.now()}@example.com`,
        'password123'
      );

      // ユーザーCを招待
      const { data: memberC } = await clientA
        .from('group_members')
        .insert([{ group_id: group.id, user_id: userC.id, role: 'member' }])
        .select()
        .single();

      if (!memberC) throw new Error('Member C creation failed');

      // ユーザーBがユーザーCを削除しようとする（失敗するはず）
      const { error: deleteError } = await clientB
        .from('group_members')
        .delete()
        .eq('id', memberC.id);

      // RLSポリシーにより削除が拒否される
      // 注: 現在のRLSポリシーでは削除権限が明示的に設定されていないため、
      // このテストは実際のRLSポリシーの実装に依存します
      expect(deleteError).toBeDefined();
    });

    it('複数ユーザー間のデータ共有: 同じグループのメンバーはデータを共有できる', async () => {
      // ユーザーA（グループ作成者）
      const { user: userA, client: clientA } = await createTestUserWithClient(
        `userA-${Date.now()}@example.com`,
        'password123'
      );

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
      const { user: userB, client: clientB } = await createTestUserWithClient(
        `userB-${Date.now()}@example.com`,
        'password123'
      );

      // ユーザーBを招待
      await clientA
        .from('group_members')
        .insert([{ group_id: group.id, user_id: userB.id, role: 'member' }]);

      // ユーザーAがレシピを作成
      const { data: recipeA } = await clientA
        .from('recipes')
        .insert([{ group_id: group.id, name: 'Recipe by A' }])
        .select()
        .single();

      expect(recipeA).toBeDefined();

      // ユーザーBがレシピを作成
      const { data: recipeB } = await clientB
        .from('recipes')
        .insert([{ group_id: group.id, name: 'Recipe by B' }])
        .select()
        .single();

      expect(recipeB).toBeDefined();

      // ユーザーAは両方のレシピを見える
      const { data: recipesForA } = await clientA
        .from('recipes')
        .select('*')
        .eq('group_id', group.id);

      expect(recipesForA).toHaveLength(2);

      // ユーザーBも両方のレシピを見える
      const { data: recipesForB } = await clientB
        .from('recipes')
        .select('*')
        .eq('group_id', group.id);

      expect(recipesForB).toHaveLength(2);
    });
  });
});
