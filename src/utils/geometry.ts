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

const EPSILON = 1e-9;

// Intersection point of the (infinite) lines through p1->p2 and p3->p4.
// Returns null when the lines are parallel or collinear.
function lineIntersection(p1: Point, p2: Point, p3: Point, p4: Point): Point | null {
  const d1x = p2.x - p1.x;
  const d1y = p2.y - p1.y;
  const d2x = p4.x - p3.x;
  const d2y = p4.y - p3.y;
  const denominator = d1x * d2y - d1y * d2x;

  if (Math.abs(denominator) < EPSILON) {
    return null;
  }

  const t = ((p3.x - p1.x) * d2y - (p3.y - p1.y) * d2x) / denominator;
  return { x: p1.x + t * d1x, y: p1.y + t * d1y };
}

/**
 * Exact area of the intersection of two radar pentagons.
 *
 * Both polygons are star-shaped around the origin with vertices on the same
 * five axes, so within each angular sector between adjacent axes every
 * boundary is a single edge. Per sector, the intersection is bounded by
 * whichever edge is radially inner at each axis, plus (when the inner polygon
 * differs between the two axes) the single point where the edges cross.
 */
export function calculatePentagonIntersectionArea(
  statsA: StatPool,
  statsB: StatPool,
  maxValue: number = 10,
  radius: number = 100
): number {
  const verticesA = calculatePentagonVertices(statsA, maxValue, radius);
  const verticesB = calculatePentagonVertices(statsB, maxValue, radius);
  const origin: Point = { x: 0, y: 0 };
  const count = PILLARS.length;
  let totalArea = 0;

  for (let i = 0; i < count; i++) {
    const j = (i + 1) % count;

    // A polygon with a vertex at the origin has no interior in the sectors
    // adjacent to that axis, so the intersection there is empty.
    const startMin = Math.min(statsA[PILLARS[i]], statsB[PILLARS[i]]);
    const endMin = Math.min(statsA[PILLARS[j]], statsB[PILLARS[j]]);
    if (startMin <= 0 || endMin <= 0) {
      continue;
    }

    const aInnerAtStart = statsA[PILLARS[i]] <= statsB[PILLARS[i]];
    const aInnerAtEnd = statsA[PILLARS[j]] <= statsB[PILLARS[j]];
    const startVertex = aInnerAtStart ? verticesA[i] : verticesB[i];
    const endVertex = aInnerAtEnd ? verticesA[j] : verticesB[j];

    const sectorBoundary: Point[] = [origin, startVertex];
    if (aInnerAtStart !== aInnerAtEnd) {
      // The inner polygon switches within this sector, so the two edges cross
      // exactly once between the axes. Collinear edges fall back to the
      // triangle of inner vertices, which spans the same region.
      const crossing = lineIntersection(verticesA[i], verticesA[j], verticesB[i], verticesB[j]);
      if (crossing !== null) {
        sectorBoundary.push(crossing);
      }
    }
    sectorBoundary.push(endVertex);

    totalArea += calculatePolygonArea(sectorBoundary);
  }

  return totalArea;
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

  // Exact polygon intersection between the character and mission pentagons
  const intersectionArea = calculatePentagonIntersectionArea(
    characterStats,
    missionRequirements,
    maxValue
  );

  // Success probability = intersection area / mission area
  return Math.min(intersectionArea / missionArea, 1.0);
}
