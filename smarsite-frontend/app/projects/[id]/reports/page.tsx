'use client';


import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { getProjectAIReport } from '@/lib/api';
import {
  DollarSign,
  CheckCircle2,
  Clock,
  AlertTriangle,
  FileText,
  Calendar,
  RefreshCw,
  TrendingUp,
  AlertCircle,
  Lightbulb,
  ShieldCheck,
  ShieldAlert,
  Shield,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import MainLayout from '@/components/MainLayout';

type Report = {
  totalInvoiced: number;
  totalPaid: number;
  totalPending: number;
  overdueAmount: number;
  invoiceCount: number;
  oldestUnpaidInvoiceDays: number;
  score: number;
  risk: 'LOW' | 'MEDIUM' | 'HIGH';
  ai: {
    summary: string;
    issues: string[];
    recommendations: string[];
    confidence: string;
  };
};

const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

const getRiskConfig = (risk: Report['risk']) => {
  const configs = {
    LOW: {
      color: 'bg-emerald-500',
      textColor: 'text-emerald-600',
      bgLight: 'bg-emerald-50',
      borderColor: 'border-emerald-200',
      icon: ShieldCheck,
      label: 'Low Risk',
    },
    MEDIUM: {
      color: 'bg-amber-500',
      textColor: 'text-amber-600',
      bgLight: 'bg-amber-50',
      borderColor: 'border-amber-200',
      icon: Shield,
      label: 'Medium Risk',
    },
    HIGH: {
      color: 'bg-red-500',
      textColor: 'text-red-600',
      bgLight: 'bg-red-50',
      borderColor: 'border-red-200',
      icon: ShieldAlert,
      label: 'High Risk',
    },
  };
  return configs[risk];
};

const getScoreColor = (score: number): string => {
  if (score >= 80) return 'text-emerald-600';
  if (score >= 60) return 'text-amber-600';
  return 'text-red-600';
};

const getProgressColor = (score: number): string => {
  if (score >= 80) return '[&>div]:bg-emerald-500';
  if (score >= 60) return '[&>div]:bg-amber-500';
  return '[&>div]:bg-red-500';
};

export default function ReportsPage() {
  const params = useParams();
  const id = params?.id as string;

  const [data, setData] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchReport = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setIsRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);
      const res = await getProjectAIReport(id);
      setData(res);
    } catch (err) {
      console.error(err);
      setError('Unable to load the financial report. Please try again.');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [id]);

  useEffect(() => {
    if (!id) return;
    fetchReport();
  }, [id, fetchReport]);

  if (loading && !data) {
    return <ReportSkeleton />;
  }

  if (error && !data) {
    return (
      <div className="min-h-screen bg-background p-6 flex items-center justify-center">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
              <AlertCircle className="w-6 h-6 text-destructive" />
            </div>
            <h2 className="text-lg font-semibold text-foreground mb-2">Failed to Load Report</h2>
            <p className="text-muted-foreground text-sm mb-4">{error}</p>
            <button
  onClick={() => {
    window.open(
      `http://localhost:3200/reports/project/${id}/pdf`,
      '_blank'
    );
  }}
  className="px-5 py-2.5 rounded-xl bg-green-600 text-white shadow hover:opacity-90"
>
  Download PDF
</button>
            <Button onClick={() => fetchReport()} variant="default">
              <RefreshCw className="w-4 h-4 mr-2" />
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!data) return null;

  const riskConfig = getRiskConfig(data.risk);
  const RiskIcon = riskConfig.icon;
  const paymentRate = data.totalInvoiced > 0 
    ? Math.round((data.totalPaid / data.totalInvoiced) * 100) 
    : 0;

  return (
        <MainLayout>

      

    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        {/* Header */}
        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex gap-2">
  <Button
    onClick={() =>
      window.open(
        `http://localhost:3200/reports/project/${id}/pdf`,
        '_blank'
      )
    }
    className="bg-emerald-600 hover:bg-emerald-700 text-white"
  >
    Download PDF
  </Button>

  <Button
    onClick={() => fetchReport(true)}
    disabled={isRefreshing}
    variant="outline"
    className="shrink-0"
  >
    <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
    {isRefreshing ? 'Refreshing...' : 'Refresh Report'}
  </Button>
</div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">
              Financial Report
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              AI-powered analysis of project invoices and payments
            </p>
          </div>
          <Button
            onClick={() => fetchReport(true)}
            disabled={isRefreshing}
            variant="outline"
            className="shrink-0"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            {isRefreshing ? 'Refreshing...' : 'Refresh Report'}
          </Button>
        </header>

        {/* Score & Risk Overview */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Project Score Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-medium flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-muted-foreground" />
                Project Health Score
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-end gap-2 mb-4">
                <span className={`text-5xl font-bold tabular-nums ${getScoreColor(data.score)}`}>
                  {data.score}
                </span>
                <span className="text-muted-foreground text-lg mb-1">/100</span>
              </div>
              <Progress 
                value={data.score} 
                className={`h-2 ${getProgressColor(data.score)}`}
                aria-label={`Project score: ${data.score} out of 100`}
              />
              <p className="text-xs text-muted-foreground mt-2">
                Based on payment history, overdue invoices, and cash flow patterns
              </p>
            </CardContent>
          </Card>

          {/* Risk Assessment Card */}
          <Card className={`${riskConfig.bgLight} ${riskConfig.borderColor} border`}>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-medium flex items-center gap-2">
                <RiskIcon className={`w-4 h-4 ${riskConfig.textColor}`} />
                Risk Assessment
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Badge 
                className={`${riskConfig.color} text-white text-lg px-4 py-1.5 font-semibold`}
              >
                {riskConfig.label}
              </Badge>
              <p className={`text-sm mt-3 ${riskConfig.textColor}`}>
                {data.risk === 'LOW' && 'Project finances are healthy with consistent payment patterns.'}
                {data.risk === 'MEDIUM' && 'Some attention needed. Review pending invoices and payment timelines.'}
                {data.risk === 'HIGH' && 'Immediate action required. Significant overdue amounts detected.'}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* KPI Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          <StatCard
            title="Total Invoiced"
            value={formatCurrency(data.totalInvoiced)}
            icon={DollarSign}
            iconColor="text-blue-600"
            iconBg="bg-blue-50"
          />
          <StatCard
            title="Total Paid"
            value={formatCurrency(data.totalPaid)}
            icon={CheckCircle2}
            iconColor="text-emerald-600"
            iconBg="bg-emerald-50"
            subtitle={`${paymentRate}% collected`}
          />
          <StatCard
            title="Pending"
            value={formatCurrency(data.totalPending)}
            icon={Clock}
            iconColor="text-amber-600"
            iconBg="bg-amber-50"
          />
          <StatCard
            title="Overdue"
            value={formatCurrency(data.overdueAmount)}
            icon={AlertTriangle}
            iconColor="text-red-600"
            iconBg="bg-red-50"
            highlight={data.overdueAmount > 0}
          />
          <StatCard
            title="Invoice Count"
            value={data.invoiceCount.toString()}
            icon={FileText}
            iconColor="text-violet-600"
            iconBg="bg-violet-50"
          />
          <StatCard
            title="Oldest Unpaid"
            value={data.oldestUnpaidInvoiceDays > 0 ? `${data.oldestUnpaidInvoiceDays} days` : '-'}
            icon={Calendar}
            iconColor="text-orange-600"
            iconBg="bg-orange-50"
            highlight={data.oldestUnpaidInvoiceDays > 30}
          />
        </div>

        {/* AI Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              AI Analysis Summary
            </CardTitle>
            <CardDescription>
              Generated insights based on invoice and payment data
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-foreground leading-relaxed">{data.ai.summary}</p>
          </CardContent>
        </Card>

        {/* Issues & Recommendations Grid */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Issues */}
          <Card className={data.ai.issues.length > 0 ? 'border-red-200' : ''}>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2 text-red-600">
                <AlertCircle className="w-5 h-5" />
                Issues Detected
                {data.ai.issues.length > 0 && (
                  <Badge variant="destructive" className="ml-auto">
                    {data.ai.issues.length}
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {data.ai.issues.length === 0 ? (
                <div className="flex items-center gap-3 text-muted-foreground py-4">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                  <span>No issues detected. Keep up the good work!</span>
                </div>
              ) : (
                <ul className="space-y-3" role="list" aria-label="List of issues">
                  {data.ai.issues.map((issue, i) => (
                    <li key={i} className="flex gap-3 text-foreground">
                      <span className="shrink-0 w-5 h-5 rounded-full bg-red-100 text-red-600 flex items-center justify-center text-xs font-medium">
                        {i + 1}
                      </span>
                      <span className="text-sm leading-relaxed">{issue}</span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          {/* Recommendations */}
          <Card className="border-emerald-200">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2 text-emerald-600">
                <Lightbulb className="w-5 h-5" />
                Recommendations
                <Badge variant="secondary" className="ml-auto bg-emerald-50 text-emerald-700">
                  {data.ai.recommendations.length}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {data.ai.recommendations.length === 0 ? (
                <p className="text-muted-foreground py-4">No recommendations at this time.</p>
              ) : (
                <ul className="space-y-3" role="list" aria-label="List of recommendations">
                  {data.ai.recommendations.map((rec, i) => (
                    <li key={i} className="flex gap-3 text-foreground">
                      <span className="shrink-0 w-5 h-5 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-xs font-medium">
                        {i + 1}
                      </span>
                      <span className="text-sm leading-relaxed">{rec}</span>
                    </li>
                  ))}
                </ul>
              )}
              <div className="mt-4 pt-4 border-t">
                <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50" />
                  AI Confidence: <span className="font-medium">{data.ai.confidence}</span>
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
        
      </div>
      
    </div>
      </MainLayout>

    
    
    
  );
}


/* ========================= */
/* COMPONENTS */
/* ========================= */

interface StatCardProps {
  title: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  iconColor: string;
  iconBg: string;
  subtitle?: string;
  highlight?: boolean;
}

function StatCard({ title, value, icon: Icon, iconColor, iconBg, subtitle, highlight }: StatCardProps) {
  return (
    <Card className={highlight ? 'border-red-200 bg-red-50/30' : ''}>
      <CardContent className="pt-4 pb-4">
        <div className="flex items-start justify-between mb-2">
          <div className={`p-2 rounded-lg ${iconBg}`}>
            <Icon className={`w-4 h-4 ${iconColor}`} />
          </div>
        </div>
        <p className="text-xs text-muted-foreground font-medium">{title}</p>
        <p className={`text-xl font-semibold mt-0.5 tabular-nums ${highlight ? 'text-red-600' : 'text-foreground'}`}>
          {value}
        </p>
        {subtitle && (
          <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
        )}
      </CardContent>
    </Card>
  );
}

function ReportSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        {/* Header Skeleton */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-64 mt-2" />
          </div>
          <Skeleton className="h-10 w-36" />
        </div>

        {/* Score Cards Skeleton */}
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader className="pb-3">
              <Skeleton className="h-5 w-40" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-12 w-24 mb-4" />
              <Skeleton className="h-2 w-full" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <Skeleton className="h-5 w-36" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-28" />
              <Skeleton className="h-4 w-full mt-3" />
            </CardContent>
          </Card>
        </div>

        {/* KPI Grid Skeleton */}
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {[...Array(6)].map((_, i) => (
            <Card key={i}>
              <CardContent className="pt-4 pb-4">
                <Skeleton className="h-8 w-8 rounded-lg mb-2" />
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-6 w-24 mt-1" />
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Summary Skeleton */}
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-64 mt-1" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full mt-2" />
            <Skeleton className="h-4 w-3/4 mt-2" />
          </CardContent>
        </Card>

        {/* Issues & Recommendations Skeleton */}
        <div className="grid md:grid-cols-2 gap-6">
          {[...Array(2)].map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-40" />
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                </div>
              </CardContent>
            </Card>
            
          ))}
        </div>
      </div>
    </div>
   
  );

}
