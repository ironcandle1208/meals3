import React, { useState, useCallback } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { Text, FAB, ActivityIndicator, Card, Portal, Modal, Button, RadioButton } from 'react-native-paper';
import { Calendar } from 'react-native-calendars';
import { useRouter, useFocusEffect } from 'expo-router';
import { useAuth } from '../../../contexts/AuthContext';
import { supabase } from '../../../lib/supabase';

export default function Schedule() {
  const router = useRouter();
  const { group } = useAuth();
  const [items, setItems] = useState({});
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState('');
  
  // Modal state
  const [visible, setVisible] = useState(false);
  const [mealType, setMealType] = useState('dinner');

  // 画面が表示されるたびにスケジュールを再取得
  useFocusEffect(
    useCallback(() => {
      if (!group) {
        return;
      }
      fetchSchedules();
    }, [group])
  );

  // スケジュールの取得処理（レシピ名も含む）
  const fetchSchedules = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('schedules')
        .select(`
          *,
          recipes (name)
        `)
        .eq('group_id', group.id);

      if (error) throw error;

      const newItems = {};
      data.forEach(item => {
        const date = item.date;
        if (!newItems[date]) {
          newItems[date] = [];
        }
        newItems[date].push(item);
      });
      setItems(newItems);
    } catch (error) {
      console.error('Error fetching schedules:', error);
    } finally {
      setLoading(false);
    }
  };

  const markedDates = Object.keys(items).reduce((acc, date) => {
    acc[date] = { marked: true, dotColor: '#6200ee' };
    return acc;
  }, {});

  if (selectedDate) {
    markedDates[selectedDate] = { ...markedDates[selectedDate], selected: true, selectedColor: '#6200ee' };
  }

  const handleDayPress = (day) => {
    setSelectedDate(day.dateString);
  };

  const showModal = () => {
    if (!selectedDate) {
      Alert.alert('Please select a date first');
      return;
    }
    setVisible(true);
  };

  const hideModal = () => setVisible(false);

  const handleNavigateToRecipes = () => {
    hideModal();
    // レシピ選択画面に遷移（選択モードで日付と食事タイプを渡す）
    router.push({
      pathname: '/recipes',
      params: { date: selectedDate, mealType: mealType, mode: 'select' }
    });
  };

  return (
    <View style={styles.container}>
      <Calendar
        onDayPress={handleDayPress}
        markedDates={markedDates}
        theme={{
          selectedDayBackgroundColor: '#6200ee',
          todayTextColor: '#6200ee',
          arrowColor: '#6200ee',
        }}
      />
      
      <View style={styles.list}>
        <Text variant="titleMedium" style={styles.dateTitle}>
          {selectedDate ? `Meals for ${selectedDate}` : 'Select a date'}
        </Text>
        
        {loading ? (
          <ActivityIndicator animating={true} style={styles.loader} />
        ) : (
          selectedDate && items[selectedDate]?.map((item, index) => (
            <Card key={index} style={styles.card}>
              <Card.Title 
                title={item.recipes?.name || 'Unknown Recipe'} 
                subtitle={item.meal_type}
                left={(props) => <Text {...props} style={styles.emoji}>{getMealEmoji(item.meal_type)}</Text>}
              />
            </Card>
          ))
        )}
        
        {selectedDate && (!items[selectedDate] || items[selectedDate].length === 0) && (
          <Text style={styles.emptyText}>No meals scheduled.</Text>
        )}
      </View>

      <FAB
        icon="plus"
        style={styles.fab}
        onPress={showModal}
        label="Add Meal"
      />

      <Portal>
        <Modal visible={visible} onDismiss={hideModal} contentContainerStyle={styles.modal}>
          <Text variant="headlineSmall" style={styles.modalTitle}>Select Meal Type</Text>
          <RadioButton.Group onValueChange={value => setMealType(value)} value={mealType}>
            <RadioButton.Item label="Breakfast" value="breakfast" />
            <RadioButton.Item label="Lunch" value="lunch" />
            <RadioButton.Item label="Dinner" value="dinner" />
            <RadioButton.Item label="Snack" value="snack" />
          </RadioButton.Group>
          <Button mode="contained" onPress={handleNavigateToRecipes} style={styles.modalButton}>
            Select Recipe
          </Button>
        </Modal>
      </Portal>
    </View>
  );
}

const getMealEmoji = (type) => {
  switch (type) {
    case 'breakfast': return '🍳';
    case 'lunch': return '🍱';
    case 'dinner': return '🍽️';
    case 'snack': return '🍪';
    default: return '🍴';
  }
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  list: {
    flex: 1,
    padding: 20,
  },
  dateTitle: {
    marginBottom: 10,
    fontWeight: 'bold',
  },
  card: {
    marginBottom: 10,
  },
  emoji: {
    fontSize: 24,
    marginRight: 10,
  },
  loader: {
    marginTop: 20,
  },
  emptyText: {
    color: '#666',
    fontStyle: 'italic',
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
  modalButton: {
    marginTop: 20,
  },
});
