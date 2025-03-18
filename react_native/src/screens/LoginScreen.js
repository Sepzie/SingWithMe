import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, TouchableOpacity, Alert } from 'react-native';
import { TextInput, Button, Title, Text, Snackbar } from 'react-native-paper';
import { login } from '../services/api';

export const LoginScreen = ({ navigation, onLoginSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [visible, setVisible] = useState(false);

  const handleLogin = async () => {
    if (!username || !password) {
      setError('Please enter both username and password');
      setVisible(true);
      return;
    }

    try {
      setLoading(true);
      console.log('Attempting to login with username:', username);
      
      await login(username, password);
      console.log('Login successful, checking for callback');
      
      setLoading(false);
      
      // Show success alert
      Alert.alert(
        "Login Successful",
        "Welcome back! You are now logged in.",
        [{ text: "Continue", onPress: () => {
          console.log('Calling onLoginSuccess callback:', !!onLoginSuccess);
          if (onLoginSuccess) {
            onLoginSuccess();
          } else {
            console.warn('No onLoginSuccess callback provided');
            // If callback not provided, show error
            setError('Login successful but unable to navigate to home screen');
            setVisible(true);
          }
        }}]
      );
    } catch (error) {
      console.error('Login screen error:', error);
      setLoading(false);
      setError(error.response?.data?.detail || 'Login failed. Please check your credentials.');
      setVisible(true);
    }
  };

  const onDismissSnackBar = () => setVisible(false);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1 }}
    >
      <ScrollView contentContainerStyle={styles.container}>
        <Title style={styles.title}>Sign In</Title>
        
        <TextInput
          label="Username"
          value={username}
          onChangeText={setUsername}
          style={styles.input}
          autoCapitalize="none"
        />
        
        <TextInput
          label="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          style={styles.input}
        />
        
        <Button
          mode="contained"
          onPress={handleLogin}
          style={styles.button}
          loading={loading}
          disabled={loading}
        >
          Sign In
        </Button>
        
        <View style={styles.registerContainer}>
          <Text>Don't have an account? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Register')}>
            <Text style={styles.registerText}>Sign Up</Text>
          </TouchableOpacity>
        </View>
        
        <Snackbar
          visible={visible}
          onDismiss={onDismissSnackBar}
          duration={3000}
        >
          {error}
        </Snackbar>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    marginBottom: 20,
  },
  input: {
    width: '100%',
    marginBottom: 15,
  },
  button: {
    width: '100%',
    marginTop: 10,
    paddingVertical: 8,
  },
  registerContainer: {
    flexDirection: 'row',
    marginTop: 20,
  },
  registerText: {
    color: '#1976D2',
    fontWeight: 'bold',
  },
}); 