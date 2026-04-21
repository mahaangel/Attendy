import { RadialBarChart, RadialBar, ResponsiveContainer, PolarAngleAxis } from 'recharts';

const getRiskColor = (pct, target) => {
  if (pct >= target) return '#10B981';
  if (pct >= target - 10) return '#F59E0B';
  return '#EF4444';
};

const getRiskLabel = (pct, target) => {
  if (pct >= target) return 'Safe';
  if (pct >= target - 10) return 'Warning';
  return 'Danger';
};

export function RiskGauge({ percentage = 0, target = 75, size = 200 }) {
  const color = getRiskColor(percentage, target);
  const label = getRiskLabel(percentage, target);
  const data = [{ value: Math.min(Math.max(percentage, 0), 100), fill: color }];

  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <ResponsiveContainer width="100%" height="100%">
        <RadialBarChart
          innerRadius="70%"
          outerRadius="100%"
          data={data}
          startAngle={225}
          endAngle={-45}
        >
          <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
          <RadialBar
            background={{ fill: '#1E293B' }}
            dataKey="value"
            cornerRadius={8}
            angleAxisId={0}
          />
        </RadialBarChart>
      </ResponsiveContainer>
      {/* Center text */}
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
      }}>
        <div style={{ fontSize: size * 0.18, fontWeight: 800, color, lineHeight: 1 }}>
          {percentage?.toFixed(1)}%
        </div>
        <div style={{
          fontSize: size * 0.09, fontWeight: 600,
          color: color, marginTop: 4,
          background: color + '20', borderRadius: 999,
          padding: '2px 8px',
        }}>
          {label}
        </div>
        <div style={{ fontSize: size * 0.075, color: '#64748B', marginTop: 4 }}>
          Target: {target}%
        </div>
      </div>
    </div>
  );
}
