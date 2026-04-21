import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer
} from 'recharts';

const COLORS = ['#2563EB', '#7C3AED', '#10B981', '#F59E0B', '#EF4444', '#EC4899', '#06B6D4'];

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0];
  return (
    <div style={{
      background: '#1E293B', border: '1px solid #334155',
      borderRadius: 10, padding: '10px 14px', fontSize: 13,
    }}>
      <p style={{ color: '#F1F5F9', fontWeight: 600 }}>{d.name}</p>
      <p style={{ color: d.payload.fill, fontWeight: 700 }}>{d.value?.toFixed(1)}%</p>
    </div>
  );
};

export function SubjectPie({ subjects = [], height = 280 }) {
  const data = subjects.map((s, i) => ({
    name: s.name,
    value: s.attendance_percentage || 0,
    fill: COLORS[i % COLORS.length],
  }));

  if (!data.length) {
    return (
      <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748B' }}>
        No subjects yet
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie
          data={data}
          cx="50%" cy="50%"
          innerRadius="55%" outerRadius="80%"
          paddingAngle={3}
          dataKey="value"
        >
          {data.map((entry, idx) => (
            <Cell key={idx} fill={entry.fill} stroke="transparent" />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltip />} />
        <Legend
          iconType="circle"
          iconSize={9}
          wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
          formatter={(value) => <span style={{ color: '#94A3B8' }}>{value}</span>}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
