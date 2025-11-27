// Jest セットアップファイル
// テスト実行前に必要な初期化処理を記述

// React Native Paper のモック
jest.mock('react-native-paper', () => {
  const RealModule = jest.requireActual('react-native-paper');
  return {
    ...RealModule,
    Portal: ({ children }: { children: React.ReactNode }) => children,
  };
});

// Expo Router のモック
jest.mock('expo-router', () => ({
  useRouter: jest.fn(() => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  })),
  useLocalSearchParams: jest.fn(() => ({})),
  useFocusEffect: jest.fn((callback) => callback()),
  router: {
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  },
  Link: ({ children }: { children: React.ReactNode }) => children,
}));

// React Native Calendars のモック
jest.mock('react-native-calendars', () => ({
  Calendar: 'Calendar',
}));

// React Native Safe Area Context のモック
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaProvider: ({ children }: { children: React.ReactNode }) => children,
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

// Supabase のモック（単体テストのみ）
// 統合テストとE2Eテストでは実際のSupabaseクライアントを使用するため、モックをスキップ
const isIntegrationOrE2ETest = process.env.JEST_TEST_PATH?.includes('integration') || 
                                process.env.JEST_TEST_PATH?.includes('e2e');

if (!isIntegrationOrE2ETest) {
  jest.mock('./lib/supabase', () => ({
    supabase: {
      auth: {
        getSession: jest.fn(() => Promise.resolve({ data: { session: null } })),
        onAuthStateChange: jest.fn(() => ({
          data: { subscription: { unsubscribe: jest.fn() } },
        })),
        signUp: jest.fn(),
        signInWithPassword: jest.fn(),
        signOut: jest.fn(),
      },
      from: jest.fn(() => ({
        select: jest.fn().mockReturnThis(),
        insert: jest.fn().mockReturnThis(),
        update: jest.fn().mockReturnThis(),
        delete: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn(),
      })),
    },
  }));
}
