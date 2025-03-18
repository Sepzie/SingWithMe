import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, TouchableOpacity, Alert } from 'react-native';
import { TextInput, Button, Title, Text, Snackbar } from 'react-native-paper';
import { register, login } from '../services/api';

export const RegisterScreen = ({ navigation, onRegisterSuccess }) => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [visible, setVisible] = useState(false);

  const validateEmail = (email) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  const handleRegister = async () => {
    // Validation
    if (!username || !email || !password || !confirmPassword) {
      setError('Please fill in all fields');
      setVisible(true);
      return;
    }

    if (!validateEmail(email)) {
      setError('Please enter a valid email address');
      setVisible(true);
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      setVisible(true);
      return;
    }

    try {
      setLoading(true);
      
      // Register the user
      console.log('Attempting to register user:', username);
      const userData = await register({
        username,
        email,
        password
      });
      console.log('Registration successful:', userData);
      
      // Show success toast
      Alert.alert(
        "Registration Successful",
        "Your account has been created. Logging you in now...",
        [{ text: "OK" }]
      );
      
      // Automatically log in after successful registration
      console.log('Attempting to login after registration');
      await login(username, password);
      console.log('Login after registration successful');
      
      setLoading(false);
      
      console.log('Calling onRegisterSuccess callback:', !!onRegisterSuccess);
      if (onRegisterSuccess) {
        onRegisterSuccess();
      } else {
        console.warn('No onRegisterSuccess callback provided');
        // Fallback navigation if callback not provided
        navigation.reset({
          index: 0,
          routes: [{ name: 'Login' }],
        });
      }
    } catch (error) {
      console.error('Registration error:', error);
      setLoading(false);
      setError(error.response?.data?.detail || 'Registration failed. Please try again.');
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
        <Title style={styles.title}>Create Account</Title>
        
        <TextInput
          label="Username"
          value={username}
          onChangeText={setUsername}
          style={styles.input}
          autoCapitalize="none"
        />
        
        <TextInput
          label="Email"
          value={email}
          onChangeText={setEmail}
          style={styles.input}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        
        <TextInput
          label="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          style={styles.input}
        />
        
        <TextInput
          label="Confirm Password"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry
          style={styles.input}
        />
        
        <Button
          mode="contained"
          onPress={handleRegister}
          style={styles.button}
          loading={loading}
          disabled={loading}
        >
          Sign Up
        </Button>
        
        <View style={styles.loginContainer}>
          <Text>Already have an account? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Login')}>
            <Text style={styles.loginText}>Sign In</Text>
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
  loginContainer: {
    flexDirection: 'row',
    marginTop: 20,
  },
  loginText: {
    color: '#1976D2',
    fontWeight: 'bold',
  },
}); 