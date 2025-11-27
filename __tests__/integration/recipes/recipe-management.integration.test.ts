import { supabaseTest, createTestUser, cleanupTestData } from '../../setup/supabase-test';

describe('レシピ管理 統合テスト', () => {
  let testUser: any;
  let testGroup: any;

  beforeAll(async () => {
    // ローカルSupabaseが起動していることを確認
    const { data, error } = await supabaseTest.from('recipes').select('count');
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

  describe('レシピ作成', () => {
    it('レシピを作成できる', async () => {
      const { data: recipe, error } = await supabaseTest
        .from('recipes')
        .insert([{
          group_id: testGroup.id,
          name: 'Test Recipe',
          instructions: 'Test instructions'
        }])
        .select()
        .single();

      expect(error).toBeNull();
      expect(recipe).toBeDefined();
      expect(recipe?.name).toBe('Test Recipe');
      expect(recipe?.instructions).toBe('Test instructions');
    });

    it('材料を含むレシピを作成できる', async () => {
      // レシピを作成
      const { data: recipe } = await supabaseTest
        .from('recipes')
        .insert([{
          group_id: testGroup.id,
          name: 'Recipe with Ingredients',
          instructions: 'Test instructions'
        }])
        .select()
        .single();

      if (!recipe) throw new Error('Recipe creation failed');

      // 材料を追加
      const { data: ingredients, error: ingredientsError } = await supabaseTest
        .from('ingredients')
        .insert([
          { recipe_id: recipe.id, name: 'Tomato', quantity: '2', unit: 'pieces' },
          { recipe_id: recipe.id, name: 'Onion', quantity: '1', unit: 'piece' },
          { recipe_id: recipe.id, name: 'Garlic', quantity: '3', unit: 'cloves' }
        ])
        .select();

      expect(ingredientsError).toBeNull();
      expect(ingredients).toHaveLength(3);
      expect(ingredients![0].name).toBe('Tomato');
    });
  });

  describe('レシピ取得', () => {
    it('自分のグループのレシピを取得できる', async () => {
      // 自分のグループにレシピを作成
      const { data: myRecipe, error: myRecipeError } = await supabaseTest
        .from('recipes')
        .insert([{ group_id: testGroup.id, name: 'My Recipe' }])
        .select()
        .single();

      expect(myRecipeError).toBeNull();
      expect(myRecipe).toBeDefined();

      // 自分のグループのレシピを取得
      const { data: recipes } = await supabaseTest
        .from('recipes')
        .select('*')
        .eq('group_id', testGroup.id);

      expect(recipes).toHaveLength(1);
      expect(recipes![0].name).toBe('My Recipe');
    });

    it('材料を含むレシピを取得できる', async () => {
      // レシピと材料を作成
      const { data: recipe } = await supabaseTest
        .from('recipes')
        .insert([{
          group_id: testGroup.id,
          name: 'Recipe with Ingredients'
        }])
        .select()
        .single();

      if (!recipe) throw new Error('Recipe creation failed');

      await supabaseTest
        .from('ingredients')
        .insert([
          { recipe_id: recipe.id, name: 'Ingredient 1' },
          { recipe_id: recipe.id, name: 'Ingredient 2' }
        ]);

      // レシピと材料を一緒に取得
      const { data: recipeWithIngredients } = await supabaseTest
        .from('recipes')
        .select('*, ingredients(*)')
        .eq('id', recipe.id)
        .single();

      expect(recipeWithIngredients).toBeDefined();
      expect(recipeWithIngredients?.ingredients).toHaveLength(2);
    });
  });

  describe('レシピ更新', () => {
    it('レシピを更新できる', async () => {
      // レシピを作成
      const { data: recipe } = await supabaseTest
        .from('recipes')
        .insert([{
          group_id: testGroup.id,
          name: 'Original Name',
          instructions: 'Original instructions'
        }])
        .select()
        .single();

      if (!recipe) throw new Error('Recipe creation failed');

      // レシピを更新
      const { data: updatedRecipe, error } = await supabaseTest
        .from('recipes')
        .update({ name: 'Updated Name', instructions: 'Updated instructions' })
        .eq('id', recipe.id)
        .select()
        .single();

      expect(error).toBeNull();
      expect(updatedRecipe?.name).toBe('Updated Name');
      expect(updatedRecipe?.instructions).toBe('Updated instructions');
    });
  });

  describe('レシピ削除', () => {
    it('レシピを削除できる', async () => {
      // レシピを作成
      const { data: recipe } = await supabaseTest
        .from('recipes')
        .insert([{
          group_id: testGroup.id,
          name: 'Recipe to Delete'
        }])
        .select()
        .single();

      if (!recipe) throw new Error('Recipe creation failed');

      // レシピを削除
      const { error } = await supabaseTest
        .from('recipes')
        .delete()
        .eq('id', recipe.id);

      expect(error).toBeNull();

      // 削除されたことを確認
      const { data: deletedRecipe } = await supabaseTest
        .from('recipes')
        .select('*')
        .eq('id', recipe.id)
        .single();

      expect(deletedRecipe).toBeNull();
    });

    it('レシピを削除すると材料も削除される（CASCADE）', async () => {
      // レシピと材料を作成
      const { data: recipe } = await supabaseTest
        .from('recipes')
        .insert([{
          group_id: testGroup.id,
          name: 'Recipe with Ingredients'
        }])
        .select()
        .single();

      if (!recipe) throw new Error('Recipe creation failed');

      await supabaseTest
        .from('ingredients')
        .insert([
          { recipe_id: recipe.id, name: 'Ingredient 1' },
          { recipe_id: recipe.id, name: 'Ingredient 2' }
        ]);

      // レシピを削除
      await supabaseTest
        .from('recipes')
        .delete()
        .eq('id', recipe.id);

      // 材料も削除されたことを確認
      const { data: ingredients } = await supabaseTest
        .from('ingredients')
        .select('*')
        .eq('recipe_id', recipe.id);

      expect(ingredients).toHaveLength(0);
    });
  });
});
