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
  bgColor: _bgColor = 'bg-white',
  iconColor = 'text-blue-600',
}: StatCardProps) {
  void _bgColor;
  const isAccent =
    iconColor.includes('orange') ||
    iconColor === 'text-accent' ||
    iconColor.includes('accent');
  return (
    <div className="rounded-2xl border border-white/10 bg-card/80 p-6 shadow-lg shadow-black/25 backdrop-blur-xl transition-all duration-300 ease-out hover:-translate-y-1 hover:border-white/[0.14] hover:shadow-xl hover:shadow-black/40">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium tracking-wide text-slate-400">
            {title}
          </p>
          <h3 className="mt-2 text-3xl font-semibold tracking-tight text-slate-50">
            {value}
          </h3>
          {trend && (
            <p
              className={`mt-2 text-xs font-medium ${trend.isPositive ? 'text-emerald-400' : 'text-orange-400'}`}
            >
              {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}% from last month
            </p>
          )}
        </div>
        <div
          className={`shrink-0 rounded-xl border border-white/10 p-3 shadow-inner shadow-black/20 backdrop-blur-sm ${isAccent ? 'bg-gradient-to-br from-orange-500/25 to-orange-600/5' : 'bg-gradient-to-br from-blue-500/25 to-blue-600/5'}`}
        >
          <Icon
            size={24}
            className={isAccent ? 'text-orange-400' : 'text-blue-400'}
          />
        </div>
      </div>
    </div>
  );
}
