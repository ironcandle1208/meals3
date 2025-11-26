import React, { useState, useCallback } from 'react';
import { View, FlatList, StyleSheet } from 'react-native';
import { Text, Button, Card, FAB, ActivityIndicator } from 'react-native-paper';
import { useRouter, useFocusEffect } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Tables } from '../../types/database.types';

type Group = Tables<'groups'>;

export default function Index() {
  const router = useRouter();
  const { signOut, session, setGroup } = useAuth();
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);

  // ユーザーが所属するグループ一覧を取得
  const fetchGroups = async () => {
    // セッションが存在しない場合は処理をスキップ
    if (!session?.user?.id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      // RLSポリシーに準拠するため、group_membersテーブルから開始してJOIN
      const { data, error } = await supabase
        .from('group_members')
        .select('group_id, groups(*)')
        .eq('user_id', session.user.id)
        .order('groups(created_at)', { ascending: false });

      if (error) throw error;
      // group_membersから取得したデータを整形（groupsオブジェクトのみを抽出）
      const groupsData = data?.map(item => item.groups).filter(Boolean) as Group[] || [];
      setGroups(groupsData);
    } catch (error) {
      console.error('Error fetching groups:', error);
    } finally {
      setLoading(false);
    }
  };

  // 画面が表示されるたびにグループ一覧を再取得
  // sessionが変更された場合も再取得
  useFocusEffect(
    useCallback(() => {
      fetchGroups();
    }, [session])
  );

  // グループ選択時の処理：Contextにセットしてレシピ一覧へ遷移
  const handleGroupPress = (group: Group) => {
    setGroup(group);
    router.push('/recipes');
  };

  const renderGroupItem = ({ item }: { item: Group }) => (
    <Card style={styles.card} onPress={() => handleGroupPress(item)}>
      <Card.Title title={item.name} subtitle={`Created: ${new Date(item.created_at).toLocaleDateString()}`} />
    </Card>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text variant="headlineMedium">グループ一覧</Text>
        <View style={styles.headerButtons}>
          <Button mode="text" onPress={() => router.push('/groups/join')}>グループ参加</Button>
          <Button mode="text" onPress={signOut}>サインアウト</Button>
        </View>
      </View>

      {loading ? (
        <ActivityIndicator animating={true} style={styles.loader} />
      ) : (
        <FlatList
          data={groups}
          renderItem={renderGroupItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <Text style={styles.emptyText}>グループがありません</Text>
          }
        />
      )}

      <FAB
        icon="plus"
        style={styles.fab}
        onPress={() => router.push('/groups/create')}
        label="グループ作成"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
    elevation: 2,
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 5,
  },
  list: {
    padding: 10,
    paddingBottom: 80,
  },
  card: {
    marginBottom: 10,
  },
  loader: {
    marginTop: 20,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 20,
    color: '#666',
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
  },
});
