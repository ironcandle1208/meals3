import React, { useState, useCallback } from 'react';
import { View, FlatList, StyleSheet, Alert } from 'react-native';
import { Text, FAB, ActivityIndicator, Checkbox, TextInput, Button, Portal, Modal, IconButton } from 'react-native-paper';
import { useFocusEffect } from 'expo-router';
import { useAuth } from '../../../contexts/AuthContext';
import { supabase } from '../../../lib/supabase';
import { Tables } from '../../../types/database.types';

type ShoppingItem = Tables<'shopping_items'>;
type ScheduleWithRecipe = Tables<'schedules'> & {
  recipes: {
    id: string;
    ingredients: {
      name: string;
      quantity: string | null;
      unit: string | null;
    }[];
  } | null;
};

type IngredientSummary = {
  name: string;
  quantity: string | null;
  unit: string | null;
};

export default function ShoppingList() {
  const { group } = useAuth();
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [loading, setLoading] = useState(false);
  
  // 手動追加用のモーダル
  const [visible, setVisible] = useState(false);
  const [newItemName, setNewItemName] = useState('');

  useFocusEffect(
    useCallback(() => {
      if (!group) {
        return;
      }
      fetchShoppingItems();
    }, [group])
  );

  // 買い物リストの取得
  const fetchShoppingItems = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('shopping_items')
        .select('*')
        .eq('group_id', group!.id) // group is checked in useFocusEffect
        .order('created_at', { ascending: false });

      if (error) throw error;
      setItems(data || []);
    } catch (error) {
      console.error('Error fetching shopping items:', error);
    } finally {
      setLoading(false);
    }
  };

  // スケジュールから買い物リストを自動生成
  const generateFromSchedule = async () => {
    try {
      setLoading(true);
      
      // 今日以降のスケジュールを取得（レシピと材料情報を含む）
      const today = new Date().toISOString().split('T')[0];
      const { data, error: scheduleError } = await supabase
        .from('schedules')
        .select(`
          *,
          recipes (
            id,
            ingredients (name, quantity, unit)
          )
        `)
        .eq('group_id', group!.id)
        .gte('date', today);

      if (scheduleError) throw scheduleError;

      // @ts-ignore: Supabase join type inference limitation
      const schedules = data as ScheduleWithRecipe[];

      // 材料を集約（同じ材料は数量を結合）
      const ingredientMap = new Map<string, IngredientSummary>();
      schedules.forEach(schedule => {
        if (schedule.recipes?.ingredients) {
          // @ts-ignore: Array type inference
          schedule.recipes.ingredients.forEach((ing: any) => {
            const key = ing.name.toLowerCase();
            if (ingredientMap.has(key)) {
              // 既存の材料がある場合は数量を追加（簡易的に文字列結合）
              const existing = ingredientMap.get(key)!;
              ingredientMap.set(key, {
                name: ing.name,
                quantity: existing.quantity ? `${existing.quantity}, ${ing.quantity || ''}` : ing.quantity,
                unit: ing.unit
              });
            } else {
              ingredientMap.set(key, ing);
            }
          });
        }
      });

      // 既存の自動生成アイテムを削除（手動追加分は残す）
      const { error: deleteError } = await supabase
        .from('shopping_items')
        .delete()
        .eq('group_id', group!.id)
        .eq('source_type', 'auto');

      if (deleteError) throw deleteError;

      // 新しいアイテムを挿入
      if (ingredientMap.size > 0) {
        const newItems = Array.from(ingredientMap.values()).map(ing => ({
          group_id: group!.id,
          name: `${ing.name} ${ing.quantity || ''} ${ing.unit || ''}`.trim(),
          source_type: 'auto',
          is_purchased: false
        }));

        const { error: insertError } = await supabase
          .from('shopping_items')
          .insert(newItems);

        if (insertError) throw insertError;
      }

      await fetchShoppingItems();
      Alert.alert('Success', 'Shopping list generated from schedule!');
    } catch (error) {
      console.error('Error generating shopping list:', error);
      Alert.alert('Error', 'Failed to generate shopping list');
    } finally {
      setLoading(false);
    }
  };

  // チェック状態の切り替え
  const toggleCheck = async (item: ShoppingItem) => {
    try {
      const { error } = await supabase
        .from('shopping_items')
        .update({ is_purchased: !item.is_purchased })
        .eq('id', item.id);

      if (error) throw error;
      
      // ローカル状態を更新
      setItems(items.map(i => 
        i.id === item.id ? { ...i, is_purchased: !i.is_purchased } : i
      ));
    } catch (error) {
      console.error('Error toggling item:', error);
    }
  };

  // アイテムの削除
  const deleteItem = async (itemId: string) => {
    try {
      const { error } = await supabase
        .from('shopping_items')
        .delete()
        .eq('id', itemId);

      if (error) throw error;
      
      setItems(items.filter(i => i.id !== itemId));
    } catch (error) {
      console.error('Error deleting item:', error);
    }
  };

  // 手動でアイテムを追加
  const addManualItem = async () => {
    if (!newItemName.trim()) {
      return;
    }

    try {
      const { data, error } = await supabase
        .from('shopping_items')
        .insert([{
          group_id: group!.id,
          name: newItemName.trim(),
          source_type: 'manual',
          is_purchased: false
        }])
        .select()
        .single();

      if (error) throw error;
      
      setItems([data, ...items]);
      setNewItemName('');
      setVisible(false);
    } catch (error) {
      console.error('Error adding item:', error);
    }
  };

  const renderItem = ({ item }: { item: ShoppingItem }) => (
    <View style={styles.itemRow}>
      <Checkbox
        status={item.is_purchased ? 'checked' : 'unchecked'}
        onPress={() => toggleCheck(item)}
      />
      <Text 
        style={[
          styles.itemText, 
          item.is_purchased && styles.itemTextChecked
        ]}
      >
        {item.name}
      </Text>
      <IconButton
        icon="delete"
        size={20}
        onPress={() => deleteItem(item.id)}
      />
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text variant="headlineSmall">Shopping List</Text>
        <Button 
          mode="outlined" 
          onPress={generateFromSchedule}
          disabled={loading}
        >
          Generate from Schedule
        </Button>
      </View>

      {loading ? (
        <ActivityIndicator animating={true} style={styles.loader} />
      ) : (
        <FlatList
          data={items}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <Text style={styles.emptyText}>
              No items. Add manually or generate from schedule.
            </Text>
          }
        />
      )}

      <FAB
        icon="plus"
        style={styles.fab}
        onPress={() => setVisible(true)}
        label="Add Item"
      />

      <Portal>
        <Modal visible={visible} onDismiss={() => setVisible(false)} contentContainerStyle={styles.modal}>
          <Text variant="headlineSmall" style={styles.modalTitle}>Add Item</Text>
          <TextInput
            label="Item Name"
            value={newItemName}
            onChangeText={setNewItemName}
            mode="outlined"
            style={styles.input}
          />
          <Button mode="contained" onPress={addManualItem} style={styles.modalButton}>
            Add
          </Button>
        </Modal>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    padding: 20,
    backgroundColor: '#fff',
    elevation: 2,
    gap: 10,
  },
  list: {
    padding: 10,
    paddingBottom: 80,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  itemText: {
    flex: 1,
    fontSize: 16,
  },
  itemTextChecked: {
    textDecorationLine: 'line-through',
    color: '#999',
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
  modal: {
    backgroundColor: 'white',
    padding: 20,
    margin: 20,
    borderRadius: 8,
  },
  modalTitle: {
    marginBottom: 10,
    textAlign: 'center',
  },
  input: {
    marginBottom: 10,
  },
  modalButton: {
    marginTop: 10,
  },
});
