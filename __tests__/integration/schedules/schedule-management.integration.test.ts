import { supabaseTest, createTestUser, createTestUserWithClient, cleanupTestData } from '../../setup/supabase-test';

describe('スケジュール管理 統合テスト', () => {
  let testUser: any;
  let testGroup: any;
  let testRecipe: any;

  beforeAll(async () => {
    // ローカルSupabaseが起動していることを確認
    const { data, error } = await supabaseTest.from('schedules').select('count');
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

    // テスト用レシピを作成
    const { data: recipe } = await supabaseTest
      .from('recipes')
      .insert([{
        group_id: testGroup.id,
        name: 'Test Recipe',
        instructions: 'Test instructions'
      }])
      .select()
      .single();
    
    testRecipe = recipe;
  });

  afterEach(async () => {
    // テストデータをクリーンアップ
    await cleanupTestData();
  });

  describe('スケジュール作成', () => {
    it('スケジュールを作成できる', async () => {
      const { data: schedule, error } = await supabaseTest
        .from('schedules')
        .insert([{
          group_id: testGroup.id,
          date: '2025-12-01',
          meal_type: 'dinner',
          recipe_id: testRecipe?.id
        }])
        .select()
        .single();

      expect(error).toBeNull();
      expect(schedule).toBeDefined();
      expect(schedule?.date).toBe('2025-12-01');
      expect(schedule?.meal_type).toBe('dinner');
      expect(schedule?.recipe_id).toBe(testRecipe?.id);
    });

    it('レシピなしでスケジュールを作成できる', async () => {
      const { data: schedule, error } = await supabaseTest
        .from('schedules')
        .insert([{
          group_id: testGroup.id,
          date: '2025-12-02',
          meal_type: 'lunch'
        }])
        .select()
        .single();

      expect(error).toBeNull();
      expect(schedule).toBeDefined();
      expect(schedule?.recipe_id).toBeNull();
    });
  });

  describe('スケジュール取得', () => {
    it('自分のグループのスケジュールを取得できる', async () => {
      // スケジュールを作成
      await supabaseTest
        .from('schedules')
        .insert([
          { group_id: testGroup.id, date: '2025-12-01', meal_type: 'breakfast' },
          { group_id: testGroup.id, date: '2025-12-01', meal_type: 'lunch' },
          { group_id: testGroup.id, date: '2025-12-01', meal_type: 'dinner' }
        ]);

      // スケジュールを取得
      const { data: schedules } = await supabaseTest
        .from('schedules')
        .select('*')
        .eq('group_id', testGroup.id)
        .eq('date', '2025-12-01')
        .order('meal_type');

      expect(schedules).toHaveLength(3);
      expect(schedules![0].meal_type).toBe('breakfast');
      expect(schedules![1].meal_type).toBe('dinner');
      expect(schedules![2].meal_type).toBe('lunch');
    });

    it('レシピ情報を含むスケジュールを取得できる', async () => {
      // レシピ付きスケジュールを作成
      const { data: schedule } = await supabaseTest
        .from('schedules')
        .insert([{
          group_id: testGroup.id,
          date: '2025-12-03',
          meal_type: 'dinner',
          recipe_id: testRecipe?.id
        }])
        .select()
        .single();

      if (!schedule) throw new Error('Schedule creation failed');

      // レシピ情報を含むスケジュールを取得
      const { data: scheduleWithRecipe } = await supabaseTest
        .from('schedules')
        .select('*, recipes(*)')
        .eq('id', schedule.id)
        .single();

      expect(scheduleWithRecipe).toBeDefined();
      expect((scheduleWithRecipe?.recipes as any)?.name).toBe('Test Recipe');
    });
  });

  describe('スケジュール更新', () => {
    it('スケジュールを更新できる', async () => {
      // スケジュールを作成
      const { data: schedule } = await supabaseTest
        .from('schedules')
        .insert([{
          group_id: testGroup.id,
          date: '2025-12-04',
          meal_type: 'breakfast'
        }])
        .select()
        .single();

      if (!schedule) throw new Error('Schedule creation failed');

      // スケジュールを更新
      const { data: updatedSchedule, error } = await supabaseTest
        .from('schedules')
        .update({ meal_type: 'lunch', recipe_id: testRecipe?.id })
        .eq('id', schedule.id)
        .select()
        .single();

      expect(error).toBeNull();
      expect(updatedSchedule?.meal_type).toBe('lunch');
      expect(updatedSchedule?.recipe_id).toBe(testRecipe?.id);
    });
  });

  describe('スケジュール削除', () => {
    it('スケジュールを削除できる', async () => {
      // スケジュールを作成
      const { data: schedule } = await supabaseTest
        .from('schedules')
        .insert([{
          group_id: testGroup.id,
          date: '2025-12-05',
          meal_type: 'dinner'
        }])
        .select()
        .single();

      if (!schedule) throw new Error('Schedule creation failed');

      // スケジュールを削除
      const { error } = await supabaseTest
        .from('schedules')
        .delete()
        .eq('id', schedule.id);

      expect(error).toBeNull();

      // 削除されたことを確認
      const { data: deletedSchedule } = await supabaseTest
        .from('schedules')
        .select('*')
        .eq('id', schedule.id)
        .single();

      expect(deletedSchedule).toBeNull();
    });
  });

  describe('RLSポリシーの検証', () => {
    it('複数ユーザー: 他人のグループのスケジュールは見えない', async () => {
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

      // ユーザーAのスケジュールを作成
      await clientA
        .from('schedules')
        .insert([{
          group_id: groupA.id,
          date: '2025-12-10',
          meal_type: 'dinner'
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

      // ユーザーBのスケジュールを作成
      await clientB
        .from('schedules')
        .insert([{
          group_id: groupB.id,
          date: '2025-12-10',
          meal_type: 'lunch'
        }]);

      // ユーザーAのクライアントで全スケジュールを取得
      const { data: schedulesForA } = await clientA
        .from('schedules')
        .select('*');

      // ユーザーAはGroup Aのスケジュールのみ見える
      expect(schedulesForA).toHaveLength(1);
      expect(schedulesForA![0].meal_type).toBe('dinner');

      // ユーザーBのクライアントで全スケジュールを取得
      const { data: schedulesForB } = await clientB
        .from('schedules')
        .select('*');

      // ユーザーBはGroup Bのスケジュールのみ見える
      expect(schedulesForB).toHaveLength(1);
      expect(schedulesForB![0].meal_type).toBe('lunch');
    });
  });
});
