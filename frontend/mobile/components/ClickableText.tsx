import React from 'react';
import { Text, TextStyle, StyleProp, Linking, Alert } from 'react-native';

export interface TextSegment {
  text: string;
  url?: string;
}

export function parseLinksInText(content: string): TextSegment[] {
  if (!content) return [];

  // Match:
  // 1. Markdown link: [Title](https://...)
  // 2. http:// or https:// URLs
  // 3. www. URLs
  const pattern = /(\[([^\]]+)\]\((https?:\/\/[^\s)]+)\))|(https?:\/\/[^\s<]+[^<.,:;"')\]\s])|(www\.[^\s<]+[^<.,:;"')\]\s])/gi;

  const segments: TextSegment[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(content)) !== null) {
    if (match.index > lastIndex) {
      segments.push({
        text: content.substring(lastIndex, match.index),
      });
    }

    if (match[1]) {
      // Markdown link: [Title](URL)
      segments.push({ text: match[2], url: match[3] });
    } else if (match[4]) {
      // http:// or https:// URL
      segments.push({ text: match[4], url: match[4] });
    } else if (match[5]) {
      // www. URL
      segments.push({ text: match[5], url: `https://${match[5]}` });
    }

    lastIndex = pattern.lastIndex;
  }

  if (lastIndex < content.length) {
    segments.push({
      text: content.substring(lastIndex),
    });
  }

  return segments;
}

interface ClickableTextProps {
  text: string;
  style?: StyleProp<TextStyle>;
  linkStyle?: StyleProp<TextStyle>;
  numberOfLines?: number;
}

export default function ClickableText({
  text,
  style,
  linkStyle,
  numberOfLines,
}: ClickableTextProps) {
  const segments = parseLinksInText(text || '');

  const handlePressUrl = async (url: string) => {
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert('Cannot Open Link', `Unable to open: ${url}`);
      }
    } catch (err) {
      console.warn('Failed to open URL:', url, err);
      try {
        await Linking.openURL(url);
      } catch (e) {
        Alert.alert('Error', 'Could not open link in browser.');
      }
    }
  };

  return (
    <Text style={style} numberOfLines={numberOfLines}>
      {segments.map((segment, index) => {
        if (segment.url) {
          return (
            <Text
              key={index}
              style={[
                style,
                { color: '#1976d2', textDecorationLine: 'underline', fontWeight: '500' },
                linkStyle,
              ]}
              onPress={() => handlePressUrl(segment.url!)}
              suppressHighlighting={false}
            >
              {segment.text}
            </Text>
          );
        }
        return <Text key={index}>{segment.text}</Text>;
      })}
    </Text>
  );
}
