import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis,
  CartesianGrid, Tooltip, ReferenceLine, Legend
} from 'recharts';

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: '#1E293B', border: '1px solid #334155',
      borderRadius: 10, padding: '10px 14px', fontSize: 13,
    }}>
      <p style={{ color: '#94A3B8', marginBottom: 4 }}>{label}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color, fontWeight: 600 }}>
          {p.name}: {typeof p.value === 'number' ? p.value.toFixed(1) : p.value}%
        </p>
      ))}
    </div>
  );
};

export function AttendanceTrend({ data = [], target = 75, height = 280 }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 10, right: 16, left: -10, bottom: 0 }}>
        <defs>
          <linearGradient id="attendGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#2563EB" stopOpacity={0.25} />
            <stop offset="95%" stopColor="#2563EB" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="predGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#7C3AED" stopOpacity={0.2} />
            <stop offset="95%" stopColor="#7C3AED" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" vertical={false} />
        <XAxis dataKey="date" tick={{ fill: '#64748B', fontSize: 11 }} axisLine={false} tickLine={false} />
        <YAxis domain={[0, 100]} tick={{ fill: '#64748B', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `${v}%`} />
        <Tooltip content={<CustomTooltip />} />
        <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
        <ReferenceLine y={target} stroke="#F59E0B" strokeDasharray="5 3" label={{ value: `Target ${target}%`, fill: '#F59E0B', fontSize: 11 }} />
        <Area
          type="monotone" dataKey="attendance" name="Attendance"
          stroke="#2563EB" strokeWidth={2.5}
          fill="url(#attendGrad)" dot={false} activeDot={{ r: 5, fill: '#2563EB' }}
        />
        {data.some(d => d.predicted !== undefined) && (
          <Area
            type="monotone" dataKey="predicted" name="Predicted"
            stroke="#7C3AED" strokeWidth={2} strokeDasharray="5 3"
            fill="url(#predGrad)" dot={false} activeDot={{ r: 4, fill: '#7C3AED' }}
          />
        )}
      </AreaChart>
    </ResponsiveContainer>
  );
}
