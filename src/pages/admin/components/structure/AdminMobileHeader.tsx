import React, { useState, useEffect } from 'react';
import { Menu, ArrowLeft } from 'lucide-react';

interface AdminMobileHeaderProps {
  onOpenMenu(): void;
}

export const AdminMobileHeader: React.FC<AdminMobileHeaderProps> = ({ onOpenMenu }) => {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formatDateTime = (date: Date) => {
    return {
      time: date.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: true 
      }),
      date: date.toLocaleDateString('en-US', { 
        weekday: 'short',
        month: 'short', 
        day: 'numeric' 
      })
    };
  };

  const { time, date } = formatDateTime(currentTime);

  return (
    <div className="lg:hidden surface-glass-md border-b border-token sticky top-0 left-0 right-0 z-50 shadow-2xl shadow-pink-500/10">
      <div className="cluster-md px-md py-md">
        <div className="cluster-sm">
          <button
            onClick={onOpenMenu}
            className="btn btn-ghost btn-sm surface-tint-pink hover:bg-[var(--cyber-pink-primary)]/25 transition-soft"
          >
            <Menu className="w-6 h-6 text-accent" />
          </button>
          <h1 className="heading-brand fs-xl">
            Admin Dashboard
          </h1>
        </div>
        
        <div className="cluster-sm">
          {/* Current Date and Time */}
          <div className="hidden sm:flex flex-col items-end text-right">
            <div className="fs-sm font-semibold text-accent">{time}</div>
            <div className="fs-xs text-secondary">{date}</div>
          </div>
          
          {/* Back to Store Button */}
          <button 
            onClick={() => window.open('/', '_blank')}
            className="btn btn-ghost btn-sm cluster-xs surface-tint-blue hover:bg-blue-500/25 transition-soft"
          >
            <ArrowLeft className="w-5 h-5 text-blue-400" />
            <span className="text-blue-200 font-medium fs-sm">Store</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminMobileHeader;
