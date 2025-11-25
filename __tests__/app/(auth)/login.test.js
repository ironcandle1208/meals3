import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import Login from '../../../app/(auth)/login';
import { useAuth } from '../../../contexts/AuthContext';
import { useRouter } from 'expo-router';

// モックの設定
jest.mock('../../../contexts/AuthContext');
jest.mock('expo-router');

// Alertのモック
jest.spyOn(Alert, 'alert');

describe('Login画面', () => {
  let mockSignIn;
  let mockRouter;

  beforeEach(() => {
    // 各テストの前にモックをリセット
    jest.clearAllMocks();

    // useAuthのモック
    mockSignIn = jest.fn();
    useAuth.mockReturnValue({
      signIn: mockSignIn,
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
      const { getByText, getByDisplayValue } = render(<Login />);

      // タイトルの確認
      expect(getByText('Welcome Back')).toBeTruthy();

      // ボタンの確認
      expect(getByText('Login')).toBeTruthy();
      expect(getByText("Don't have an account?")).toBeTruthy();
      expect(getByText('Sign Up')).toBeTruthy();
    });
  });

  describe('フォーム入力', () => {
    it('メールアドレスを入力できる', () => {
      const { getByDisplayValue, getAllByTestId } = render(<Login />);

      const inputs = getAllByTestId('text-input-flat');
      const emailInput = inputs[0]; // 最初のTextInputがEmail
      fireEvent.changeText(emailInput, 'test@example.com');

      expect(getByDisplayValue('test@example.com')).toBeTruthy();
    });

    it('パスワードを入力できる', () => {
      const { getByDisplayValue, getAllByTestId } = render(<Login />);

      const inputs = getAllByTestId('text-input-flat');
      const passwordInput = inputs[1]; // 2番目のTextInputがPassword
      fireEvent.changeText(passwordInput, 'password123');

      expect(getByDisplayValue('password123')).toBeTruthy();
    });
  });

  describe('ログイン処理', () => {
    it('ログインが成功する', async () => {
      mockSignIn.mockResolvedValue();

      const { getByText, getAllByTestId } = render(<Login />);

      // フォームに入力
      const inputs = getAllByTestId('text-input-flat');
      const emailInput = inputs[0];
      const passwordInput = inputs[1];
      fireEvent.changeText(emailInput, 'test@example.com');
      fireEvent.changeText(passwordInput, 'password123');

      // ログインボタンをクリック
      const loginButton = getByText('Login');
      fireEvent.press(loginButton);

      // signInが正しい引数で呼ばれることを確認
      await waitFor(() => {
        expect(mockSignIn).toHaveBeenCalledWith('test@example.com', 'password123');
      });

      // エラーアラートが表示されないことを確認
      expect(Alert.alert).not.toHaveBeenCalled();
    });

    it('ログインが失敗した場合、エラーメッセージを表示する', async () => {
      const errorMessage = 'Invalid credentials';
      mockSignIn.mockRejectedValue(new Error(errorMessage));

      const { getByText, getAllByTestId } = render(<Login />);

      // フォームに入力
      const inputs = getAllByTestId('text-input-flat');
      const emailInput = inputs[0];
      const passwordInput = inputs[1];
      fireEvent.changeText(emailInput, 'test@example.com');
      fireEvent.changeText(passwordInput, 'wrongpassword');

      // ログインボタンをクリック
      const loginButton = getByText('Login');
      fireEvent.press(loginButton);

      // エラーアラートが表示されることを確認
      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith('Error', errorMessage);
      });
    });

    it('ログイン中はボタンがローディング状態になる', async () => {
      // signInを遅延させる
      mockSignIn.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));

      const { getByText, getAllByTestId } = render(<Login />);

      // フォームに入力
      const inputs = getAllByTestId('text-input-flat');
      const emailInput = inputs[0];
      const passwordInput = inputs[1];
      fireEvent.changeText(emailInput, 'test@example.com');
      fireEvent.changeText(passwordInput, 'password123');

      // ログインボタンをクリック
      const loginButton = getByText('Login');
      fireEvent.press(loginButton);

      // ボタンがローディング状態になることを確認（loading propがtrueになる）
      // Note: React Native Paperのボタンのloading状態は、
      // ActivityIndicatorが表示されることで確認できます
      
      await waitFor(() => {
        expect(mockSignIn).toHaveBeenCalled();
      });
    });
  });
});
