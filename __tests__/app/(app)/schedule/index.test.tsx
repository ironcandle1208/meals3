import React from 'react';
import { render } from '@testing-library/react-native';
import Schedule from '../../../../app/(app)/schedule/index';
import { useAuth } from '../../../../contexts/AuthContext';
import { useRouter } from 'expo-router';
import { supabase } from '../../../../lib/supabase';

// モックの設定
jest.mock('../../../../contexts/AuthContext');
jest.mock('../../../../lib/supabase');
jest.mock('expo-router', () => ({
  useRouter: jest.fn(),
  useFocusEffect: jest.fn(),
}));

describe('スケジュール画面', () => {
  let mockRouter: {
    push: jest.Mock;
    replace: jest.Mock;
    back: jest.Mock;
  };
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

    // useRouterのモック
    mockRouter = {
      push: jest.fn(),
      replace: jest.fn(),
      back: jest.fn(),
    };
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
  });

  describe('スケジュールの表示', () => {
    it('グループが選択されていない場合、スケジュールを取得しない', () => {
      // グループなしでモックを設定
      (useAuth as jest.Mock).mockReturnValue({
        group: null,
      });

      const fromMock = jest.fn();
      (supabase.from as jest.Mock) = fromMock;

      render(<Schedule />);

      // supabase.fromが呼ばれないことを確認
      expect(fromMock).not.toHaveBeenCalled();
    });

    it('グループが選択されている場合、スケジュールコンポーネントが表示される', () => {
      // supabaseのモック
      (supabase.from as jest.Mock) = jest.fn(() => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      }));

      const { getByText } = render(<Schedule />);

      // 基本的なUIが表示されることを確認
      expect(getByText('日時を選んでください')).toBeTruthy();
    });
  });
});
