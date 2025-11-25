import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react-native';
import { AuthProvider, useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';

// Supabaseのモック
jest.mock('../../lib/supabase');

describe('AuthContext', () => {
  // 各テストの前にモックをリセット
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('初期化', () => {
    it('初期状態ではloadingがtrueである', () => {
      // getSessionのモックを設定（Promiseを返す）
      supabase.auth.getSession.mockResolvedValue({
        data: { session: null },
      });

      // onAuthStateChangeのモックを設定
      supabase.auth.onAuthStateChange.mockReturnValue({
        data: { subscription: { unsubscribe: jest.fn() } },
      });

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      // 初期状態ではloadingがtrue
      expect(result.current.loading).toBe(true);
    });

    it('セッションを正しく取得する', async () => {
      const mockSession = {
        user: { id: 'user-123', email: 'test@example.com' },
        access_token: 'token-123',
      };

      supabase.auth.getSession.mockResolvedValue({
        data: { session: mockSession },
      });

      supabase.auth.onAuthStateChange.mockReturnValue({
        data: { subscription: { unsubscribe: jest.fn() } },
      });

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      // セッションが取得されるまで待機
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.session).toEqual(mockSession);
    });
  });

  describe('signUp', () => {
    it('サインアップが成功する', async () => {
      supabase.auth.getSession.mockResolvedValue({
        data: { session: null },
      });

      supabase.auth.onAuthStateChange.mockReturnValue({
        data: { subscription: { unsubscribe: jest.fn() } },
      });

      supabase.auth.signUp.mockResolvedValue({
        data: { user: { id: 'new-user-123' } },
        error: null,
      });

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // サインアップを実行
      await act(async () => {
        await result.current.signUp('test@example.com', 'password123');
      });

      // signUpが正しい引数で呼ばれたことを確認
      expect(supabase.auth.signUp).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      });
    });

    it('サインアップが失敗した場合、エラーをスローする', async () => {
      supabase.auth.getSession.mockResolvedValue({
        data: { session: null },
      });

      supabase.auth.onAuthStateChange.mockReturnValue({
        data: { subscription: { unsubscribe: jest.fn() } },
      });

      const mockError = new Error('Email already exists');
      supabase.auth.signUp.mockResolvedValue({
        data: null,
        error: mockError,
      });

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // サインアップがエラーをスローすることを確認
      await expect(
        act(async () => {
          await result.current.signUp('test@example.com', 'password123');
        })
      ).rejects.toThrow('Email already exists');
    });
  });

  describe('signIn', () => {
    it('サインインが成功する', async () => {
      supabase.auth.getSession.mockResolvedValue({
        data: { session: null },
      });

      supabase.auth.onAuthStateChange.mockReturnValue({
        data: { subscription: { unsubscribe: jest.fn() } },
      });

      supabase.auth.signInWithPassword.mockResolvedValue({
        data: { session: { user: { id: 'user-123' } } },
        error: null,
      });

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // サインインを実行
      await act(async () => {
        await result.current.signIn('test@example.com', 'password123');
      });

      // signInWithPasswordが正しい引数で呼ばれたことを確認
      expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      });
    });

    it('サインインが失敗した場合、エラーをスローする', async () => {
      supabase.auth.getSession.mockResolvedValue({
        data: { session: null },
      });

      supabase.auth.onAuthStateChange.mockReturnValue({
        data: { subscription: { unsubscribe: jest.fn() } },
      });

      const mockError = new Error('Invalid credentials');
      supabase.auth.signInWithPassword.mockResolvedValue({
        data: null,
        error: mockError,
      });

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // サインインがエラーをスローすることを確認
      await expect(
        act(async () => {
          await result.current.signIn('test@example.com', 'wrongpassword');
        })
      ).rejects.toThrow('Invalid credentials');
    });
  });

  describe('signOut', () => {
    it('サインアウトが成功する', async () => {
      const mockSession = {
        user: { id: 'user-123', email: 'test@example.com' },
      };

      supabase.auth.getSession.mockResolvedValue({
        data: { session: mockSession },
      });

      supabase.auth.onAuthStateChange.mockReturnValue({
        data: { subscription: { unsubscribe: jest.fn() } },
      });

      supabase.auth.signOut.mockResolvedValue({
        error: null,
      });

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // サインアウトを実行
      await act(async () => {
        await result.current.signOut();
      });

      // signOutが呼ばれたことを確認
      expect(supabase.auth.signOut).toHaveBeenCalled();
    });
  });

  describe('グループ管理', () => {
    it('グループを設定できる', async () => {
      supabase.auth.getSession.mockResolvedValue({
        data: { session: null },
      });

      supabase.auth.onAuthStateChange.mockReturnValue({
        data: { subscription: { unsubscribe: jest.fn() } },
      });

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const mockGroup = { id: 'group-123', name: 'Test Group' };

      // グループを設定
      act(() => {
        result.current.setGroup(mockGroup);
      });

      expect(result.current.group).toEqual(mockGroup);
    });

    it('サインアウト時にグループがクリアされる', async () => {
      const mockSession = {
        user: { id: 'user-123', email: 'test@example.com' },
      };

      let authStateCallback;
      supabase.auth.getSession.mockResolvedValue({
        data: { session: mockSession },
      });

      supabase.auth.onAuthStateChange.mockImplementation((callback) => {
        authStateCallback = callback;
        return {
          data: { subscription: { unsubscribe: jest.fn() } },
        };
      });

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // グループを設定
      const mockGroup = { id: 'group-123', name: 'Test Group' };
      act(() => {
        result.current.setGroup(mockGroup);
      });

      expect(result.current.group).toEqual(mockGroup);

      // サインアウトをシミュレート（セッションをnullに）
      act(() => {
        authStateCallback('SIGNED_OUT', null);
      });

      // グループがクリアされることを確認
      expect(result.current.group).toBeNull();
    });
  });
});
