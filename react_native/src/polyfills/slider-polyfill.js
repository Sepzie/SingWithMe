import React from 'react';
import { View, StyleSheet } from 'react-native';

// A simple slider component for web that mimics the react-native-slider API
const Slider = ({
  value = 0,
  minimumValue = 0,
  maximumValue = 1,
  step = 0.01,
  onValueChange,
  style = {},
  minimumTrackTintColor = '#3f3f3f',
  maximumTrackTintColor = '#b3b3b3',
  thumbTintColor = '#343434',
}) => {
  // Convert the react-native style to web style
  const webStyle = {
    ...StyleSheet.flatten(style),
  };

  const handleChange = (e) => {
    if (onValueChange) {
      onValueChange(parseFloat(e.target.value));
    }
  };

  return (
    <input
      type="range"
      value={value}
      min={minimumValue}
      max={maximumValue}
      step={step}
      onChange={handleChange}
      style={{
        ...webStyle,
        width: webStyle.width || '100%',
        height: webStyle.height || 40,
        accentColor: minimumTrackTintColor,
      }}
    />
  );
};

export default Slider; 