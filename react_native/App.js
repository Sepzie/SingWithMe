import React, { useState, useEffect } from 'react';
import { Provider as PaperProvider } from 'react-native-paper';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MainScreen } from './src/screens/MainScreen';
import { LoginScreen } from './src/screens/LoginScreen';
import { RegisterScreen } from './src/screens/RegisterScreen';
import { ProjectsScreen } from './src/screens/ProjectsScreen';
import { getCurrentUser } from './src/services/api';
import { ActivityIndicator, View, StyleSheet } from 'react-native';

const Stack = createStackNavigator();

export default function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // Check if the user is already logged in
    const checkAuthStatus = async () => {
      try {
        const token = await AsyncStorage.getItem('token');
        if (token) {
          // Verify the token by checking user info
          await getCurrentUser();
          setIsAuthenticated(true);
        }
      } catch (error) {
        // If there's an error, the token is invalid
        console.log('Authentication error:', error);
        await AsyncStorage.removeItem('token');
      } finally {
        setIsLoading(false);
      }
    };

    checkAuthStatus();
  }, []);

  const handleAuthSuccess = () => {
    console.log('Authentication successful, updating state');
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    console.log('Logout requested, updating state');
    setIsAuthenticated(false);
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <PaperProvider>
      <NavigationContainer>
        {isAuthenticated ? (
          <Stack.Navigator>
            <Stack.Screen 
              name="Projects" 
              options={{ headerShown: false }}
            >
              {props => <ProjectsScreen {...props} onLogout={handleLogout} />}
            </Stack.Screen>
            <Stack.Screen 
              name="Upload" 
              component={MainScreen}
              options={{ title: 'New Project' }}
            />
            <Stack.Screen 
              name="Player" 
              component={MainScreen}
              options={{ title: 'Project Player' }}
            />
          </Stack.Navigator>
        ) : (
          <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="Login">
              {props => <LoginScreen {...props} onLoginSuccess={handleAuthSuccess} />}
            </Stack.Screen>
            <Stack.Screen name="Register">
              {props => <RegisterScreen {...props} onRegisterSuccess={handleAuthSuccess} />}
            </Stack.Screen>
          </Stack.Navigator>
        )}
      </NavigationContainer>
    </PaperProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
}); 