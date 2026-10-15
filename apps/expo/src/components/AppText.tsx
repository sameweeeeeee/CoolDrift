// AppText.tsx — use this instead of <Text>. It automatically gets bigger
// when "Large text" or "Senior mode" is turned on.

import React from 'react';
import { Text, TextProps } from 'react-native';
import { useSettings } from '../context/SettingsContext';
import { colors, fontSize } from '../theme';

type Props = TextProps & {
  size?: keyof typeof fontSize; // small | body | large | title | huge
  bold?: boolean;
  color?: string;
  center?: boolean;
};

export default function AppText({ size = 'body', bold, color = colors.text, center, style, ...rest }: Props) {
  const { textScale } = useSettings();
  const px = fontSize[size] * textScale;
  return (
    <Text
      style={[
        { fontSize: px, lineHeight: px * 1.3, color, fontWeight: bold ? '700' : '400' },
        center && { textAlign: 'center' },
        style,
      ]}
      {...rest}
    />
  );
}
