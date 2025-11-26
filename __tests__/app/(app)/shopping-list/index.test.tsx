import React from 'react';
import { render } from '@testing-library/react-native';
import ShoppingList from '../../../../app/(app)/shopping-list/index';
import { useAuth } from '../../../../contexts/AuthContext';
import { supabase } from '../../../../lib/supabase';

// モックの設定
jest.mock('../../../../contexts/AuthContext');
jest.mock('../../../../lib/supabase');
jest.mock('expo-router', () => ({
  useFocusEffect: jest.fn(),
}));

describe('買い物リスト画面', () => {
  let mockGroup: {
    id: string;
    name: string;
  };

  beforeEach(() => {
    // 各テストの前にモックをリセット
    jest.clearAllMocks();

    // useAuthのモック
    mockGroup = {
      id: 'group-123',
      name: 'テストグループ',
    };
    (useAuth as jest.Mock).mockReturnValue({
      group: mockGroup,
    });
  });

  describe('買い物リストの表示', () => {
    it('グループが選択されていない場合、リストを取得しない', () => {
      // グループなしでモックを設定
      (useAuth as jest.Mock).mockReturnValue({
        group: null,
      });

      const fromMock = jest.fn();
      (supabase.from as jest.Mock) = fromMock;

      render(<ShoppingList />);

      // supabase.fromが呼ばれないことを確認
      expect(fromMock).not.toHaveBeenCalled();
    });

    it('グループが選択されている場合、買い物リストコンポーネントが表示される', () => {
      // supabaseのモック
      (supabase.from as jest.Mock) = jest.fn(() => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      }));

      const { getByText } = render(<ShoppingList />);

      // 基本的なUIが表示されることを確認
      expect(getByText('Shopping List')).toBeTruthy();
      expect(getByText('Generate from Schedule')).toBeTruthy();
    });
  });
});
