import React from 'react';

interface LinkifyTextProps {
  text: string;
  className?: string;
}

const LinkifyText: React.FC<LinkifyTextProps> = ({ text, className = '' }) => {
  const processText = (text: string) => {
    // Regular expressions for different types of links
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const wwwRegex = /(www\.[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?)*)/g;
    const emailRegex = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g;
    const phoneRegex = /(\+?\d{1,4}[\s\-]?\d{3,4}[\s\-]?\d{3,4}[\s\-]?\d{3,4})/g;
    const hashtagRegex = /(#[a-zA-Z0-9_]+)/g;
    const mentionRegex = /(@[a-zA-Z0-9_]+)/g;
    const priceRegex = /(Rp\.?\s?[\d.,]+)/gi;
    
    // Split text by different patterns and process each part
    const parts: (string | React.ReactElement)[] = [];
    let lastIndex = 0;
    
    // Combine all patterns into one regex for processing
    const combinedRegex = new RegExp(
      `(${urlRegex.source})|(${wwwRegex.source})|(${emailRegex.source})|(${phoneRegex.source})|(${hashtagRegex.source})|(${mentionRegex.source})|(${priceRegex.source})`,
      'gi'
    );
    
    let match;
    while ((match = combinedRegex.exec(text)) !== null) {
      // Add text before the match
      if (match.index > lastIndex) {
        parts.push(text.substring(lastIndex, match.index));
      }
      
      const matchedText = match[0];
      const key = `${match.index}-${matchedText}`;
      
      if (matchedText.match(urlRegex)) {
        // URL link
        parts.push(
          <a
            key={key}
            href={matchedText}
            target="_blank"
            rel="noopener noreferrer nofollow ugc"
            className="text-pink-500 hover:text-pink-500/80 underline transition-colors"
          >
            {matchedText}
          </a>
        );
      } else if (matchedText.match(wwwRegex)) {
        // www. link (add https:// prefix)
        parts.push(
          <a
            key={key}
            href={`https://${matchedText}`}
            target="_blank"
            rel="noopener noreferrer nofollow ugc"
            className="text-pink-500 hover:text-pink-500/80 underline transition-colors"
          >
            {matchedText}
          </a>
        );
      } else if (matchedText.match(emailRegex)) {
        // Email link
        parts.push(
          <a
            key={key}
            href={`mailto:${matchedText}`}
            className="text-pink-500 hover:text-pink-500/80 underline transition-colors"
          >
            {matchedText}
          </a>
        );
      } else if (matchedText.match(phoneRegex)) {
        // Phone link
        const cleanPhone = matchedText.replace(/[\s\-]/g, '');
        parts.push(
          <a
            key={key}
            href={`tel:${cleanPhone}`}
            className="text-pink-500 hover:text-pink-500/80 underline transition-colors"
          >
            {matchedText}
          </a>
        );
      } else if (matchedText.match(hashtagRegex)) {
        // Hashtag
        parts.push(
          <span
            key={key}
            className="text-pink-500 font-medium cursor-pointer hover:text-pink-500/80 transition-colors"
            onClick={() => {
              // Could integrate with search functionality
            }}
          >
            {matchedText}
          </span>
        );
      } else if (matchedText.match(mentionRegex)) {
        // Mention
        parts.push(
          <span
            key={key}
            className="text-pink-500 font-medium cursor-pointer hover:text-pink-500/80 transition-colors"
            onClick={() => {
              // Could integrate with user profile functionality
            }}
          >
            {matchedText}
          </span>
        );
      } else if (matchedText.match(priceRegex)) {
        // Price highlighting
        parts.push(
          <span
            key={key}
            className="font-semibold text-green-600 dark:text-green-400"
          >
            {matchedText}
          </span>
        );
      }
      
      lastIndex = match.index + matchedText.length;
    }
    
    // Add remaining text
    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex));
    }
    
    return parts.length > 0 ? parts : [text];
  };

  return (
    <span className={className}>
      {processText(text)}
    </span>
  );
};

export default LinkifyText;
