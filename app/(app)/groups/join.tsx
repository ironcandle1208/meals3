import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { TextInput, Button, Text, HelperText } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../contexts/AuthContext';

export default function JoinGroup() {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const { session } = useAuth();

  // 招待コードでグループに参加
  const handleJoinGroup = async () => {
    if (!code.trim()) {
      setError('Invitation code is required');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // 1. 招待コードでグループを検索
      const { data: group, error: groupError } = await supabase
        .from('groups')
        .select('id, name')
        .eq('invitation_code', code.trim().toUpperCase())
        .single();

      if (groupError) {
        if (groupError.code === 'PGRST116') {
          throw new Error('Invalid invitation code');
        }
        throw groupError;
      }

      // 2. 既にメンバーかチェック
      const { data: existingMember } = await supabase
        .from('group_members')
        .select('id')
        .eq('group_id', group.id)
        .eq('user_id', session?.user.id)
        .single();

      if (existingMember) {
        setError('You are already a member of this group');
        return;
      }

      // 3. グループメンバーとして追加
      const { error: memberError } = await supabase
        .from('group_members')
        .insert([
          { group_id: group.id, user_id: session?.user.id, role: 'member' }
        ]);

      if (memberError) throw memberError;

      // ホーム画面に戻る
      router.replace('/');
    } catch (err: any) {
      console.error('Error joining group:', err);
      setError(err.message || 'Failed to join group');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text variant="headlineMedium" style={styles.title}>Join Group</Text>
      <Text variant="bodyMedium" style={styles.description}>
        Enter the invitation code shared by a group member
      </Text>
      
      <TextInput
        label="Invitation Code"
        value={code}
        onChangeText={(text) => setCode(text.toUpperCase())}
        mode="outlined"
        style={styles.input}
        error={!!error}
        autoCapitalize="characters"
        maxLength={8}
      />
      <HelperText type="error" visible={!!error}>
        {error}
      </HelperText>

      <Button 
        mode="contained" 
        onPress={handleJoinGroup} 
        loading={loading} 
        disabled={loading}
        style={styles.button}
      >
        Join Group
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  title: {
    marginBottom: 10,
    textAlign: 'center',
  },
  description: {
    marginBottom: 20,
    textAlign: 'center',
    color: '#666',
  },
  input: {
    marginBottom: 5,
  },
  button: {
    marginTop: 10,
  },
});
