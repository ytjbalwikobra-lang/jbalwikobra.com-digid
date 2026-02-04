import React, { useState, useEffect } from 'react';
import { calculateTimeRemaining } from '../utils/helpers';
import { Clock } from 'lucide-react';

interface FlashSaleTimerProps {
  endTime: string;
  className?: string;
  compact?: boolean;
  variant?: 'card' | 'inline' | 'detail'; // Added 'detail' variant
}

const FlashSaleTimer: React.FC<FlashSaleTimerProps> = ({ 
  endTime, 
  className = '',
  compact = false,
  variant = 'inline'
}) => {
  const [timeRemaining, setTimeRemaining] = useState(() => calculateTimeRemaining(endTime));

  useEffect(() => {
    const timer = setInterval(() => {
      const remaining = calculateTimeRemaining(endTime);
      setTimeRemaining(remaining);
      
      if (remaining.isExpired) {
        clearInterval(timer as any);
      }
    }, 1000);

    return () => clearInterval(timer as any);
  }, [endTime]);

  if (timeRemaining.isExpired) {
    if (variant === 'card') {
      return (
        <div className={`w-full flex items-center justify-center gap-1.5 bg-[var(--cyber-bg-elevated)] text-[var(--cyber-text-secondary)] rounded-xl py-1.5 text-[10px] font-bold tracking-wide ${className}`}>
          <Clock className="w-3 h-3" />
          <span>Berakhir</span>
        </div>
      );
    }
    
    return (
      <div className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-cyber-lg bg-[var(--cyber-bg-pure)] text-[var(--cyber-pink-primary)] text-xs font-semibold border border-pink-500/60 backdrop-blur-sm ${className}`}>
        <Clock size={12} className="text-[var(--cyber-pink-primary)]" />
        <span>BERAKHIR</span>
      </div>
    );
  }

  if (variant === 'detail') {
    return (
      <div className={`flex justify-center space-x-3 ${className}`}>
        <div className="text-center">
          <div className="bg-gradient-to-r from-red-500 to-pink-500 text-white px-3 py-2 rounded-xl font-bold text-lg font-mono tracking-wide shadow-sm flex items-center justify-center min-w-[50px]">
            {timeRemaining.days.toString().padStart(2, '0')}
          </div>
          <span className="text-xs text-red-300 mt-1 block font-medium">Hari</span>
        </div>
        <div className="text-center">
          <div className="bg-gradient-to-r from-red-500 to-pink-500 text-white px-3 py-2 rounded-xl font-bold text-lg font-mono tracking-wide shadow-sm flex items-center justify-center min-w-[50px]">
            {timeRemaining.hours.toString().padStart(2, '0')}
          </div>
          <span className="text-xs text-red-300 mt-1 block font-medium">Jam</span>
        </div>
        <div className="text-center">
          <div className="bg-gradient-to-r from-red-500 to-pink-500 text-white px-3 py-2 rounded-xl font-bold text-lg font-mono tracking-wide shadow-sm flex items-center justify-center min-w-[50px]">
            {timeRemaining.minutes.toString().padStart(2, '0')}
          </div>
          <span className="text-xs text-red-300 mt-1 block font-medium">Menit</span>
        </div>
        <div className="text-center">
          <div className="bg-gradient-to-r from-red-500 to-pink-500 text-white px-3 py-2 rounded-xl font-bold text-lg font-mono tracking-wide shadow-sm flex items-center justify-center min-w-[50px]">
            {timeRemaining.seconds.toString().padStart(2, '0')}
          </div>
          <span className="text-xs text-red-300 mt-1 block font-medium">Detik</span>
        </div>
      </div>
    );
  }

  if (variant === 'card') {
    return (
      <div className={`w-full flex items-center justify-center gap-1.5 bg-amber-600 text-white rounded-xl py-1.5 text-[10px] font-bold tracking-wide shadow-md ${className}`}>
        <Clock className="w-3 h-3" />
        <span className="truncate">
          {timeRemaining.days > 0 && `${timeRemaining.days}h `}
          {`${timeRemaining.hours.toString().padStart(2,'0')}:${timeRemaining.minutes.toString().padStart(2,'0')}:${timeRemaining.seconds.toString().padStart(2,'0')}`}
        </span>
      </div>
    );
  }

  if (compact) {
    return (
      <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-cyber-lg bg-[var(--cyber-bg-pure)] text-[var(--cyber-pink-primary)] text-xs font-bold border border-pink-500/60 backdrop-blur-sm shadow-lg ${className}`}>
        <Clock size={10} className="text-[var(--cyber-pink-primary)]" />
        <span className="text-[var(--cyber-pink-primary)]">
          {timeRemaining.days > 0 ? (
            `${timeRemaining.days}d ${timeRemaining.hours.toString().padStart(2, '0')}:${timeRemaining.minutes.toString().padStart(2, '0')}`
          ) : (
            `${timeRemaining.hours.toString().padStart(2, '0')}:${timeRemaining.minutes.toString().padStart(2, '0')}:${timeRemaining.seconds.toString().padStart(2, '0')}`
          )}
        </span>
      </div>
    );
  }

  return (
    <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-cyber-lg bg-[var(--cyber-bg-pure)] text-[var(--cyber-pink-primary)] border border-pink-500/60 backdrop-blur-sm shadow-lg ${className}`}>
      <Clock size={14} className="text-[var(--cyber-pink-primary)]" />
      <div className="flex items-center gap-1 text-sm font-bold">
        {timeRemaining.days > 0 && (
          <>
            <span className="tabular-nums">{timeRemaining.days}</span>
            <span className="text-pink-300 text-xs">d</span>
          </>
        )}
        <span className="tabular-nums">{timeRemaining.hours.toString().padStart(2, '0')}</span>
        <span className="text-pink-300">:</span>
        <span className="tabular-nums">{timeRemaining.minutes.toString().padStart(2, '0')}</span>
        <span className="text-pink-300">:</span>
        <span className="tabular-nums">{timeRemaining.seconds.toString().padStart(2, '0')}</span>
      </div>
    </div>
  );
};

export default FlashSaleTimer;
