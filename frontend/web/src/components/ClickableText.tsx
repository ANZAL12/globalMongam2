import React from 'react';

export interface TextSegment {
  text: string;
  url?: string;
}

export function parseLinksInText(content: string): TextSegment[] {
  if (!content) return [];

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
  className?: string;
  linkClassName?: string;
}

export default function ClickableText({
  text,
  className = '',
  linkClassName = 'text-[#1976d2] underline hover:text-[#1565c0] break-words font-medium',
}: ClickableTextProps) {
  const segments = parseLinksInText(text || '');

  return (
    <span className={className}>
      {segments.map((segment, index) => {
        if (segment.url) {
          return (
            <a
              key={index}
              href={segment.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className={linkClassName}
            >
              {segment.text}
            </a>
          );
        }
        return <React.Fragment key={index}>{segment.text}</React.Fragment>;
      })}
    </span>
  );
}
