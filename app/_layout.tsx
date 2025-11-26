import { Stack, useRouter, useSegments } from 'expo-router';
import { PaperProvider } from 'react-native-paper';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from '../contexts/AuthContext';
import { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';

const queryClient = new QueryClient();

function RootLayoutNav() {
  const { session, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  // 認証状態と現在のルートセグメントに基づいてリダイレクトを制御
  useEffect(() => {
    if (loading) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!session && !inAuthGroup) {
      // セッションがなく、認証グループ（ログイン/サインアップ）にいない場合はログイン画面へリダイレクト
      router.replace('/login');
    } else if (session && inAuthGroup) {
      // セッションがあり、認証グループにいる場合はホーム画面へリダイレクト
      router.replace('/(app)');
    }
  }, [session, loading, segments]);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    // React Queryのクライアントプロバイダー
    <QueryClientProvider client={queryClient}>
      {/* React Native Paperのプロバイダー（UIコンポーネント用） */}
      <PaperProvider>
        {/* スタックナビゲーションの設定 */}
        <Stack>
          <Stack.Screen name="(app)" options={{ headerShown: false }} />
          <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        </Stack>
      </PaperProvider>
    </QueryClientProvider>
  );
}

export default function RootLayout() {
  return (
    // アプリ全体で認証状態を共有するためのプロバイダー
    <AuthProvider>
      <RootLayoutNav />
    </AuthProvider>
  );
}
