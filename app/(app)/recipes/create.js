import React, { useState } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { TextInput, Button, Text, HelperText, IconButton, Card } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../contexts/AuthContext';

export default function CreateRecipe() {
  const router = useRouter();
  const { group, session } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [name, setName] = useState('');
  const [instructions, setInstructions] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [tags, setTags] = useState(''); // Comma separated
  const [ingredients, setIngredients] = useState([{ name: '', quantity: '', unit: '' }]);

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

  const handleCreateRecipe = async () => {
    if (!name.trim()) {
      setError('Recipe name is required');
      return;
    }
    if (!group) {
      setError('No group selected');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // 1. レシピの作成
      const { data: recipe, error: recipeError } = await supabase
        .from('recipes')
        .insert([
          {
            group_id: group.id,
            name: name.trim(),
            instructions: instructions.trim(),
            image_url: imageUrl.trim() || null,
          }
        ])
        .select()
        .single();

      if (recipeError) throw recipeError;

      // 2. 材料の登録
      // 空の名前の材料は除外する
      const validIngredients = ingredients.filter(i => i.name.trim());
      if (validIngredients.length > 0) {
        const ingredientsData = validIngredients.map(i => ({
          recipe_id: recipe.id,
          name: i.name.trim(),
          quantity: i.quantity.trim() || null,
          unit: i.unit.trim() || null,
        }));

        const { error: ingredientsError } = await supabase
          .from('ingredients')
          .insert(ingredientsData);

        if (ingredientsError) throw ingredientsError;
      }

      // 3. タグの処理
      // カンマ区切りのタグ文字列を配列に変換
      const tagNames = tags.split(',').map(t => t.trim()).filter(t => t);
      if (tagNames.length > 0) {
        // 既存のタグを探すか、新しいタグを作成する
        // (group_id, name) のユニーク制約を利用して upsert を行う
        
        const tagIds = [];
        for (const tagName of tagNames) {
          // タグの Upsert
          const { data: tag, error: tagError } = await supabase
            .from('tags')
            .upsert({ group_id: group.id, name: tagName }, { onConflict: 'group_id, name' })
            .select()
            .single();
          
          if (tagError) throw tagError;
          tagIds.push(tag.id);
        }

        // レシピとタグを紐付ける (中間テーブルへの挿入)
        const recipeTagsData = tagIds.map(tagId => ({
          recipe_id: recipe.id,
          tag_id: tagId
        }));

        const { error: recipeTagsError } = await supabase
          .from('recipe_tags')
          .insert(recipeTagsData);

        if (recipeTagsError) throw recipeTagsError;
      }

      router.back();
    } catch (err) {
      console.error('Error creating recipe:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text variant="headlineMedium" style={styles.title}>New Recipe</Text>

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
        onPress={handleCreateRecipe} 
        loading={loading} 
        disabled={loading}
        style={styles.submitButton}
      >
        Create Recipe
      </Button>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
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
