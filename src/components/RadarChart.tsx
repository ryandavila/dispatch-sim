import { motion } from 'framer-motion';
import { useState } from 'react';
import type { PillarType, StatPool } from '../types/stats';
import { PILLARS } from '../types/stats';

interface RadarChartProps {
  stats: StatPool;
  maxValue?: number;
  size?: number;
  onVertexClick?: (pillar: PillarType) => void;
}

export function RadarChart({ stats, maxValue = 10, size = 300, onVertexClick }: RadarChartProps) {
  const [hoveredPillar, setHoveredPillar] = useState<PillarType | null>(null);

  const center = size / 2;
  const radius = (size / 2) * 0.65; // Leave more padding for labels

  // Calculate angle for each pillar (starting from top, going clockwise)
  const angleStep = (2 * Math.PI) / 5;
  const startAngle = -Math.PI / 2; // Start at top

  // Calculate vertex positions
  const getVertexPosition = (index: number, value: number) => {
    const angle = startAngle + angleStep * index;
    const distance = (value / maxValue) * radius;
    return {
      x: center + distance * Math.cos(angle),
      y: center + distance * Math.sin(angle),
    };
  };

  // Get max circle positions (for background)
  const getMaxVertexPosition = (index: number) => {
    const angle = startAngle + angleStep * index;
    return {
      x: center + radius * Math.cos(angle),
      y: center + radius * Math.sin(angle),
    };
  };

  // Create polygon points for the stat area
  const statPoints = PILLARS.map((pillar, index) => {
    const pos = getVertexPosition(index, stats[pillar]);
    return `${pos.x},${pos.y}`;
  }).join(' ');

  // Create polygon points for background grid
  const _maxPoints = PILLARS.map((_, index) => {
    const pos = getMaxVertexPosition(index);
    return `${pos.x},${pos.y}`;
  }).join(' ');

  // Create grid lines (concentric pentagons)
  const gridLevels = [0.2, 0.4, 0.6, 0.8, 1.0];

  return (
    <div className="radar-chart-container">
      <svg width={size} height={size} className="radar-chart">
        {/* Background grid */}
        {gridLevels.map((level) => {
          const gridPoints = PILLARS.map((_, index) => {
            const angle = startAngle + angleStep * index;
            const distance = radius * level;
            const x = center + distance * Math.cos(angle);
            const y = center + distance * Math.sin(angle);
            return `${x},${y}`;
          }).join(' ');

          return (
            <polygon
              key={level}
              points={gridPoints}
              fill="none"
              stroke="rgba(138, 122, 94, 0.3)"
              strokeWidth="1"
            />
          );
        })}

        {/* Axis lines from center to each vertex */}
        {PILLARS.map((_, index) => {
          const pos = getMaxVertexPosition(index);
          return (
            <line
              key={`axis-${index}`}
              x1={center}
              y1={center}
              x2={pos.x}
              y2={pos.y}
              stroke="rgba(138, 122, 94, 0.3)"
              strokeWidth="1"
            />
          );
        })}

        {/* Stat area (filled polygon) */}
        <motion.polygon
          points={statPoints}
          fill="rgba(20, 184, 166, 0.3)"
          stroke="rgb(20, 184, 166)"
          strokeWidth="2"
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
        />

        {/* Vertex points and labels */}
        {PILLARS.map((pillar, index) => {
          const statPos = getVertexPosition(index, stats[pillar]);
          const _labelPos = getMaxVertexPosition(index);
          const isHovered = hoveredPillar === pillar;

          // Calculate label position (outside the chart)
          const angle = startAngle + angleStep * index;
          const labelDistance = radius + 40;
          const labelX = center + labelDistance * Math.cos(angle);
          const labelY = center + labelDistance * Math.sin(angle);

          return (
            <g key={pillar}>
              {/* Vertex point */}
              <motion.circle
                cx={statPos.x}
                cy={statPos.y}
                r={isHovered ? 8 : 6}
                fill="rgb(20, 184, 166)"
                stroke="rgb(15, 118, 110)"
                strokeWidth="2"
                style={{ cursor: onVertexClick ? 'pointer' : 'default' }}
                whileHover={{ scale: 1.2 }}
                onMouseEnter={() => setHoveredPillar(pillar)}
                onMouseLeave={() => setHoveredPillar(null)}
                onClick={() => onVertexClick?.(pillar)}
              />

              {/* Value tooltip on hover */}
              {isHovered && (
                <motion.g
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <rect
                    x={statPos.x - 15}
                    y={statPos.y - 30}
                    width="30"
                    height="20"
                    fill="rgba(0, 0, 0, 0.8)"
                    rx="4"
                  />
                  <text
                    x={statPos.x}
                    y={statPos.y - 16}
                    textAnchor="middle"
                    fill="white"
                    fontSize="12"
                    fontWeight="bold"
                  >
                    {stats[pillar]}
                  </text>
                </motion.g>
              )}

              {/* Pillar label */}
              <text
                x={labelX}
                y={labelY}
                textAnchor="middle"
                dominantBaseline="middle"
                fill="#2a2419"
                fontSize="12"
                fontWeight="700"
                style={{ textTransform: 'uppercase', letterSpacing: '0.5px' }}
              >
                {pillar}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
