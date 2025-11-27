import React, { useState } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { TextInput, Button, Text } from 'react-native-paper';
import { Link } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();

  const handleLogin = async () => {
    setLoading(true);
    try {
      // AuthContextからsignIn関数を呼び出し
      await signIn(email, password);
      // ナビゲーションはルートレイアウトの保護機能によって自動的に処理されます
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text variant="headlineMedium" style={styles.title}>アカウントにログイン</Text>
      
      <TextInput
        label="Eメールアドレス"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        style={styles.input}
        testID="login-email-input"
        accessibilityLabel="login-email-input"
      />
      
      <TextInput
        label="パスワード"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        style={styles.input}
        testID="login-password-input"
        accessibilityLabel="login-password-input"
      />

      <Button 
        mode="contained" 
        onPress={handleLogin} 
        loading={loading} 
        style={styles.button}
        testID="login-button"
        accessibilityLabel="login-button"
      >
        ログイン
      </Button>

      <View style={styles.footer}>
        <Text>アカウントを作成していませんか？ </Text>
        <Link href="/signup" asChild>
          <Button mode="text" compact testID="login-signup-link" accessibilityLabel="login-signup-link">サインアップ</Button>
        </Link>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  title: {
    textAlign: 'center',
    marginBottom: 30,
  },
  input: {
    marginBottom: 15,
  },
  button: {
    marginTop: 10,
    marginBottom: 20,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
