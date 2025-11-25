import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import CreateGroup from '../../../../app/(app)/groups/create';
import { useAuth } from '../../../../contexts/AuthContext';
import { useRouter } from 'expo-router';
import { supabase } from '../../../../lib/supabase';

// モックの設定
jest.mock('../../../../contexts/AuthContext');
jest.mock('../../../../lib/supabase');
jest.mock('expo-router');

describe('グループ作成画面', () => {
  let mockRouter;
  let mockSession;

  beforeEach(() => {
    // 各テストの前にモックをリセット
    jest.clearAllMocks();

    // useAuthのモック
    mockSession = {
      user: { id: 'user-123', email: 'test@example.com' },
    };
    useAuth.mockReturnValue({
      session: mockSession,
    });

    // useRouterのモック
    mockRouter = {
      push: jest.fn(),
      replace: jest.fn(),
      back: jest.fn(),
    };
    useRouter.mockReturnValue(mockRouter);

    // supabaseのモック
    supabase.from = jest.fn(() => ({
      insert: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      single: jest.fn(),
    }));
  });

  describe('UIレンダリング', () => {
    it('必要な要素が正しく表示される', () => {
      const { getByText } = render(<CreateGroup />);

      // タイトルの確認
      expect(getByText('新規グループ作成')).toBeTruthy();

      // ボタンの確認
      expect(getByText('グループ作成')).toBeTruthy();
    });
  });

  describe('フォーム入力', () => {
    it('グループ名を入力できる', () => {
      const { getByDisplayValue, getAllByTestId } = render(<CreateGroup />);

      const inputs = getAllByTestId('text-input-outlined');
      const nameInput = inputs[0];
      fireEvent.changeText(nameInput, 'テストグループ');

      expect(getByDisplayValue('テストグループ')).toBeTruthy();
    });
  });

  describe('グループ作成処理', () => {
    it('グループ作成が成功する', async () => {
      const mockGroup = {
        id: 'group-123',
        name: 'テストグループ',
        invitation_code: 'ABC12345',
      };

      // グループ作成のモック
      const mockInsert = jest.fn().mockReturnThis();
      const mockSelect = jest.fn().mockReturnThis();
      const mockSingle = jest.fn().mockResolvedValue({
        data: mockGroup,
        error: null,
      });

      supabase.from = jest.fn((table) => {
        if (table === 'groups') {
          return {
            insert: mockInsert,
            select: mockSelect,
            single: mockSingle,
          };
        }
        if (table === 'group_members') {
          return {
            insert: jest.fn().mockResolvedValue({ error: null }),
          };
        }
      });

      const { getByText, getAllByTestId } = render(<CreateGroup />);

      // フォームに入力
      const inputs = getAllByTestId('text-input-outlined');
      const nameInput = inputs[0];
      fireEvent.changeText(nameInput, 'テストグループ');

      // グループ作成ボタンをクリック
      const createButton = getByText('グループ作成');
      fireEvent.press(createButton);

      // グループが作成されることを確認
      await waitFor(() => {
        expect(mockInsert).toHaveBeenCalledWith([
          { name: 'テストグループ', created_by: 'user-123' },
        ]);
      });

      // 招待コードが表示されることを確認
      await waitFor(() => {
        expect(getByText('グループ作成完了!')).toBeTruthy();
        expect(getByText('ABC12345')).toBeTruthy();
      });
    });

    it('グループ名が空の場合、エラーメッセージを表示する', async () => {
      const { getByText } = render(<CreateGroup />);

      // グループ作成ボタンをクリック（グループ名は空）
      const createButton = getByText('グループ作成');
      fireEvent.press(createButton);

      // エラーメッセージが表示されることを確認
      await waitFor(() => {
        expect(getByText('Group name is required')).toBeTruthy();
      });
    });

    it('グループ作成が失敗した場合、エラーメッセージを表示する', async () => {
      const errorMessage = 'Database error';

      // グループ作成のモック（エラー）
      supabase.from = jest.fn(() => ({
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { message: errorMessage },
        }),
      }));

      const { getByText, getAllByTestId } = render(<CreateGroup />);

      // フォームに入力
      const inputs = getAllByTestId('text-input-outlined');
      const nameInput = inputs[0];
      fireEvent.changeText(nameInput, 'テストグループ');

      // グループ作成ボタンをクリック
      const createButton = getByText('グループ作成');
      fireEvent.press(createButton);

      // エラーメッセージが表示されることを確認
      await waitFor(() => {
        expect(getByText(errorMessage)).toBeTruthy();
      });
    });

    it('招待コードモーダルを閉じると前の画面に戻る', async () => {
      const mockGroup = {
        id: 'group-123',
        name: 'テストグループ',
        invitation_code: 'ABC12345',
      };

      // グループ作成のモック
      supabase.from = jest.fn((table) => {
        if (table === 'groups') {
          return {
            insert: jest.fn().mockReturnThis(),
            select: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
              data: mockGroup,
              error: null,
            }),
          };
        }
        if (table === 'group_members') {
          return {
            insert: jest.fn().mockResolvedValue({ error: null }),
          };
        }
      });

      const { getByText, getAllByTestId } = render(<CreateGroup />);

      // フォームに入力
      const inputs = getAllByTestId('text-input-outlined');
      const nameInput = inputs[0];
      fireEvent.changeText(nameInput, 'テストグループ');

      // グループ作成ボタンをクリック
      const createButton = getByText('グループ作成');
      fireEvent.press(createButton);

      // 招待コードモーダルが表示されるまで待機
      await waitFor(() => {
        expect(getByText('グループ作成完了!')).toBeTruthy();
      });

      // 完了ボタンをクリック
      const doneButton = getByText('完了');
      fireEvent.press(doneButton);

      // 前の画面に戻ることを確認
      expect(mockRouter.back).toHaveBeenCalled();
    });
  });
});
