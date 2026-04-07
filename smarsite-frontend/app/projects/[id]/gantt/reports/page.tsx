'use client';

import { useEffect, useState } from 'react';

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

export default function ReportsPage({ params }: any) {
  const { id } = params; // ✅ FIXED

  const [data, setData] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchReport = async () => {
    try {
      setLoading(true);
      setError('');

      const res = await fetch(
        `http://localhost:3000/reports/project/${id}/ai`
      );

      if (!res.ok) {
        throw new Error('Failed to fetch report');
      }

      const json = await res.json();
      setData(json);
    } catch (err: any) {
      console.error(err);
      setError('Failed to load report');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) fetchReport();
  }, [id]); // ✅ FIXED dependency

  if (loading) return <div className="p-6">Loading report...</div>;

  if (error) return <div className="p-6 text-red-500">{error}</div>;

  if (!data) return <div className="p-6">No data available</div>;

  return (
    <div className="p-6 space-y-6">

      {/* HEADER */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Financial Report</h1>
        <button
          onClick={fetchReport}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Re-analyze
        </button>
      </div>

      {/* SCORE */}
      <ScoreCard score={data.score} risk={data.risk} />

      {/* SUMMARY */}
      <SummaryCards data={data} />

      {/* AI */}
      <AIInsights ai={data.ai} />

    </div>
  );
}

//
// 🔥 COMPONENTS
//

function ScoreCard({ score, risk }: any) {
  const color =
    risk === 'LOW'
      ? 'bg-green-500'
      : risk === 'MEDIUM'
      ? 'bg-yellow-500'
      : 'bg-red-500';

  return (
    <div className="p-6 rounded-2xl shadow bg-white flex justify-between items-center">
      <div>
        <p className="text-gray-500">Score</p>
        <h2 className="text-4xl font-bold">{score}/100</h2>
      </div>

      <span className={`px-4 py-2 text-white rounded-lg ${color}`}>
        {risk}
      </span>
    </div>
  );
}

function SummaryCards({ data }: any) {
  const items = [
    { label: 'Total Invoiced', value: data.totalInvoiced },
    { label: 'Total Paid', value: data.totalPaid },
    { label: 'Pending', value: data.totalPending },
    { label: 'Overdue', value: data.overdueAmount },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {items.map((item, i) => (
        <div key={i} className="p-4 bg-white rounded-xl shadow">
          <p className="text-gray-500">{item.label}</p>
          <h3 className="text-xl font-semibold">{item.value}</h3>
        </div>
      ))}
    </div>
  );
}

function AIInsights({ ai }: any) {
  return (
    <div className="p-6 bg-white rounded-2xl shadow space-y-4">
      <h2 className="text-xl font-bold">AI Insights</h2>

      <p className="text-gray-700">{ai.summary}</p>

      {/* Issues */}
      <div>
        <h3 className="font-semibold text-red-600">Issues</h3>
        <ul className="list-disc ml-5">
          {ai.issues.map((issue: string, i: number) => (
            <li key={i}>{issue}</li>
          ))}
        </ul>
      </div>

      {/* Recommendations */}
      <div>
        <h3 className="font-semibold text-green-600">
          Recommendations
        </h3>
        <ul className="list-disc ml-5">
          {ai.recommendations.map((rec: string, i: number) => (
            <li key={i}>{rec}</li>
          ))}
        </ul>

        <p className="text-sm text-gray-400 mt-2">
          Confidence: {ai.confidence}
        </p>
      </div>
    </div>
  );
}