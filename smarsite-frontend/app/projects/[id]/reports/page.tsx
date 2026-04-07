'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { getProjectAIReport } from '@/lib/api';

export default function ReportsPage() {
  const params = useParams();
  const id = params?.id as string;

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchReport = async () => {
    try {
      setLoading(true);
      const res = await getProjectAIReport(id);
      console.log("Report data:", res);
      setData(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!id) return;
    fetchReport();
  }, [id]);

  if (loading && !data) {
    return <div className="p-6">Loading report...</div>;
  }

  return (
    <div className="p-6">
      <pre>{JSON.stringify(data, null, 2)}</pre>
    </div>
  );
}