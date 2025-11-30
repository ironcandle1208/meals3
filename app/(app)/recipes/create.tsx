import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, Image } from 'react-native';
import { TextInput, Button, Text, HelperText, IconButton } from 'react-native-paper';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../contexts/AuthContext';


type IngredientInput = {
  name: string;
  quantity: string;
  unit: string;
};

export default function CreateRecipe() {
  const router = useRouter();
  const { group } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [name, setName] = useState('');
  const [instructions, setInstructions] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [tags, setTags] = useState(''); // Comma separated
  const [ingredients, setIngredients] = useState<IngredientInput[]>([{ name: '', quantity: '', unit: '' }]);

  // 画像選択ハンドラ
  const handlePickImage = async () => {
    // 画像ライブラリへのアクセス権限をリクエスト
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (permissionResult.granted === false) {
      setError('画像ライブラリへのアクセス権限が必要です');
      return;
    }

    // 画像を選択
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      setImageUrl(result.assets[0].uri);
    }
  };

  // 材料の追加・削除・変更ハンドラ
  const handleAddIngredient = () => {
    setIngredients([...ingredients, { name: '', quantity: '', unit: '' }]);
  };

  const handleRemoveIngredient = (index: number) => {
    const newIngredients = [...ingredients];
    newIngredients.splice(index, 1);
    setIngredients(newIngredients);
  };

  const handleIngredientChange = (text: string, index: number, field: keyof IngredientInput) => {
    const newIngredients = [...ingredients];
    newIngredients[index][field] = text;
    setIngredients(newIngredients);
  };

  const handleCreateRecipe = async () => {
    if (!name.trim()) {
      setError('レシピ名は必須です');
      return;
    }
    if (!group) {
      setError('グループが選択されていません');
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
        
        const tagIds: string[] = [];
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
      if (err instanceof Error) {
        setError(err.message);
      } else if (typeof err === 'object' && err !== null && 'message' in err) {
        setError((err as any).message);
      } else {
        setError('予期しないエラーが発生しました');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text variant="headlineMedium" style={styles.title}>新しいレシピ</Text>

      <TextInput
        label="レシピ名 *"
        value={name}
        onChangeText={setName}
        mode="outlined"
        style={styles.input}
      />

      <Text variant="titleMedium" style={styles.sectionTitle}>画像</Text>
      <Button 
        mode="outlined" 
        onPress={handlePickImage} 
        icon="image"
        style={styles.imageButton}
      >
        画像を選択
      </Button>
      {imageUrl ? (
        <View style={styles.imagePreviewContainer}>
          <Image source={{ uri: imageUrl }} style={styles.imagePreview} />
          <IconButton
            icon="close"
            size={20}
            onPress={() => setImageUrl('')}
            style={styles.removeImageButton}
          />
        </View>
      ) : null}

      <Text variant="titleMedium" style={styles.sectionTitle}>材料</Text>
      {ingredients.map((ingredient, index) => (
        <View key={index} style={styles.ingredientRow}>
          <TextInput
            label="材料名"
            value={ingredient.name}
            onChangeText={(text) => handleIngredientChange(text, index, 'name')}
            mode="outlined"
            style={[styles.input, styles.ingredientInput, { flex: 2 }]}
          />
          <TextInput
            label="数量"
            value={ingredient.quantity}
            onChangeText={(text) => handleIngredientChange(text, index, 'quantity')}
            mode="outlined"
            style={[styles.input, styles.ingredientInput, { flex: 1 }]}
          />
          <TextInput
            label="単位"
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
        材料を追加
      </Button>

      <Text variant="titleMedium" style={styles.sectionTitle}>タグ</Text>
      <TextInput
        label="タグ（カンマ区切り）"
        value={tags}
        onChangeText={setTags}
        mode="outlined"
        placeholder="例: 夕食, ヘルシー, 簡単"
        style={styles.input}
      />

      <Text variant="titleMedium" style={styles.sectionTitle}>作り方</Text>
      <TextInput
        label="作り方"
        value={instructions}
        onChangeText={setInstructions}
        mode="outlined"
        multiline
        numberOfLines={12}
        style={[styles.input, styles.instructionsInput]}
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
        レシピを作成
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
  imageButton: {
    marginBottom: 10,
  },
  imagePreviewContainer: {
    position: 'relative',
    marginBottom: 10,
  },
  imagePreview: {
    width: '100%',
    height: 200,
    borderRadius: 8,
  },
  removeImageButton: {
    position: 'absolute',
    top: 5,
    right: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
  },
  instructionsInput: {
    minHeight: 150,
  },
});
