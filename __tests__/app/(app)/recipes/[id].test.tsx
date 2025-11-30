import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import RecipeDetail from '../../../../app/(app)/recipes/[id]';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '../../../../lib/supabase';

// モックの設定
jest.mock('../../../../lib/supabase');
jest.mock('expo-router');

// Alertのモック
jest.spyOn(Alert, 'alert').mockImplementation(() => {});

describe('レシピ詳細画面', () => {
  let mockRouter: {
    push: jest.Mock;
    replace: jest.Mock;
    back: jest.Mock;
  };
  const mockRecipeId = 'recipe-123';

  beforeEach(() => {
    // 各テストの前にモックをリセット
    jest.clearAllMocks();

    // useLocalSearchParamsのモック
    (useLocalSearchParams as jest.Mock).mockReturnValue({
      id: mockRecipeId,
    });

    // useRouterのモック
    mockRouter = {
      push: jest.fn(),
      replace: jest.fn(),
      back: jest.fn(),
    };
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
  });

  describe('レシピ詳細の表示', () => {
    it('レシピ情報が正しく表示される', async () => {
      const mockRecipe = {
        id: mockRecipeId,
        name: 'カレーライス',
        instructions: '材料を炒めて煮込む',
        image_url: 'https://example.com/curry.jpg',
      };

      const mockIngredients = [
        { id: '1', name: '玉ねぎ', quantity: '2', unit: '個' },
        { id: '2', name: 'にんじん', quantity: '1', unit: '本' },
      ];

      const mockTags = [
        { tags: { id: 'tag-1', name: 'dinner' } },
        { tags: { id: 'tag-2', name: 'healthy' } },
      ];

      // supabaseのモック
      (supabase.from as jest.Mock) = jest.fn((table) => {
        if (table === 'recipes') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
              data: mockRecipe,
              error: null,
            }),
          };
        }
        if (table === 'ingredients') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockResolvedValue({
              data: mockIngredients,
              error: null,
            }),
          };
        }
        if (table === 'recipe_tags') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockResolvedValue({
              data: mockTags,
              error: null,
            }),
          };
        }
        return {};
      });

      const { getByText } = render(<RecipeDetail />);

      // レシピ情報が表示されることを確認
      await waitFor(() => {
        expect(getByText('カレーライス')).toBeTruthy();
        expect(getByText('材料を炒めて煮込む')).toBeTruthy();
      });

      // 材料が表示されることを確認
      await waitFor(() => {
        expect(getByText('• 玉ねぎ')).toBeTruthy();
        expect(getByText('• にんじん')).toBeTruthy();
      });

      // タグが表示されることを確認
      await waitFor(() => {
        expect(getByText('dinner')).toBeTruthy();
        expect(getByText('healthy')).toBeTruthy();
      });
    });

    it('ローディング中はActivityIndicatorが表示される', () => {
      // supabaseのモック（遅延）
      (supabase.from as jest.Mock) = jest.fn(() => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockImplementation(
          () => new Promise(resolve => setTimeout(() => resolve({ data: null, error: null }), 1000))
        ),
      }));

      render(<RecipeDetail />);

      // ActivityIndicatorが表示されることを確認
      // Note: ActivityIndicatorはデフォルトでtestIDを持たないため、
      // スタイルやプロップで確認する必要があります
    });

    it('レシピが見つからない場合、エラーメッセージを表示する', async () => {
      // supabaseのモック（レシピが見つからない）
      (supabase.from as jest.Mock) = jest.fn(() => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { code: 'PGRST116' },
        }),
      }));

      render(<RecipeDetail />);

      // エラーアラートが表示されることを確認
      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith('エラー', 'レシピ詳細の読み込みに失敗しました');
      });
    });
  });

  describe('レシピ削除処理', () => {
    it('削除確認ダイアログが表示される', async () => {
      const mockRecipe = {
        id: mockRecipeId,
        name: 'カレーライス',
        instructions: '材料を炒めて煮込む',
      };

      // supabaseのモック
      (supabase.from as jest.Mock) = jest.fn((table) => {
        if (table === 'recipes') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
              data: mockRecipe,
              error: null,
            }),
            delete: jest.fn().mockReturnThis(),
          };
        }
        if (table === 'ingredients') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockResolvedValue({
              data: [],
              error: null,
            }),
          };
        }
        if (table === 'recipe_tags') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockResolvedValue({
              data: [],
              error: null,
            }),
          };
        }
        return {};
      });

      const { getByText } = render(<RecipeDetail />);

      // レシピが表示されるまで待機
      await waitFor(() => {
        expect(getByText('カレーライス')).toBeTruthy();
      });

      // 削除ボタンをクリック
      const deleteButton = getByText('レシピを削除');
      fireEvent.press(deleteButton);

      // 削除確認ダイアログが表示されることを確認
      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'レシピを削除',
          'このレシピを削除してもよろしいですか？',
          expect.any(Array)
        );
      });
    });
  });
});
