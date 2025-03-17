import React, { useEffect, useRef } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';

export const LyricsDisplay = ({ lyrics, currentTime }) => {
  const scrollViewRef = useRef(null);
  const currentLineRef = useRef(null);

  const findCurrentLine = () => {
    if (!lyrics || !lyrics.length) return 0;
    
    for (let i = lyrics.length - 1; i >= 0; i--) {
      if (lyrics[i].startTime <= currentTime) {
        return i;
      }
    }
    return 0;
  };

  useEffect(() => {
    const currentLineIndex = findCurrentLine();
    if (currentLineRef.current && scrollViewRef.current) {
      currentLineRef.current.measureLayout(
        scrollViewRef.current,
        (x, y) => {
          scrollViewRef.current.scrollTo({ y: y - 100, animated: true });
        },
        () => {}
      );
    }
  }, [currentTime]);

  if (!lyrics || !lyrics.length) {
    return (
      <View style={styles.container}>
        <Text>No lyrics available</Text>
      </View>
    );
  }

  return (
    <ScrollView 
      ref={scrollViewRef}
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
    >
      {lyrics.map((line, index) => {
        const isCurrentLine = line.startTime <= currentTime && 
          (index === lyrics.length - 1 || lyrics[index + 1].startTime > currentTime);
        
        return (
          <Text
            key={index}
            ref={isCurrentLine ? currentLineRef : null}
            style={[
              styles.lyricLine,
              isCurrentLine && styles.currentLine
            ]}
          >
            {line.text}
          </Text>
        );
      })}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  contentContainer: {
    padding: 16,
  },
  lyricLine: {
    fontSize: 18,
    marginVertical: 8,
    textAlign: 'center',
    color: '#666',
  },
  currentLine: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 20,
  },
}); 