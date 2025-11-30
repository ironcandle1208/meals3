import React, { useState, useCallback } from 'react';
import { View, FlatList, StyleSheet } from 'react-native';
import { Text, Card, FAB, ActivityIndicator, Searchbar } from 'react-native-paper';
import { useRouter, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useAuth } from '../../../contexts/AuthContext';
import { supabase } from '../../../lib/supabase';
import { Tables } from '../../../types/database.types';

type Recipe = Tables<'recipes'>;

export default function RecipeList() {
  const router = useRouter();
  const { group } = useAuth();
  const params = useLocalSearchParams<{ mode?: string; date?: string; mealType?: string }>();
  const { mode, date, mealType } = params;
  
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  useFocusEffect(
    useCallback(() => {
      if (!group) {
        router.replace('/');
        return;
      }
      fetchRecipes();
    }, [group])
  );

  // レシピ一覧の取得処理
  const fetchRecipes = async () => {
    try {
      setLoading(true);
      // 選択中のグループIDに紐づくレシピを取得
      let query = supabase
        .from('recipes')
        .select('*')
        .eq('group_id', group?.id)
        .order('created_at', { ascending: false });

      // 検索クエリがある場合は名前でフィルタリング（大文字小文字無視）
      if (searchQuery) {
        query = query.ilike('name', `%${searchQuery}%`);
      }

      const { data, error } = await query;

      if (error) throw error;
      setRecipes(data || []);
    } catch (error) {
      console.error('Error fetching recipes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRecipePress = async (recipe: Recipe) => {
    if (mode === 'select') {
      try {
        setLoading(true);
        // スケジュールに登録
        const { error } = await supabase
          .from('schedules')
          .insert([
            {
              group_id: group?.id,
              date: date,
              meal_type: mealType,
              recipe_id: recipe.id
            }
          ]);

        if (error) throw error;
        
        // 買い物リストへの追加ロジックはここか、トリガーで実装
        // 今回はシンプルにスケジュール登録のみ
        
        router.back();
      } catch (error) {
        console.error('Error scheduling meal:', error);
        // Alert.alert('Error', 'Failed to schedule meal');
      } finally {
        setLoading(false);
      }
    } else {
      router.push(`/recipes/${recipe.id}`);
    }
  };

  const renderRecipeItem = ({ item }: { item: Recipe }) => (
    <Card style={styles.card} onPress={() => handleRecipePress(item)}>
      {item.image_url && <Card.Cover source={{ uri: item.image_url }} />}
      <Card.Title 
        title={item.name} 
        subtitle={mode === 'select' ? 'タップして選択' : undefined}
      />
    </Card>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text variant="headlineSmall">{group?.name} のレシピ</Text>
      </View>
      
      <Searchbar
        placeholder="レシピ名で検索"
        onChangeText={setSearchQuery}
        value={searchQuery}
        onSubmitEditing={fetchRecipes}
        style={styles.searchBar}
      />

      {loading ? (
        <ActivityIndicator animating={true} style={styles.loader} />
      ) : (
        <FlatList
          data={recipes}
          renderItem={renderRecipeItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <Text style={styles.emptyText}>レシピがありません。登録してみましょう！</Text>
          }
        />
      )}

      <FAB
        icon="plus"
        style={styles.fab}
        onPress={() => router.push('/recipes/create')}
        label="レシピ登録"
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
    padding: 20,
    backgroundColor: '#fff',
    elevation: 2,
  },
  searchBar: {
    margin: 10,
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
