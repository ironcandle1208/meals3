import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { TextInput, Button, Text, Avatar } from 'react-native-paper';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface ProfileData {
  fullName: string;
  avatarUrl: string;
}

export default function Profile() {
  const { session } = useAuth();
  const [loading, setLoading] = useState(true);
  const [fullName, setFullName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');

  useEffect(() => {
    if (session) getProfile();
  }, [session]);

  // プロフィール情報を取得する関数
  async function getProfile() {
    try {
      setLoading(true);
      if (!session?.user) throw new Error('No user on the session!');

      const { data, error, status } = await supabase
        .from('profiles')
        .select(`full_name, avatar_url`)
        .eq('id', session.user.id)
        .single();

      if (error && status !== 406) {
        throw error;
      }

      if (data) {
        setFullName(data.full_name || '');
        setAvatarUrl(data.avatar_url || '');
      }
    } catch (error) {
      if (error instanceof Error) {
        Alert.alert('エラー', error.message);
      }
    } finally {
      setLoading(false);
    }
  }

  // プロフィール情報を更新する関数
  async function updateProfile({ fullName, avatarUrl }: ProfileData) {
    try {
      setLoading(true);
      if (!session?.user) throw new Error('No user on the session!');

      const updates = {
        id: session.user.id,
        full_name: fullName,
        avatar_url: avatarUrl,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase.from('profiles').upsert(updates);

      if (error) {
        throw error;
      }
      Alert.alert('成功', 'プロフィールを更新しました！');
    } catch (error) {
      if (error instanceof Error) {
        Alert.alert('エラー', error.message);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text variant="headlineMedium" style={styles.title}>プロフィール</Text>
      
      <View style={styles.avatarContainer}>
        {/* アバター表示（現在はプレースホルダー） */}
        <Avatar.Text size={80} label={fullName ? fullName.substring(0, 2).toUpperCase() : 'ME'} />
      </View>

      <TextInput
        label="メールアドレス"
        value={session?.user?.email}
        disabled
        style={styles.input}
      />

      <TextInput
        label="氏名"
        value={fullName}
        onChangeText={setFullName}
        style={styles.input}
      />

      <Button
        mode="contained"
        onPress={() => updateProfile({ fullName, avatarUrl })}
        loading={loading}
        disabled={loading}
        style={styles.button}
      >
        {loading ? '読み込み中...' : '更新'}
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
    textAlign: 'center',
    marginBottom: 20,
  },
  avatarContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  input: {
    marginBottom: 15,
  },
  button: {
    marginTop: 10,
  },
});
