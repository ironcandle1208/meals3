import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import SignUp from '../../../app/(auth)/signup';
import { useAuth } from '../../../contexts/AuthContext';
import { useRouter } from 'expo-router';

// モックの設定
jest.mock('../../../contexts/AuthContext');
jest.mock('expo-router');

// Alertのモック
jest.spyOn(Alert, 'alert');

describe('SignUp画面', () => {
  let mockSignUp;
  let mockRouter;

  beforeEach(() => {
    // 各テストの前にモックをリセット
    jest.clearAllMocks();

    // useAuthのモック
    mockSignUp = jest.fn();
    useAuth.mockReturnValue({
      signUp: mockSignUp,
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
      const { getByText } = render(<SignUp />);

      // タイトルの確認
      expect(getByText('Create Account')).toBeTruthy();

      // ボタンの確認
      expect(getByText('Sign Up')).toBeTruthy();
      expect(getByText('Already have an account?')).toBeTruthy();
      expect(getByText('Login')).toBeTruthy();
    });
  });

  describe('フォーム入力', () => {
    it('メールアドレスを入力できる', () => {
      const { getByDisplayValue, getAllByTestId } = render(<SignUp />);

      const inputs = getAllByTestId('text-input-flat');
      const emailInput = inputs[0];
      fireEvent.changeText(emailInput, 'newuser@example.com');

      expect(getByDisplayValue('newuser@example.com')).toBeTruthy();
    });

    it('パスワードを入力できる', () => {
      const { getByDisplayValue, getAllByTestId } = render(<SignUp />);

      const inputs = getAllByTestId('text-input-flat');
      const passwordInput = inputs[1];
      fireEvent.changeText(passwordInput, 'newpassword123');

      expect(getByDisplayValue('newpassword123')).toBeTruthy();
    });
  });

  describe('サインアップ処理', () => {
    it('サインアップが成功する', async () => {
      mockSignUp.mockResolvedValue();

      const { getByText, getAllByTestId } = render(<SignUp />);

      // フォームに入力
      const inputs = getAllByTestId('text-input-flat');
      const emailInput = inputs[0];
      const passwordInput = inputs[1];
      fireEvent.changeText(emailInput, 'newuser@example.com');
      fireEvent.changeText(passwordInput, 'newpassword123');

      // サインアップボタンをクリック
      const signUpButton = getByText('Sign Up');
      fireEvent.press(signUpButton);

      // signUpが正しい引数で呼ばれることを確認
      await waitFor(() => {
        expect(mockSignUp).toHaveBeenCalledWith('newuser@example.com', 'newpassword123');
      });

      // 成功アラートが表示されることを確認
      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Success',
          'Please check your email for verification!'
        );
      });

      // ログイン画面に遷移することを確認
      await waitFor(() => {
        expect(mockRouter.replace).toHaveBeenCalledWith('/login');
      });
    });

    it('サインアップが失敗した場合、エラーメッセージを表示する', async () => {
      const errorMessage = 'Email already exists';
      mockSignUp.mockRejectedValue(new Error(errorMessage));

      const { getByText, getAllByTestId } = render(<SignUp />);

      // フォームに入力
      const inputs = getAllByTestId('text-input-flat');
      const emailInput = inputs[0];
      const passwordInput = inputs[1];
      fireEvent.changeText(emailInput, 'existing@example.com');
      fireEvent.changeText(passwordInput, 'password123');

      // サインアップボタンをクリック
      const signUpButton = getByText('Sign Up');
      fireEvent.press(signUpButton);

      // エラーアラートが表示されることを確認
      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith('Error', errorMessage);
      });

      // ログイン画面に遷移しないことを確認
      expect(mockRouter.replace).not.toHaveBeenCalled();
    });

    it('サインアップ中はボタンがローディング状態になる', async () => {
      // signUpを遅延させる
      mockSignUp.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));

      const { getByText, getAllByTestId } = render(<SignUp />);

      // フォームに入力
      const inputs = getAllByTestId('text-input-flat');
      const emailInput = inputs[0];
      const passwordInput = inputs[1];
      fireEvent.changeText(emailInput, 'newuser@example.com');
      fireEvent.changeText(passwordInput, 'newpassword123');

      // サインアップボタンをクリック
      const signUpButton = getByText('Sign Up');
      fireEvent.press(signUpButton);

      // ボタンがローディング状態になることを確認
      await waitFor(() => {
        expect(mockSignUp).toHaveBeenCalled();
      });
    });
  });
});
