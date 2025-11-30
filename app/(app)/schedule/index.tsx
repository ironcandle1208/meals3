import React, { useState, useCallback } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { Text, FAB, ActivityIndicator, Card, Portal, Modal, Button, RadioButton } from 'react-native-paper';
import { Calendar, DateData, LocaleConfig } from 'react-native-calendars';
import { useRouter, useFocusEffect } from 'expo-router';
import { useAuth } from '../../../contexts/AuthContext';
import { supabase } from '../../../lib/supabase';
import { Tables } from '../../../types/database.types';

// カレンダーの日本語設定
LocaleConfig.locales['jp'] = {
  monthNames: ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'],
  monthNamesShort: ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'],
  dayNames: ['日曜日', '月曜日', '火曜日', '水曜日', '木曜日', '金曜日', '土曜日'],
  dayNamesShort: ['日', '月', '火', '水', '木', '金', '土'],
  today: '今日'
};
LocaleConfig.defaultLocale = 'jp';

type ScheduleItem = Tables<'schedules'> & {
  recipes: {
    name: string;
  } | null;
};

type MarkedDates = {
  [date: string]: {
    marked?: boolean;
    dotColor?: string;
    selected?: boolean;
    selectedColor?: string;
  };
};

export default function Schedule() {
  const router = useRouter();
  const { group } = useAuth();
  const [items, setItems] = useState<{ [date: string]: ScheduleItem[] }>({});
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
        .eq('group_id', group!.id); // group is checked in useFocusEffect

      if (error) throw error;

      const newItems: { [date: string]: ScheduleItem[] } = {};
      // @ts-ignore: Supabase join type inference limitation
      const scheduleData = data as ScheduleItem[];
      
      // 食事の優先順位定義
      const mealOrder: { [key: string]: number } = {
        breakfast: 1,
        lunch: 2,
        dinner: 3,
        snack: 4
      };

      scheduleData.forEach(item => {
        const date = item.date;
        if (!newItems[date]) {
          newItems[date] = [];
        }
        newItems[date].push(item);
      });

      // 各日付の中で食事タイプ順にソート
      Object.keys(newItems).forEach(date => {
        newItems[date].sort((a, b) => {
          const orderA = mealOrder[a.meal_type] || 99;
          const orderB = mealOrder[b.meal_type] || 99;
          return orderA - orderB;
        });
      });

      setItems(newItems);
    } catch (error) {
      console.error('Error fetching schedules:', error);
    } finally {
      setLoading(false);
    }
  };

  const markedDates: MarkedDates = Object.keys(items).reduce((acc, date) => {
    acc[date] = { marked: true, dotColor: '#6200ee' };
    return acc;
  }, {} as MarkedDates);

  if (selectedDate) {
    markedDates[selectedDate] = { ...markedDates[selectedDate], selected: true, selectedColor: '#6200ee' };
  }

  const handleDayPress = (day: DateData) => {
    setSelectedDate(day.dateString);
  };

  const showModal = () => {
    if (!selectedDate) {
      Alert.alert('日付を選択してください');
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
          {selectedDate ? `${selectedDate}の献立` : '日時を選んでください'}
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
          <Text style={styles.emptyText}>献立が登録されていません</Text>
        )}
      </View>

      <FAB
        icon="plus"
        style={styles.fab}
        onPress={showModal}
        label="献立を登録"
      />

      <Portal>
        <Modal visible={visible} onDismiss={hideModal} contentContainerStyle={styles.modal}>
          <Text variant="headlineSmall" style={styles.modalTitle}>選択する献立の種類</Text>
          <RadioButton.Group onValueChange={value => setMealType(value)} value={mealType}>
            <RadioButton.Item label="朝食" value="breakfast" />
            <RadioButton.Item label="昼食" value="lunch" />
            <RadioButton.Item label="夕食" value="dinner" />
            <RadioButton.Item label="間食" value="snack" />
          </RadioButton.Group>
          <Button mode="contained" onPress={handleNavigateToRecipes} style={styles.modalButton}>
            献立を選択
          </Button>
        </Modal>
      </Portal>
    </View>
  );
}

const getMealEmoji = (type: string) => {
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
