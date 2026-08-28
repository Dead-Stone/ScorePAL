/**
 * LottieAnimation - Component to display Lottie animations from LottieFiles
 * Uses free animations from LottieFiles CDN
 */

import React, { useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';

// Dynamically import lottie-react to avoid SSR issues
const Lottie = dynamic(() => import('lottie-react'), { ssr: false });

interface LottieAnimationProps {
  src?: string; // URL to Lottie JSON file
  animationData?: any; // Direct animation data
  className?: string;
  loop?: boolean;
  autoplay?: boolean;
  style?: React.CSSProperties;
}

export const LottieAnimation: React.FC<LottieAnimationProps> = ({
  src,
  animationData,
  className = '',
  loop = true,
  autoplay = true,
  style = {},
}) => {
  const [animation, setAnimation] = React.useState<any>(null);
  const [error, setError] = React.useState(false);

  useEffect(() => {
    if (src) {
      fetch(src)
        .then((res) => res.json())
        .then((data) => setAnimation(data))
        .catch(() => setError(true));
    } else if (animationData) {
      setAnimation(animationData);
    }
  }, [src, animationData]);

  if (error || !animation) {
    // Fallback to a simple placeholder
    return (
      <div
        className={`flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg ${className}`}
        style={style}
      >
        <div className="text-center p-8">
          <div className="w-16 h-16 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 mx-auto mb-4 animate-pulse"></div>
          <p className="text-sm text-gray-500">Loading animation...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={className} style={style}>
      <Lottie
        animationData={animation}
        loop={loop}
        autoplay={autoplay}
        style={{ width: '100%', height: '100%', ...style }}
      />
    </div>
  );
};



