import React, { useState, useRef, useEffect } from 'react';
import { ResourcePreloader } from '../utils/resourcePreloader';

interface OptimizedImageProps {
  src: string;
  alt: string;
  className?: string;
  placeholder?: string;
  width?: number;
  height?: number;
  priority?: boolean; // For above-the-fold images
  format?: 'webp' | 'avif'; // Preferred format
}

const OptimizedImage: React.FC<OptimizedImageProps> = ({
  src,
  alt,
  className = '',
  placeholder = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBmaWxsPSIjMzMzIi8+Cjwvc3ZnPgo=',
  width,
  height,
  priority = false,
  format
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isVisible, setIsVisible] = useState(priority);
  const [error, setError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  // Get optimized image URL
  const optimizedSrc = ResourcePreloader.getOptimizedImageUrl(src, format);

  useEffect(() => {
    if (priority) {
      // Preload priority images immediately
      ResourcePreloader.preloadImage(optimizedSrc, 'high');
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          ResourcePreloader.preloadImage(optimizedSrc, 'low');
          observer.unobserve(entry.target);
        }
      },
      {
        rootMargin: '50px', // Start loading 50px before image is visible
        threshold: 0.1
      }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, [optimizedSrc, priority]);

  const handleLoad = () => {
    setIsLoaded(true);
  };

  const handleError = () => {
    setError(true);
    setIsLoaded(true);
  };

  return (
    <div ref={imgRef} className={`relative overflow-hidden ${className}`}>
      {/* Placeholder */}
      {!isLoaded && (
        <img
          src={placeholder}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 w-full h-full object-cover filter blur-sm"
          style={{ filter: 'blur(4px)' }}
        />
      )}
      
      {/* Actual image */}
      {isVisible && (
        <img
          src={error ? placeholder : optimizedSrc}
          alt={alt}
          width={width}
          height={height}
          onLoad={handleLoad}
          onError={handleError}
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
          className={`w-full h-full object-cover transition-opacity duration-300 ${
            isLoaded ? 'opacity-100' : 'opacity-0'
          }`}
          style={{ 
            transition: 'opacity 0.3s ease-in-out',
            willChange: isLoaded ? 'auto' : 'opacity'
          }}
        />
      )}
      
      {/* Loading spinner for slow connections */}
      {!isLoaded && isVisible && (
        <div className="absolute inset-0 flex items-center justify-center bg-[var(--cyber-bg-card)]/50">
          <div className="animate-spin rounded-full h-6 w-6 border-2 border-white border-t-transparent"></div>
        </div>
      )}
    </div>
  );
};

export default OptimizedImage;
