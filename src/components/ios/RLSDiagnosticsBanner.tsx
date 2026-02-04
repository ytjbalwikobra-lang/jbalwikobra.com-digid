import React from 'react';
import { AlertTriangle, Database, Wifi, WifiOff } from 'lucide-react';
import { IOSCard } from './IOSDesignSystem';
import { cn } from '../../utils/cn';

interface RLSDiagnosticsProps {
  isConnected?: boolean;
  hasErrors?: boolean;
  errorMessage?: string;
  statsLoaded?: boolean;
  className?: string;
}

export const RLSDiagnosticsBanner: React.FC<RLSDiagnosticsProps> = ({
  isConnected = true,
  hasErrors = false,
  errorMessage,
  statsLoaded = true,
  className = ''
}) => {
  // Only show if there are issues
  if (isConnected && !hasErrors && statsLoaded) {
    return null;
  }

  const getIcon = () => {
    if (!isConnected) return WifiOff;
    if (hasErrors) return AlertTriangle;
    return Database;
  };

  const getVariant = () => {
    if (!isConnected || hasErrors) return 'error';
    return 'warning';
  };

  const getMessage = () => {
    if (!isConnected) return 'Database connection lost';
    if (hasErrors && errorMessage) return errorMessage;
    if (hasErrors) return 'Database query failed';
    if (!statsLoaded) return 'Loading database statistics...';
    return 'Database status unknown';
  };

  const Icon = getIcon();
  const variant = getVariant();

  return (
    <IOSCard 
      className={cn(
        'mb-4',
        variant === 'error' ? 'bg-red-950/50 border-red-500/50' : 'bg-yellow-950/50 border-yellow-500/50',
        className
      )}
      padding="medium"
    >
      <div className="flex items-start gap-3">
        <div className={cn(
          'p-2 rounded-xl',
          variant === 'error' ? 'bg-red-500/20' : 'bg-yellow-500/20'
        )}>
          <Icon className={cn(
            'w-5 h-5',
            variant === 'error' ? 'text-red-400' : 'text-yellow-400'
          )} />
        </div>
        
        <div className="flex-1 min-w-0">
          <h4 className={cn(
            'text-sm font-semibold mb-1',
            variant === 'error' ? 'text-red-300' : 'text-yellow-300'
          )}>
            {!isConnected ? 'Connection Issue' : hasErrors ? 'Data Fetch Error' : 'Database Notice'}
          </h4>
          
          <p className={cn(
            'text-sm',
            variant === 'error' ? 'text-red-200' : 'text-yellow-200'
          )}>
            {getMessage()}
          </p>
          
          {!statsLoaded && (
            <div className="flex items-center gap-2 mt-2">
              <div className="w-4 h-4 border-2 border-yellow-400/30 border-t-yellow-400 rounded-full animate-spin" />
              <span className="text-xs text-yellow-300">Retrying connection...</span>
            </div>
          )}
        </div>
      </div>
    </IOSCard>
  );
};
