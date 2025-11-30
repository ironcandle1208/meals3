import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import JoinGroup from '../../../../app/(app)/groups/join';
import { useAuth } from '../../../../contexts/AuthContext';
import { useRouter } from 'expo-router';
import { supabase } from '../../../../lib/supabase';

// モックの設定
jest.mock('../../../../contexts/AuthContext');
jest.mock('../../../../lib/supabase');
jest.mock('expo-router');

describe('グループ参加画面', () => {
  let mockRouter: {
    push: jest.Mock;
    replace: jest.Mock;
    back: jest.Mock;
  };
  let mockSession: {
    user: { id: string; email: string };
  };

  beforeEach(() => {
    // 各テストの前にモックをリセット
    jest.clearAllMocks();

    // useAuthのモック
    mockSession = {
      user: { id: 'user-123', email: 'test@example.com' },
    };
    (useAuth as jest.Mock).mockReturnValue({
      session: mockSession,
    });

    // useRouterのモック
    mockRouter = {
      push: jest.fn(),
      replace: jest.fn(),
      back: jest.fn(),
    };
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
  });

  describe('UIレンダリング', () => {
    it('必要な要素が正しく表示される', () => {
      const { getAllByText } = render(<JoinGroup />);

      // タイトルとボタンの確認（複数存在するためgetAllByTextを使用）
      const joinGroupTexts = getAllByText('グループに参加');
      expect(joinGroupTexts.length).toBeGreaterThan(0);
    });
  });

  describe('フォーム入力', () => {
    it('招待コードを入力できる', () => {
      const { getByDisplayValue, getAllByTestId } = render(<JoinGroup />);

      const inputs = getAllByTestId('text-input-outlined');
      const codeInput = inputs[0];
      fireEvent.changeText(codeInput, 'ABC12345');

      expect(getByDisplayValue('ABC12345')).toBeTruthy();
    });

    it('招待コードは自動的に大文字に変換される', () => {
      const { getByDisplayValue, getAllByTestId } = render(<JoinGroup />);

      const inputs = getAllByTestId('text-input-outlined');
      const codeInput = inputs[0];
      fireEvent.changeText(codeInput, 'abc12345');

      expect(getByDisplayValue('ABC12345')).toBeTruthy();
    });
  });

  describe('グループ参加処理', () => {
    it('グループ参加が成功する', async () => {
      const mockGroup = {
        id: 'group-123',
        name: 'テストグループ',
      };

      // supabaseのモック
      (supabase.from as jest.Mock) = jest.fn((table) => {
        if (table === 'groups') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
              data: mockGroup,
              error: null,
            }),
          };
        }
        if (table === 'group_members') {
          // 最初のクエリ（既存メンバーチェック）
          const selectMock = jest.fn().mockReturnThis();
          const eqMock = jest.fn().mockReturnThis();
          const singleMock = jest.fn().mockResolvedValue({
            data: null,
            error: { code: 'PGRST116' }, // Not found
          });

          return {
            select: selectMock,
            eq: eqMock,
            single: singleMock,
            insert: jest.fn().mockResolvedValue({ error: null }),
          };
        }
        return {};
      });

      const { getAllByText, getAllByTestId } = render(<JoinGroup />);

      // フォームに入力
      const inputs = getAllByTestId('text-input-outlined');
      const codeInput = inputs[0];
      fireEvent.changeText(codeInput, 'ABC12345');

      // グループ参加ボタンをクリック
      const joinButtons = getAllByText('グループに参加');
      const joinButton = joinButtons[joinButtons.length - 1]; // 最後の要素がボタン
      fireEvent.press(joinButton);

      // ホーム画面に遷移することを確認
      await waitFor(() => {
        expect(mockRouter.replace).toHaveBeenCalledWith('/');
      });
    });

    it('招待コードが空の場合、エラーメッセージを表示する', async () => {
      const { getAllByText, getByText } = render(<JoinGroup />);

      // グループ参加ボタンをクリック（招待コードは空）
      const joinButtons = getAllByText('グループに参加');
      const joinButton = joinButtons[joinButtons.length - 1];
      fireEvent.press(joinButton);

      // エラーメッセージが表示されることを確認
      await waitFor(() => {
        expect(getByText('招待コードは必須です')).toBeTruthy();
      });
    });

    it('無効な招待コードの場合、エラーメッセージを表示する', async () => {
      // supabaseのモック（グループが見つからない）
      (supabase.from as jest.Mock) = jest.fn(() => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { code: 'PGRST116' },
        }),
      }));

      const { getAllByText, getByText, getAllByTestId } = render(<JoinGroup />);

      // フォームに入力
      const inputs = getAllByTestId('text-input-outlined');
      const codeInput = inputs[0];
      fireEvent.changeText(codeInput, 'INVALID1');

      // グループ参加ボタンをクリック
      const joinButtons = getAllByText('グループに参加');
      const joinButton = joinButtons[joinButtons.length - 1];
      fireEvent.press(joinButton);

      // エラーメッセージが表示されることを確認
      await waitFor(() => {
        expect(getByText('無効な招待コードです')).toBeTruthy();
      });
    });

    it('既にメンバーの場合、エラーメッセージを表示する', async () => {
      const mockGroup = {
        id: 'group-123',
        name: 'テストグループ',
      };

      const mockExistingMember = {
        id: 'member-123',
      };

      // supabaseのモック
      let callCount = 0;
      (supabase.from as jest.Mock) = jest.fn((table) => {
        if (table === 'groups') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
              data: mockGroup,
              error: null,
            }),
          };
        }
        if (table === 'group_members') {
          callCount++;
          if (callCount === 1) {
            // 既存メンバーチェック（メンバーが存在）
            return {
              select: jest.fn().mockReturnThis(),
              eq: jest.fn().mockReturnThis(),
              single: jest.fn().mockResolvedValue({
                data: mockExistingMember,
                error: null,
              }),
            };
          }
        }
        return {};
      });

      const { getAllByText, getByText, getAllByTestId } = render(<JoinGroup />);

      // フォームに入力
      const inputs = getAllByTestId('text-input-outlined');
      const codeInput = inputs[0];
      fireEvent.changeText(codeInput, 'ABC12345');

      // グループ参加ボタンをクリック
      const joinButtons = getAllByText('グループに参加');
      const joinButton = joinButtons[joinButtons.length - 1];
      fireEvent.press(joinButton);

      // エラーメッセージが表示されることを確認
      await waitFor(() => {
        expect(getByText('既にこのグループのメンバーです')).toBeTruthy();
      });
    });
  });
});
