import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { formatCurrency } from '@/lib/pdf/utils/format';

export const WealthTrajectoryChart = ({ data }: { data: { year: number; nominal: number; real: number }[] }) => (
  <ResponsiveContainer width="100%" height={240}>
    <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
      <CartesianGrid strokeDasharray="3 3" />
      <XAxis dataKey="year" tickFormatter={(v) => v.toString()} />
      <YAxis tickFormatter={(v) => formatCurrency(v, { compact: true })} />
      <Tooltip formatter={(v: number) => formatCurrency(v)} />
      <Line type="monotone" dataKey="nominal" stroke="#d4a017" name="Nominal" />
      <Line type="monotone" dataKey="real" stroke="#1a5fb4" name="Real (2025 $)" />
    </LineChart>
  </ResponsiveContainer>
);
