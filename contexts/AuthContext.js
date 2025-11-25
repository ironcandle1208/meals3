import React, { createContext, useState, useEffect, useContext } from 'react';
import { supabase } from '../lib/supabase';

// 認証コンテキストの作成
const AuthContext = createContext({});

// 認証コンテキストを利用するためのカスタムフック
export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [group, setGroup] = useState(null); // 選択中のグループを管理

  useEffect(() => {
    // 初回ロード時に現在のセッションを取得
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    // 認証状態の変更（サインイン、サインアウト、トークン更新など）を監視
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (!session) {
        setGroup(null); // サインアウト時に選択中グループをクリア
      }
      setLoading(false);
    });

    // クリーンアップ関数：コンポーネントのアンマウント時にリスナーを解除
    return () => subscription.unsubscribe();
  }, []);

  // サインアップ処理
  const signUp = async (email, password) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
    });
    if (error) throw error;
  };

  // サインイン処理
  const signIn = async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
  };

  // サインアウト処理
  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  return (
    <AuthContext.Provider value={{ session, loading, signUp, signIn, signOut, group, setGroup }}>
      {children}
    </AuthContext.Provider>
  );
};
