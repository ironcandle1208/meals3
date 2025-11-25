import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, Alert } from 'react-native';
import { TextInput, Button, Text, HelperText, IconButton, ActivityIndicator } from 'react-native-paper';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { supabase } from '../../../../lib/supabase';
import { useAuth } from '../../../../contexts/AuthContext';

export default function EditRecipe() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { group } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [name, setName] = useState('');
  const [instructions, setInstructions] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [tags, setTags] = useState('');
  const [ingredients, setIngredients] = useState([{ name: '', quantity: '', unit: '' }]);

  useEffect(() => {
    fetchRecipeData();
  }, [id]);

  // 既存のレシピデータを取得
  const fetchRecipeData = async () => {
    try {
      setLoading(true);
      
      // レシピ情報の取得
      const { data: recipeData, error: recipeError } = await supabase
        .from('recipes')
        .select('*')
        .eq('id', id)
        .single();
      
      if (recipeError) throw recipeError;
      
      setName(recipeData.name);
      setInstructions(recipeData.instructions || '');
      setImageUrl(recipeData.image_url || '');

      // 材料の取得
      const { data: ingredientsData, error: ingredientsError } = await supabase
        .from('ingredients')
        .select('*')
        .eq('recipe_id', id);

      if (ingredientsError) throw ingredientsError;
      
      if (ingredientsData && ingredientsData.length > 0) {
        setIngredients(ingredientsData.map(i => ({
          id: i.id,
          name: i.name,
          quantity: i.quantity || '',
          unit: i.unit || ''
        })));
      }

      // タグの取得
      const { data: tagsData, error: tagsError } = await supabase
        .from('recipe_tags')
        .select('tags(name)')
        .eq('recipe_id', id);

      if (tagsError) throw tagsError;
      
      if (tagsData && tagsData.length > 0) {
        const tagNames = tagsData.map(t => t.tags.name).join(', ');
        setTags(tagNames);
      }

    } catch (err) {
      console.error('Error fetching recipe:', err);
      Alert.alert('Error', 'Failed to load recipe');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  // 材料の追加・削除・変更ハンドラ
  const handleAddIngredient = () => {
    setIngredients([...ingredients, { name: '', quantity: '', unit: '' }]);
  };

  const handleRemoveIngredient = (index) => {
    const newIngredients = [...ingredients];
    newIngredients.splice(index, 1);
    setIngredients(newIngredients);
  };

  const handleIngredientChange = (text, index, field) => {
    const newIngredients = [...ingredients];
    newIngredients[index][field] = text;
    setIngredients(newIngredients);
  };

  // レシピの更新処理
  const handleUpdateRecipe = async () => {
    if (!name.trim()) {
      setError('Recipe name is required');
      return;
    }

    setSaving(true);
    setError('');

    try {
      // 1. レシピ情報の更新
      const { error: recipeError } = await supabase
        .from('recipes')
        .update({
          name: name.trim(),
          instructions: instructions.trim(),
          image_url: imageUrl.trim() || null,
        })
        .eq('id', id);

      if (recipeError) throw recipeError;

      // 2. 既存の材料を削除して新しく挿入
      const { error: deleteIngredientsError } = await supabase
        .from('ingredients')
        .delete()
        .eq('recipe_id', id);

      if (deleteIngredientsError) throw deleteIngredientsError;

      const validIngredients = ingredients.filter(i => i.name.trim());
      if (validIngredients.length > 0) {
        const ingredientsData = validIngredients.map(i => ({
          recipe_id: id,
          name: i.name.trim(),
          quantity: i.quantity.trim() || null,
          unit: i.unit.trim() || null,
        }));

        const { error: ingredientsError } = await supabase
          .from('ingredients')
          .insert(ingredientsData);

        if (ingredientsError) throw ingredientsError;
      }

      // 3. タグの更新（既存のタグ関連付けを削除して再作成）
      const { error: deleteTagsError } = await supabase
        .from('recipe_tags')
        .delete()
        .eq('recipe_id', id);

      if (deleteTagsError) throw deleteTagsError;

      const tagNames = tags.split(',').map(t => t.trim()).filter(t => t);
      if (tagNames.length > 0) {
        const tagIds = [];
        for (const tagName of tagNames) {
          const { data: tag, error: tagError } = await supabase
            .from('tags')
            .upsert({ group_id: group.id, name: tagName }, { onConflict: 'group_id, name' })
            .select()
            .single();
          
          if (tagError) throw tagError;
          tagIds.push(tag.id);
        }

        const recipeTagsData = tagIds.map(tagId => ({
          recipe_id: id,
          tag_id: tagId
        }));

        const { error: recipeTagsError } = await supabase
          .from('recipe_tags')
          .insert(recipeTagsData);

        if (recipeTagsError) throw recipeTagsError;
      }

      router.back();
    } catch (err) {
      console.error('Error updating recipe:', err);
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator animating={true} size="large" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text variant="headlineMedium" style={styles.title}>Edit Recipe</Text>

      <TextInput
        label="Recipe Name *"
        value={name}
        onChangeText={setName}
        mode="outlined"
        style={styles.input}
      />

      <TextInput
        label="Image URL"
        value={imageUrl}
        onChangeText={setImageUrl}
        mode="outlined"
        style={styles.input}
      />

      <TextInput
        label="Instructions"
        value={instructions}
        onChangeText={setInstructions}
        mode="outlined"
        multiline
        numberOfLines={4}
        style={styles.input}
      />

      <Text variant="titleMedium" style={styles.sectionTitle}>Ingredients</Text>
      {ingredients.map((ingredient, index) => (
        <View key={index} style={styles.ingredientRow}>
          <TextInput
            label="Name"
            value={ingredient.name}
            onChangeText={(text) => handleIngredientChange(text, index, 'name')}
            mode="outlined"
            style={[styles.input, styles.ingredientInput, { flex: 2 }]}
          />
          <TextInput
            label="Qty"
            value={ingredient.quantity}
            onChangeText={(text) => handleIngredientChange(text, index, 'quantity')}
            mode="outlined"
            style={[styles.input, styles.ingredientInput, { flex: 1 }]}
          />
          <TextInput
            label="Unit"
            value={ingredient.unit}
            onChangeText={(text) => handleIngredientChange(text, index, 'unit')}
            mode="outlined"
            style={[styles.input, styles.ingredientInput, { flex: 1 }]}
          />
          <IconButton
            icon="delete"
            size={20}
            onPress={() => handleRemoveIngredient(index)}
          />
        </View>
      ))}
      <Button mode="outlined" onPress={handleAddIngredient} style={styles.addButton}>
        Add Ingredient
      </Button>

      <Text variant="titleMedium" style={styles.sectionTitle}>Tags</Text>
      <TextInput
        label="Tags (comma separated)"
        value={tags}
        onChangeText={setTags}
        mode="outlined"
        placeholder="e.g. Dinner, Healthy, Quick"
        style={styles.input}
      />

      <HelperText type="error" visible={!!error}>
        {error}
      </HelperText>

      <Button 
        mode="contained" 
        onPress={handleUpdateRecipe} 
        loading={saving} 
        disabled={saving}
        style={styles.submitButton}
      >
        Update Recipe
      </Button>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    padding: 20,
    paddingBottom: 50,
  },
  title: {
    marginBottom: 20,
    textAlign: 'center',
  },
  sectionTitle: {
    marginTop: 20,
    marginBottom: 10,
  },
  input: {
    marginBottom: 10,
    backgroundColor: '#fff',
  },
  ingredientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  ingredientInput: {
    marginBottom: 5,
  },
  addButton: {
    marginTop: 5,
  },
  submitButton: {
    marginTop: 30,
    paddingVertical: 5,
  },
});
