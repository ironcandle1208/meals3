import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import CreateRecipe from '../../../../app/(app)/recipes/create';
import { useAuth } from '../../../../contexts/AuthContext';
import { useRouter } from 'expo-router';
import { supabase } from '../../../../lib/supabase';

// モックの設定
jest.mock('../../../../contexts/AuthContext');
jest.mock('../../../../lib/supabase');
jest.mock('expo-router');

describe('レシピ作成画面', () => {
  let mockRouter;
  let mockSession;
  let mockGroup;

  beforeEach(() => {
    // 各テストの前にモックをリセット
    jest.clearAllMocks();

    // useAuthのモック
    mockSession = {
      user: { id: 'user-123', email: 'test@example.com' },
    };
    mockGroup = {
      id: 'group-123',
      name: 'テストグループ',
    };
    useAuth.mockReturnValue({
      session: mockSession,
      group: mockGroup,
    });

    // useRouterのモック
    mockRouter = {
      push: jest.fn(),
      replace: jest.fn(),
      back: jest.fn(),
    };
    useRouter.mockReturnValue(mockRouter);
  });

  describe('UIレンダリング', () => {
    it('必要な要素が正しく表示される', () => {
      const { getByText } = render(<CreateRecipe />);

      // タイトルの確認
      expect(getByText('New Recipe')).toBeTruthy();

      // セクションタイトルの確認
      expect(getByText('Ingredients')).toBeTruthy();
      expect(getByText('Tags')).toBeTruthy();

      // ボタンの確認
      expect(getByText('Add Ingredient')).toBeTruthy();
      expect(getByText('Create Recipe')).toBeTruthy();
    });
  });

  describe('フォーム入力', () => {
    it('レシピ名を入力できる', () => {
      const { getByDisplayValue, getAllByTestId } = render(<CreateRecipe />);

      const inputs = getAllByTestId('text-input-outlined');
      const nameInput = inputs[0]; // Recipe Name
      fireEvent.changeText(nameInput, 'カレーライス');

      expect(getByDisplayValue('カレーライス')).toBeTruthy();
    });

    it('材料を追加できる', () => {
      const { getByText, getAllByTestId } = render(<CreateRecipe />);

      // 初期状態では1つの材料フィールドが存在
      let inputs = getAllByTestId('text-input-outlined');
      const initialCount = inputs.length;

      // 材料を追加
      const addButton = getByText('Add Ingredient');
      fireEvent.press(addButton);

      // 材料フィールドが増えることを確認
      inputs = getAllByTestId('text-input-outlined');
      expect(inputs.length).toBeGreaterThan(initialCount);
    });
  });

  describe('レシピ作成処理', () => {
    it('レシピ作成が成功する', async () => {
      const mockRecipe = {
        id: 'recipe-123',
        name: 'カレーライス',
        instructions: '材料を炒めて煮込む',
      };

      // supabaseのモック
      supabase.from = jest.fn((table) => {
        if (table === 'recipes') {
          return {
            insert: jest.fn().mockReturnThis(),
            select: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
              data: mockRecipe,
              error: null,
            }),
          };
        }
        if (table === 'ingredients') {
          return {
            insert: jest.fn().mockResolvedValue({ error: null }),
          };
        }
        if (table === 'tags') {
          return {
            upsert: jest.fn().mockReturnThis(),
            select: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
              data: { id: 'tag-123', name: 'dinner' },
              error: null,
            }),
          };
        }
        if (table === 'recipe_tags') {
          return {
            insert: jest.fn().mockResolvedValue({ error: null }),
          };
        }
      });

      const { getByText, getAllByTestId } = render(<CreateRecipe />);

      // フォームに入力
      const inputs = getAllByTestId('text-input-outlined');
      fireEvent.changeText(inputs[0], 'カレーライス'); // Recipe Name
      fireEvent.changeText(inputs[2], '材料を炒めて煮込む'); // Instructions

      // レシピ作成ボタンをクリック
      const createButton = getByText('Create Recipe');
      fireEvent.press(createButton);

      // 前の画面に戻ることを確認
      await waitFor(() => {
        expect(mockRouter.back).toHaveBeenCalled();
      });
    });

    it('レシピ名が空の場合、エラーメッセージを表示する', async () => {
      const { getByText } = render(<CreateRecipe />);

      // レシピ作成ボタンをクリック（レシピ名は空）
      const createButton = getByText('Create Recipe');
      fireEvent.press(createButton);

      // エラーメッセージが表示されることを確認
      await waitFor(() => {
        expect(getByText('Recipe name is required')).toBeTruthy();
      });
    });

    it('グループが選択されていない場合、エラーメッセージを表示する', async () => {
      // グループなしでモックを設定
      useAuth.mockReturnValue({
        session: mockSession,
        group: null,
      });

      const { getByText, getAllByTestId } = render(<CreateRecipe />);

      // フォームに入力
      const inputs = getAllByTestId('text-input-outlined');
      fireEvent.changeText(inputs[0], 'カレーライス');

      // レシピ作成ボタンをクリック
      const createButton = getByText('Create Recipe');
      fireEvent.press(createButton);

      // エラーメッセージが表示されることを確認
      await waitFor(() => {
        expect(getByText('No group selected')).toBeTruthy();
      });
    });

    it('レシピ作成が失敗した場合、エラーメッセージを表示する', async () => {
      const errorMessage = 'Database error';

      // supabaseのモック（エラー）
      supabase.from = jest.fn(() => ({
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { message: errorMessage },
        }),
      }));

      const { getByText, getAllByTestId } = render(<CreateRecipe />);

      // フォームに入力
      const inputs = getAllByTestId('text-input-outlined');
      fireEvent.changeText(inputs[0], 'カレーライス');

      // レシピ作成ボタンをクリック
      const createButton = getByText('Create Recipe');
      fireEvent.press(createButton);

      // エラーメッセージが表示されることを確認
      await waitFor(() => {
        expect(getByText(errorMessage)).toBeTruthy();
      });
    });
  });
});
