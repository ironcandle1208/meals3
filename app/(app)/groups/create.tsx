import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { TextInput, Button, Text, HelperText, Portal, Modal } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../contexts/AuthContext';

export default function CreateGroup() {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const { session } = useAuth();
  
  // 招待コード表示用のモーダル
  const [showInviteCode, setShowInviteCode] = useState(false);
  const [invitationCode, setInvitationCode] = useState('');
  const [groupName, setGroupName] = useState('');

  const handleCreateGroup = async () => {
    if (!name.trim()) {
      setError('Group name is required');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // 1. グループの作成
      // groupsテーブルに新しいグループを挿入し、作成されたレコードを取得
      const { data: group, error: groupError } = await supabase
        .from('groups')
        .insert([
          { name: name.trim(), created_by: session?.user.id }
        ])
        .select()
        .single();

      if (groupError) throw groupError;

      // 2. 作成者をメンバーとして追加 (管理者権限)
      // group_membersテーブルに、作成者をadminとして追加
      const { error: memberError } = await supabase
        .from('group_members')
        .insert([
          { group_id: group.id, user_id: session?.user.id, role: 'admin' }
        ]);

      if (memberError) throw memberError;

      // 招待コードを表示
      setInvitationCode(group.invitation_code);
      setGroupName(group.name);
      setShowInviteCode(true);
    } catch (err: any) {
      console.error('Error creating group:', err);
      setError(err.message);
      setLoading(false);
    }
  };

  const handleClose = () => {
    setShowInviteCode(false);
    router.back();
  };

  return (
    <View style={styles.container}>
      <Text variant="headlineMedium" style={styles.title}>新規グループ作成</Text>
      
      <TextInput
        label="グループ名"
        value={name}
        onChangeText={setName}
        mode="outlined"
        style={styles.input}
        error={!!error}
      />
      <HelperText type="error" visible={!!error}>
        {error}
      </HelperText>

      <Button 
        mode="contained" 
        onPress={handleCreateGroup} 
        loading={loading} 
        disabled={loading || showInviteCode}
        style={styles.button}
      >
        グループ作成
      </Button>

      <Portal>
        <Modal visible={showInviteCode} onDismiss={handleClose} contentContainerStyle={styles.modal}>
          <Text variant="headlineSmall" style={styles.modalTitle}>グループ作成完了!</Text>
          <Text variant="bodyLarge" style={styles.modalText}>
            {groupName}
          </Text>
          <Text variant="bodyMedium" style={styles.modalDescription}>
            他の人とグループに参加するには、以下の招待コードを共有してください:
          </Text>
          <Text variant="displaySmall" style={styles.invitationCode}>
            {invitationCode}
          </Text>
          <Button mode="contained" onPress={handleClose} style={styles.modalButton}>
            完了
          </Button>
        </Modal>
      </Portal>
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
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    marginBottom: 5,
  },
  button: {
    marginTop: 10,
  },
  modal: {
    backgroundColor: 'white',
    padding: 30,
    margin: 20,
    borderRadius: 8,
  },
  modalTitle: {
    marginBottom: 10,
    textAlign: 'center',
  },
  modalText: {
    marginBottom: 20,
    textAlign: 'center',
    fontWeight: 'bold',
  },
  modalDescription: {
    marginBottom: 10,
    textAlign: 'center',
    color: '#666',
  },
  invitationCode: {
    marginBottom: 20,
    textAlign: 'center',
    fontWeight: 'bold',
    color: '#6200ee',
    letterSpacing: 2,
  },
  modalButton: {
    marginTop: 10,
  },
});
