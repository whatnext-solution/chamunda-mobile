import * as React from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface Column<T> {
  key: keyof T | string;
  label: string;
  render?: (item: T) => React.ReactNode;
  mobileHidden?: boolean;
  className?: string;
}

interface ResponsiveTableProps<T> {
  data: T[];
  columns: Column<T>[];
  keyExtractor: (item: T) => string;
  onRowClick?: (item: T) => void;
  emptyMessage?: string;
  mobileCardRender?: (item: T, index: number) => React.ReactNode;
}

export function ResponsiveTable<T extends Record<string, any>>({
  data,
  columns,
  keyExtractor,
  onRowClick,
  emptyMessage = 'No data available',
  mobileCardRender
}: ResponsiveTableProps<T>) {
  const isMobile = useIsMobile();

  if (data.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        {emptyMessage}
      </div>
    );
  }

  // Mobile: Card Layout
  if (isMobile) {
    if (mobileCardRender) {
      return (
        <div className="space-y-3">
          {data.map((item, index) => (
            <div key={keyExtractor(item)}>
              {mobileCardRender(item, index)}
            </div>
          ))}
        </div>
      );
    }

    // Default mobile card layout
    return (
      <div className="space-y-3">
        {data.map((item) => (
          <Card 
            key={keyExtractor(item)} 
            className={`${onRowClick ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}`}
            onClick={() => onRowClick?.(item)}
          >
            <CardContent className="p-4">
              {columns.filter(col => !col.mobileHidden).map((col) => (
                <div key={String(col.key)} className="flex justify-between py-1.5 border-b last:border-b-0">
                  <span className="text-sm text-muted-foreground">{col.label}</span>
                  <span className="text-sm font-medium text-right">
                    {col.render ? col.render(item) : String(item[col.key as keyof T] ?? '-')}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  // Desktop/Tablet: Standard Table
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/50">
            {columns.map((col) => (
              <th 
                key={String(col.key)} 
                className={`text-left p-3 font-medium text-muted-foreground ${col.className || ''}`}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((item) => (
            <tr 
              key={keyExtractor(item)} 
              className={`border-b hover:bg-muted/30 ${onRowClick ? 'cursor-pointer' : ''}`}
              onClick={() => onRowClick?.(item)}
            >
              {columns.map((col) => (
                <td key={String(col.key)} className={`p-3 ${col.className || ''}`}>
                  {col.render ? col.render(item) : String(item[col.key as keyof T] ?? '-')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Responsive Stats Grid Component
interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  description?: string;
  trend?: {
    value: string;
    isPositive: boolean;
  };
  iconBgClass?: string;
}

export function ResponsiveStatsGrid({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-6">
      {children}
    </div>
  );
}

export function StatCard({ title, value, icon, description, trend, iconBgClass = 'bg-blue-100' }: StatCardProps) {
  return (
    <Card>
      <CardContent className="p-3 md:p-4">
        <div className="flex items-center justify-between">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-gray-600 truncate">{title}</p>
            <p className="text-base md:text-lg font-bold text-gray-900 truncate">{value}</p>
            {description && (
              <p className="text-xs text-muted-foreground mt-1 truncate">{description}</p>
            )}
            {trend && (
              <p className={`text-xs flex items-center mt-1 ${trend.isPositive ? 'text-green-600' : 'text-red-600'}`}>
                {trend.value}
              </p>
            )}
          </div>
          <div className={`p-2 rounded-full flex-shrink-0 ${iconBgClass}`}>
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Responsive Filter Grid
export function ResponsiveFilterGrid({ children, columns = 4 }: { children: React.ReactNode; columns?: number }) {
  return (
    <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-${columns} gap-3 md:gap-4`}>
      {children}
    </div>
  );
}

// Responsive Action Bar
export function ResponsiveActionBar({ 
  title, 
  actions 
}: { 
  title: string; 
  actions: React.ReactNode;
}) {
  const isMobile = useIsMobile();
  
  return (
    <div className={`flex ${isMobile ? 'flex-col gap-3' : 'items-center justify-between'}`}>
      <h1 className={`font-bold text-gray-900 ${isMobile ? 'text-xl' : 'text-2xl md:text-3xl'}`}>
        {title}
      </h1>
      <div className={`flex ${isMobile ? 'w-full' : ''} gap-2`}>
        {actions}
      </div>
    </div>
  );
}
