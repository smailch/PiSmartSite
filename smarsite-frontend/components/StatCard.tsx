import { type LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  bgColor?: string;
  iconColor?: string;
}

export default function StatCard({
  title,
  value,
  icon: Icon,
  trend,
  bgColor = 'bg-blue-50',
  iconColor = 'text-primary',
}: StatCardProps) {
  return (
    <div className={`${bgColor} rounded-xl p-6 border border-border shadow-sm hover:shadow-md transition-shadow`}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <p className="text-sm text-muted-foreground font-medium">{title}</p>
          <h3 className="text-3xl font-bold text-foreground mt-2">{value}</h3>
          {trend && (
            <p className={`text-xs mt-2 font-semibold ${trend.isPositive ? 'text-green-600' : 'text-red-600'}`}>
              {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}% from last month
            </p>
          )}
        </div>
        <div className={`p-3 rounded-lg ${iconColor === 'text-primary' ? 'bg-primary/10' : 'bg-accent/10'}`}>
          <Icon size={24} className={iconColor === 'text-primary' ? 'text-primary' : 'text-accent'} />
        </div>
      </div>
    </div>
  );
}
