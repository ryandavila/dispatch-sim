import { motion } from 'framer-motion';
import { useState } from 'react';
import type { PillarType, StatPool } from '../types/stats';
import { PILLARS } from '../types/stats';
import { StatIcon } from './statIcons';

interface RadarChartProps {
  stats: StatPool;
  maxValue?: number;
  size?: number;
  onVertexClick?: (pillar: PillarType) => void;
  /**
   * Optional preview layer drawn on top of `stats` (e.g. committed + pending
   * stat allocation). Rendered as a lighter amber outline extending past the
   * committed polygon.
   */
  previewStats?: StatPool;
}

export function RadarChart({
  stats,
  maxValue = 10,
  size = 300,
  onVertexClick,
  previewStats,
}: RadarChartProps) {
  const [hoveredPillar, setHoveredPillar] = useState<PillarType | null>(null);

  const center = size / 2;
  const radius = (size / 2) * 0.62; // Leave more padding for vertex glyph badges

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

  const previewPoints = previewStats
    ? PILLARS.map((pillar, index) => {
        const pos = getVertexPosition(index, previewStats[pillar]);
        return `${pos.x},${pos.y}`;
      }).join(' ')
    : null;

  // Create grid lines (concentric pentagons)
  const gridLevels = [0.2, 0.4, 0.6, 0.8, 1.0];

  const glyphRadius = 16;
  const glyphDistance = radius + 26;

  return (
    <div className="hs-radar-chart-container">
      <svg width={size} height={size} className="hs-radar-chart">
        {/* Near-black pentagon plate behind the grid */}
        <polygon
          points={PILLARS.map((_, index) => {
            const pos = getMaxVertexPosition(index);
            return `${pos.x},${pos.y}`;
          }).join(' ')}
          fill="#1d1e20"
        />

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
              stroke="rgba(221, 154, 43, 0.5)"
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
              stroke="rgba(221, 154, 43, 0.5)"
              strokeWidth="1"
            />
          );
        })}

        {/* Preview area (committed + pending), lighter amber outline */}
        {previewPoints && (
          <motion.polygon
            points={previewPoints}
            fill="rgba(242, 184, 67, 0.18)"
            stroke="rgba(242, 184, 67, 0.85)"
            strokeWidth="2"
            strokeDasharray="4 3"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.25 }}
          />
        )}

        {/* Stat area (filled polygon) */}
        <motion.polygon
          points={statPoints}
          fill="rgba(221, 154, 43, 0.75)"
          stroke="#f2b843"
          strokeWidth="2"
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
        />

        {/* Vertex points and glyph badges */}
        {PILLARS.map((pillar, index) => {
          const statPos = getVertexPosition(index, stats[pillar]);
          const isHovered = hoveredPillar === pillar;

          // Calculate glyph badge position (outside the chart)
          const angle = startAngle + angleStep * index;
          const glyphX = center + glyphDistance * Math.cos(angle);
          const glyphY = center + glyphDistance * Math.sin(angle);

          return (
            <g key={pillar}>
              {/* Vertex point */}
              <motion.circle
                cx={statPos.x}
                cy={statPos.y}
                r={isHovered ? 7 : 5}
                fill="#f2b843"
                stroke="#1d1e20"
                strokeWidth="1.5"
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

              {/* Vertex glyph badge: black circle + white stat icon */}
              <circle
                cx={glyphX}
                cy={glyphY}
                r={glyphRadius}
                fill="#1d1e20"
                stroke="#17181a"
                strokeWidth="1.5"
              />
              <foreignObject
                x={glyphX - glyphRadius * 0.55}
                y={glyphY - glyphRadius * 0.55}
                width={glyphRadius * 1.1}
                height={glyphRadius * 1.1}
              >
                <StatIcon pillar={pillar} size={glyphRadius * 1.1} color="#ece4d1" />
              </foreignObject>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
