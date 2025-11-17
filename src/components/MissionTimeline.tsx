interface MissionTimelineProps {
  travelOutbound: number;
  missionDuration: number;
  travelReturn: number;
  restTime: number;
  totalTime: number;
}

export function MissionTimeline({
  travelOutbound,
  missionDuration,
  travelReturn,
  restTime,
  totalTime,
}: MissionTimelineProps) {
  // Calculate percentages for each segment
  const travelOutboundPercent = (travelOutbound / totalTime) * 100;
  const missionDurationPercent = (missionDuration / totalTime) * 100;
  const travelReturnPercent = (travelReturn / totalTime) * 100;
  const restTimePercent = (restTime / totalTime) * 100;

  return (
    <div className="mission-timeline">
      <div className="timeline-bar">
        <div
          className="timeline-segment travel-outbound"
          style={{ width: `${travelOutboundPercent}%` }}
          title={`Travel (Outbound): ${travelOutbound}`}
        >
          <span className="segment-label">Travel</span>
        </div>
        <div
          className="timeline-segment mission-active"
          style={{ width: `${missionDurationPercent}%` }}
          title={`Mission Duration: ${missionDuration}`}
        >
          <span className="segment-label">Mission</span>
        </div>
        <div
          className="timeline-segment travel-return"
          style={{ width: `${travelReturnPercent}%` }}
          title={`Travel (Return): ${travelReturn}`}
        >
          <span className="segment-label">Return</span>
        </div>
        <div
          className="timeline-segment rest"
          style={{ width: `${restTimePercent}%` }}
          title={`Rest Time: ${restTime}`}
        >
          <span className="segment-label">Rest</span>
        </div>
      </div>
    </div>
  );
}
