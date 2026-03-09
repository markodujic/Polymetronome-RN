import { useState } from 'react';
import { View } from 'react-native';
import Slider from '@react-native-community/slider';

const SLIDER_THUMB_PAD = 11;

export function GlowSlider({
  wrapperStyle,
  sliderStyle,
  sliderHeight = 40,
  glowColor = '#ff6b35',
  muted = false,
  minimumValue = 0,
  maximumValue = 1,
  value,
  onValueChange,
  ...rest
}: {
  wrapperStyle?: any;
  sliderStyle?: any;
  sliderHeight?: number;
  glowColor?: string;
  muted?: boolean;
  minimumValue?: number;
  maximumValue?: number;
  value: number;
  onValueChange: (v: number) => void;
  [key: string]: any;
}) {
  const [trackWidth, setTrackWidth] = useState(0);
  const fraction = maximumValue > minimumValue
    ? Math.max(0, Math.min(1, (value - minimumValue) / (maximumValue - minimumValue)))
    : 0;
  const thumbCenterX = SLIDER_THUMB_PAD + fraction * Math.max(0, trackWidth - 2 * SLIDER_THUMB_PAD);

  return (
    <View
      style={[{ flex: 1, overflow: 'visible' }, wrapperStyle]}
      onLayout={e => setTrackWidth(e.nativeEvent.layout.width)}
    >
      {trackWidth > 0 && !muted && fraction > 0 && (
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: glowColor,
            opacity: 0.15 + fraction * 0.35,
            left: thumbCenterX - 18,
            top: (sliderHeight - 36) / 2,
          }}
        />
      )}
      <Slider
        style={[{ width: '100%', height: sliderHeight }, sliderStyle]}
        minimumValue={minimumValue}
        maximumValue={maximumValue}
        value={value}
        onValueChange={onValueChange}
        thumbTintColor={muted ? '#4a5a6a' : glowColor}
        {...rest}
      />
    </View>
  );
}
