import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, RefreshControl } from 'react-native';
import { Card, Title, Paragraph, Button, ActivityIndicator, Text } from 'react-native-paper';
import { getUserProjects, logout, getProcessedTracks } from '../services/api';

export const ProjectsScreen = ({ navigation, onLogout }) => {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const userProjects = await getUserProjects();
      setProjects(userProjects || []);
      setError(null);
    } catch (error) {
      setError('Failed to load projects');
      console.error('Error fetching projects:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchProjects();
  };

  const handleLogout = async () => {
    try {
      await logout();
      if (onLogout) {
        onLogout();
      }
    } catch (error) {
      console.error('Error during logout:', error);
    }
  };

  const handleProjectPress = async (project) => {
    try {
      if (project.status === 'completed') {
        const tracks = await getProcessedTracks(project.jobId);
        navigation.navigate('Player', { tracks });
      }
    } catch (error) {
      console.error('Error loading project:', error);
    }
  };

  const handleNewProject = () => {
    navigation.navigate('Upload');
  };

  const renderProjectItem = ({ item }) => {
    // Format date
    const date = new Date(item.createdAt);
    const formattedDate = date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
    
    // Determine status color
    let statusColor = '#000';
    if (item.status === 'completed') statusColor = '#4CAF50';
    if (item.status === 'failed') statusColor = '#F44336';
    if (item.status === 'processing') statusColor = '#2196F3';
    
    return (
      <TouchableOpacity onPress={() => handleProjectPress(item)}>
        <Card style={styles.card}>
          <Card.Content>
            <Title>{item.filename || 'Untitled Project'}</Title>
            <Paragraph>Created: {formattedDate}</Paragraph>
            <View style={styles.statusContainer}>
              <Text>Status: </Text>
              <Text style={{ color: statusColor, fontWeight: 'bold' }}>
                {item.status?.charAt(0).toUpperCase() + item.status?.slice(1)}
              </Text>
            </View>
          </Card.Content>
        </Card>
      </TouchableOpacity>
    );
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Title style={styles.title}>My Projects</Title>
        <Button onPress={handleLogout}>Logout</Button>
      </View>
      
      {error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <Button onPress={fetchProjects}>Try Again</Button>
        </View>
      ) : (
        <>
          <FlatList
            data={projects}
            renderItem={renderProjectItem}
            keyExtractor={(item) => item.jobId}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
              />
            }
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No projects found</Text>
                <Text>Create a new project to get started</Text>
              </View>
            }
          />
          
          <Button
            mode="contained"
            onPress={handleNewProject}
            style={styles.newButton}
          >
            New Project
          </Button>
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
  },
  card: {
    marginBottom: 12,
  },
  statusContainer: {
    flexDirection: 'row',
    marginTop: 8,
  },
  listContent: {
    flexGrow: 1,
    paddingBottom: 80,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: '#F44336',
    marginBottom: 16,
    fontSize: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 40,
  },
  emptyText: {
    fontSize: 18,
    marginBottom: 8,
  },
  newButton: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    left: 16,
    borderRadius: 8,
  },
}); 