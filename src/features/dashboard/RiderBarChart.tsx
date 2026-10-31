import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

export interface RiderBarDatum {
  riderId: string
  name: string
  value: number
}

interface RiderBarChartProps {
  data: RiderBarDatum[]
  selectedId?: string
  onSelect: (riderId: string) => void
  formatValue: (value: number) => string
  allowDecimals?: boolean
}

const ROW_HEIGHT = 28

/**
 * Barres horizontales en mode « emphase » : le coureur sélectionné porte la couleur
 * d'accent, les autres restent en gris. Un clic sur une barre sélectionne le coureur
 * dans tous les graphiques de la page.
 */
export function RiderBarChart({
  data,
  selectedId,
  onSelect,
  formatValue,
  allowDecimals = true,
}: RiderBarChartProps) {
  return (
    <ResponsiveContainer width="100%" height={data.length * ROW_HEIGHT + 40}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 16, bottom: 4, left: 4 }}>
        <CartesianGrid horizontal={false} stroke="var(--chart-grid)" />
        <XAxis
          type="number"
          allowDecimals={allowDecimals}
          tickFormatter={formatValue}
          stroke="var(--chart-axis)"
          tick={{ fill: 'var(--muted)', fontSize: 12 }}
        />
        <YAxis
          type="category"
          dataKey="name"
          width={170}
          interval={0}
          stroke="var(--chart-axis)"
          tick={{ fill: 'var(--muted)', fontSize: 12 }}
        />
        <Tooltip
          cursor={{ fill: 'var(--row-hover)' }}
          formatter={(value) => [formatValue(Number(value)), '']}
          separator=""
          contentStyle={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 6,
            color: 'var(--text)',
          }}
          labelStyle={{ color: 'var(--text)', fontWeight: 600 }}
        />
        <Bar
          dataKey="value"
          radius={[0, 4, 4, 0]}
          maxBarSize={18}
          cursor="pointer"
          onClick={(_, index) => {
            const datum = data[index]
            if (datum) onSelect(datum.riderId)
          }}
        >
          {data.map((d) => (
            <Cell
              key={d.riderId}
              fill={d.riderId === selectedId ? 'var(--series-1)' : 'var(--chart-deemph)'}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
