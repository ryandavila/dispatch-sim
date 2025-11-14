import type { StatPool } from '../types/stats';
import { PILLARS } from '../types/stats';

export interface Point {
  x: number;
  y: number;
}

// Calculate vertex positions for a pentagon radar chart
export function calculatePentagonVertices(
  stats: StatPool,
  maxValue: number = 10,
  radius: number = 100
): Point[] {
  const angleStep = (2 * Math.PI) / 5;
  const startAngle = -Math.PI / 2; // Start at top

  return PILLARS.map((pillar, index) => {
    const angle = startAngle + angleStep * index;
    const distance = (stats[pillar] / maxValue) * radius;
    return {
      x: distance * Math.cos(angle),
      y: distance * Math.sin(angle),
    };
  });
}

// Calculate area of a polygon using the Shoelace formula
export function calculatePolygonArea(vertices: Point[]): number {
  let area = 0;
  const n = vertices.length;

  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    area += vertices[i].x * vertices[j].y;
    area -= vertices[j].x * vertices[i].y;
  }

  return Math.abs(area) / 2;
}

// Check if character stats fully encompass mission requirements
export function fullyEncompasses(characterStats: StatPool, missionRequirements: StatPool): boolean {
  return PILLARS.every((pillar) => characterStats[pillar] >= missionRequirements[pillar]);
}

// Combine multiple characters' stats (take max of each pillar)
export function combineStats(...statPools: StatPool[]): StatPool {
  if (statPools.length === 0) {
    return {
      Combat: 0,
      Vigor: 0,
      Mobility: 0,
      Charisma: 0,
      Intellect: 0,
    };
  }

  return {
    Combat: Math.max(...statPools.map((s) => s.Combat)),
    Vigor: Math.max(...statPools.map((s) => s.Vigor)),
    Mobility: Math.max(...statPools.map((s) => s.Mobility)),
    Charisma: Math.max(...statPools.map((s) => s.Charisma)),
    Intellect: Math.max(...statPools.map((s) => s.Intellect)),
  };
}

// Calculate the minimum value for each pillar between two stat pools
// (used for calculating intersection)
function getIntersectionStats(stats1: StatPool, stats2: StatPool): StatPool {
  return {
    Combat: Math.min(stats1.Combat, stats2.Combat),
    Vigor: Math.min(stats1.Vigor, stats2.Vigor),
    Mobility: Math.min(stats1.Mobility, stats2.Mobility),
    Charisma: Math.min(stats1.Charisma, stats2.Charisma),
    Intellect: Math.min(stats1.Intellect, stats2.Intellect),
  };
}

// Calculate success probability based on area overlap
export function calculateSuccessProbability(
  characterStats: StatPool,
  missionRequirements: StatPool,
  maxValue: number = 10
): number {
  // If character fully encompasses mission, 100% success
  if (fullyEncompasses(characterStats, missionRequirements)) {
    return 1.0;
  }

  // Calculate areas
  const missionVertices = calculatePentagonVertices(missionRequirements, maxValue);
  const missionArea = calculatePolygonArea(missionVertices);

  // If mission has no area requirements, 100% success
  if (missionArea === 0) {
    return 1.0;
  }

  // Calculate intersection (minimum of each pillar)
  const intersectionStats = getIntersectionStats(characterStats, missionRequirements);
  const intersectionVertices = calculatePentagonVertices(intersectionStats, maxValue);
  const intersectionArea = calculatePolygonArea(intersectionVertices);

  // Success probability = intersection area / mission area
  return Math.min(intersectionArea / missionArea, 1.0);
}
