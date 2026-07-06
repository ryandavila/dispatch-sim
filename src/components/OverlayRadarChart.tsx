import { motion } from 'framer-motion';
import { useState } from 'react';
import type { PillarType, StatPool } from '../types/stats';
import { PILLARS } from '../types/stats';
import { calculateSuccessProbability } from '../utils/geometry';
import { StatIcon } from './statIcons';

interface ChartLayer {
  stats: StatPool;
  color: string;
  label: string;
  fillOpacity?: number;
}

interface OverlayRadarChartProps {
  layers: ChartLayer[];
  maxValue?: number;
  size?: number;
  showSuccessProbability?: boolean;
}

export function OverlayRadarChart({
  layers,
  maxValue = 10,
  size = 300,
  showSuccessProbability = false,
}: OverlayRadarChartProps) {
  const [hoveredPillar, setHoveredPillar] = useState<PillarType | null>(null);

  const center = size / 2;
  const radius = (size / 2) * 0.62;

  const angleStep = (2 * Math.PI) / 5;
  const startAngle = -Math.PI / 2;

  const getVertexPosition = (index: number, value: number) => {
    const angle = startAngle + angleStep * index;
    const distance = (value / maxValue) * radius;
    return {
      x: center + distance * Math.cos(angle),
      y: center + distance * Math.sin(angle),
    };
  };

  const getMaxVertexPosition = (index: number) => {
    const angle = startAngle + angleStep * index;
    return {
      x: center + radius * Math.cos(angle),
      y: center + radius * Math.sin(angle),
    };
  };

  const gridLevels = [0.2, 0.4, 0.6, 0.8, 1.0];
  const glyphRadius = 15;
  const glyphDistance = radius + 24;

  // Calculate success probability if we have exactly 2 layers
  let successProbability: number | null = null;
  if (showSuccessProbability && layers.length === 2) {
    successProbability = calculateSuccessProbability(layers[0].stats, layers[1].stats, maxValue);
  }

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

        {/* Axis lines */}
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

        {/* Render each layer */}
        {layers.map((layer, layerIndex) => {
          const statPoints = PILLARS.map((pillar, index) => {
            const pos = getVertexPosition(index, layer.stats[pillar]);
            return `${pos.x},${pos.y}`;
          }).join(' ');

          return (
            <motion.polygon
              key={`layer-${layerIndex}`}
              points={statPoints}
              fill={layer.color}
              fillOpacity={layer.fillOpacity ?? 0.3}
              stroke={layer.color.replace(/0\.\d+\)$/, '1)')}
              strokeWidth="2"
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: layerIndex * 0.1 }}
            />
          );
        })}

        {/* Vertex glyph badges + hover hit-areas */}
        {PILLARS.map((pillar, index) => {
          const angle = startAngle + angleStep * index;
          const glyphX = center + glyphDistance * Math.cos(angle);
          const glyphY = center + glyphDistance * Math.sin(angle);
          const hitPos = getMaxVertexPosition(index);
          const isHovered = hoveredPillar === pillar;

          return (
            <g key={pillar}>
              {/* Hover hit-area: sits on the outer (max-value) vertex, the one
                  position that's stable across every layer's polygon. */}
              <motion.circle
                data-testid={`overlay-radar-hit-${pillar}`}
                cx={hitPos.x}
                cy={hitPos.y}
                r={isHovered ? 9 : 7}
                fill={isHovered ? 'rgba(244, 237, 220, 0.35)' : 'transparent'}
                stroke={isHovered ? 'rgba(244, 237, 220, 0.85)' : 'transparent'}
                strokeWidth="1.5"
                style={{ cursor: 'default' }}
                onMouseEnter={() => setHoveredPillar(pillar)}
                onMouseLeave={() => setHoveredPillar(null)}
              />

              {/* Readout: each layer's value for the hovered pillar, stacked
                  and color-matched to that layer's polygon/legend swatch. */}
              {isHovered && (
                <motion.g
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <rect
                    x={hitPos.x - 32}
                    y={hitPos.y - 20 - layers.length * 16}
                    width="64"
                    height={layers.length * 16 + 6}
                    fill="rgba(0, 0, 0, 0.8)"
                    rx="4"
                  />
                  {layers.map((layer, layerIndex) => (
                    <text
                      key={layer.label}
                      x={hitPos.x}
                      y={hitPos.y - 20 - (layers.length - layerIndex - 1) * 16 - 5}
                      textAnchor="middle"
                      fill={layer.color.replace(/0\.\d+\)$/, '1)')}
                      fontSize="11"
                      fontWeight="bold"
                    >
                      {layer.label.toUpperCase()} {layer.stats[pillar]}
                    </text>
                  ))}
                </motion.g>
              )}

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

      {/* Legend */}
      <div className="hs-chart-legend">
        {layers.map((layer, index) => (
          <div key={index} className="hs-legend-item">
            <div
              className="hs-legend-color"
              style={{ backgroundColor: layer.color.replace(/0\.\d+\)$/, '1)') }}
            />
            <span>{layer.label}</span>
          </div>
        ))}
      </div>

      {/* Success probability */}
      {successProbability !== null && (
        <div className="hs-success-probability">
          Success: {(successProbability * 100).toFixed(0)}%
        </div>
      )}
    </div>
  );
}
