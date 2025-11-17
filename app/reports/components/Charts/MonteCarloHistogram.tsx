import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export const MonteCarloHistogram = ({ bins }: { bins: { range: string; count: number }[] }) => (
  <ResponsiveContainer width="100%" height={200}>
    <BarChart data={bins} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
      <CartesianGrid strokeDasharray="3 3" />
      <XAxis dataKey="range" />
      <YAxis />
      <Tooltip />
      <Bar dataKey="count" fill="#1a5fb4" />
    </BarChart>
  </ResponsiveContainer>
);
