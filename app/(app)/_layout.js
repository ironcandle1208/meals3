import { Tabs } from 'expo-router';
import { IconButton } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function AppLayout() {
  const router = useRouter();

  return (
    <Tabs screenOptions={{
      headerRight: () => (
        <IconButton 
          icon="account-circle" 
          onPress={() => router.push('/profile')} 
        />
      ),
    }}>
      <Tabs.Screen 
        name="index" 
        options={{ 
          title: 'ホーム',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="home" color={color} size={size} />
          ),
        }} 
      />
      <Tabs.Screen 
        name="schedule/index" 
        options={{ 
          title: 'スケジュール',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="calendar" color={color} size={size} />
          ),
        }} 
      />
      <Tabs.Screen 
        name="shopping-list/index" 
        options={{ 
          title: '買い物リスト',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="cart" color={color} size={size} />
          ),
        }} 
      />
      <Tabs.Screen 
        name="profile" 
        options={{ 
          title: 'プロフィール', 
          href: null, // Hide from tab bar
        }} 
      />
      <Tabs.Screen 
        name="groups/create" 
        options={{ 
          title: 'グループ作成', 
          href: null,
          presentation: 'modal'
        }} 
      />
      <Tabs.Screen 
        name="groups/join" 
        options={{ 
          title: 'グループ参加', 
          href: null,
          presentation: 'modal'
        }} 
      />
      <Tabs.Screen 
        name="recipes/index" 
        options={{ 
          title: 'レシピ', 
          href: null,
        }} 
      />
       <Tabs.Screen 
        name="recipes/create" 
        options={{ 
          title: 'レシピ作成', 
          href: null,
        }} 
      />
      <Tabs.Screen 
        name="recipes/edit/[id]" 
        options={{ 
          title: 'レシピ編集', 
          href: null,
        }} 
      />
      <Tabs.Screen 
        name="recipes/[id]" 
        options={{ 
          title: 'レシピ詳細', 
          href: null,
        }} 
      />
    </Tabs>
  );
}
