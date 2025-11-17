import type { ActiveMission } from '../types/activeMission';
import { calculateMissionProgress } from '../types/activeMission';

interface ActiveMissionTimelineProps {
  activeMission: ActiveMission;
  currentTime: number;
}

export function ActiveMissionTimeline({ activeMission, currentTime }: ActiveMissionTimelineProps) {
  const progress = calculateMissionProgress(activeMission, currentTime);
  const {
    totalDuration,
    travelOutboundDuration,
    missionDuration,
    travelReturnDuration,
    restDuration,
  } = activeMission;

  // Calculate percentages for each segment
  const travelOutboundPercent = (travelOutboundDuration / totalDuration) * 100;
  const missionDurationPercent = (missionDuration / totalDuration) * 100;
  const travelReturnPercent = (travelReturnDuration / totalDuration) * 100;
  const restTimePercent = (restDuration / totalDuration) * 100;

  // Calculate fill percentage based on current progress
  const getFillPercentage = (segmentStart: number, segmentEnd: number): number => {
    const elapsed = progress.elapsedSeconds;
    if (elapsed <= segmentStart) return 0;
    if (elapsed >= segmentEnd) return 100;
    return ((elapsed - segmentStart) / (segmentEnd - segmentStart)) * 100;
  };

  const travelOutboundEnd = travelOutboundDuration / 1000;
  const missionEnd = (travelOutboundDuration + missionDuration) / 1000;
  const travelReturnEnd = (travelOutboundDuration + missionDuration + travelReturnDuration) / 1000;
  const restEnd = totalDuration / 1000;

  return (
    <div className="mission-timeline">
      <div className="timeline-bar">
        <div
          className="timeline-segment travel-outbound"
          style={{ width: `${travelOutboundPercent}%` }}
        >
          <div
            className="timeline-segment-fill"
            style={{ width: `${getFillPercentage(0, travelOutboundEnd)}%` }}
          />
          <span className="segment-label">Travel</span>
        </div>
        <div
          className="timeline-segment mission-active"
          style={{ width: `${missionDurationPercent}%` }}
        >
          <div
            className="timeline-segment-fill"
            style={{
              width: `${getFillPercentage(travelOutboundEnd, missionEnd)}%`,
            }}
          />
          <span className="segment-label">Mission</span>
        </div>
        <div
          className="timeline-segment travel-return"
          style={{ width: `${travelReturnPercent}%` }}
        >
          <div
            className="timeline-segment-fill"
            style={{
              width: `${getFillPercentage(missionEnd, travelReturnEnd)}%`,
            }}
          />
          <span className="segment-label">Return</span>
        </div>
        <div className="timeline-segment rest" style={{ width: `${restTimePercent}%` }}>
          <div
            className="timeline-segment-fill"
            style={{
              width: `${getFillPercentage(travelReturnEnd, restEnd)}%`,
            }}
          />
          <span className="segment-label">Rest</span>
        </div>
      </div>
    </div>
  );
}
