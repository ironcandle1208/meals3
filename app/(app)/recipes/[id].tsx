import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, Alert } from 'react-native';
import { Text, Card, Chip, ActivityIndicator, Button, Divider } from 'react-native-paper';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '../../../lib/supabase';
import { Tables } from '../../../types/database.types';

type Recipe = Tables<'recipes'>;
type Ingredient = Tables<'ingredients'>;
type Tag = Tables<'tags'>;

export default function RecipeDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRecipeDetails();
  }, [id]);

  const fetchRecipeDetails = async () => {
    try {
      setLoading(true);
      
      // レシピ情報の取得
      const { data: recipeData, error: recipeError } = await supabase
        .from('recipes')
        .select('*')
        .eq('id', id)
        .single();
      
      if (recipeError) throw recipeError;
      setRecipe(recipeData);

      // 材料一覧の取得
      const { data: ingredientsData, error: ingredientsError } = await supabase
        .from('ingredients')
        .select('*')
        .eq('recipe_id', id);

      if (ingredientsError) throw ingredientsError;
      setIngredients(ingredientsData || []);

      // タグ一覧の取得（中間テーブルを経由してタグ情報を取得）
      const { data: tagsData, error: tagsError } = await supabase
        .from('recipe_tags')
        .select('tags(id, name)')
        .eq('recipe_id', id);

      if (tagsError) throw tagsError;
      setTags(tagsData.map(t => t.tags).filter(Boolean) as Tag[] || []);

    } catch (error) {
      console.error('Error fetching recipe details:', error);
      Alert.alert('Error', 'Failed to load recipe details');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    Alert.alert(
      'Delete Recipe',
      'Are you sure you want to delete this recipe?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('recipes')
                .delete()
                .eq('id', id);
              if (error) throw error;
              router.back();
            } catch (error) {
              console.error('Error deleting recipe:', error);
              Alert.alert('Error', 'Failed to delete recipe');
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return <ActivityIndicator animating={true} style={styles.loader} />;
  }

  if (!recipe) {
    return (
      <View style={styles.container}>
        <Text>Recipe not found</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {recipe.image_url && (
        <Card.Cover source={{ uri: recipe.image_url }} style={styles.image} />
      )}
      
      <View style={styles.content}>
        <Text variant="headlineMedium" style={styles.title}>{recipe.name}</Text>
        
        <View style={styles.tags}>
          {tags.map(tag => (
            <Chip key={tag.id} style={styles.tag}>{tag.name}</Chip>
          ))}
        </View>

        <Divider style={styles.divider} />

        <Text variant="titleLarge" style={styles.sectionTitle}>Ingredients</Text>
        {ingredients.map((ingredient, index) => (
          <View key={index} style={styles.ingredientRow}>
            <Text variant="bodyLarge" style={styles.ingredientName}>• {ingredient.name}</Text>
            <Text variant="bodyLarge" style={styles.ingredientQty}>
              {ingredient.quantity} {ingredient.unit}
            </Text>
          </View>
        ))}

        <Divider style={styles.divider} />

        <Text variant="titleLarge" style={styles.sectionTitle}>Instructions</Text>
        <Text variant="bodyLarge" style={styles.instructions}>{recipe.instructions}</Text>

        <Button 
          mode="outlined" 
          onPress={() => router.push(`/recipes/edit/${id}`)}
          style={styles.editButton}
        >
          Edit Recipe
        </Button>

        <Button 
          mode="contained" 
          buttonColor="#ff4444" 
          onPress={handleDelete}
          style={styles.deleteButton}
        >
          Delete Recipe
        </Button>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loader: {
    marginTop: 50,
  },
  image: {
    height: 200,
  },
  content: {
    padding: 20,
  },
  title: {
    marginBottom: 10,
    fontWeight: 'bold',
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  tag: {
    backgroundColor: '#e0e0e0',
  },
  divider: {
    marginVertical: 20,
  },
  sectionTitle: {
    marginBottom: 10,
    fontWeight: 'bold',
  },
  ingredientRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  ingredientName: {
    flex: 2,
  },
  ingredientQty: {
    flex: 1,
    textAlign: 'right',
    color: '#666',
  },
  instructions: {
    lineHeight: 24,
  },
  editButton: {
    marginTop: 30,
  },
  deleteButton: {
    marginTop: 10,
  },
});
