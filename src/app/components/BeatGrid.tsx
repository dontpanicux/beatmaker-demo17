import { useState, useEffect, useRef, useCallback, memo } from 'react';

interface BeatGridProps {
  tracks: string[];
  steps: number;
  isPlaying: boolean;
  tempo: number;
  onCellToggle: (trackIndex: number, stepIndex: number) => void;
  pattern: boolean[][];
}

interface GridCellProps {
  trackIndex: number;
  stepIndex: number;
  isActive: boolean;
  isCurrentlyPlaying: boolean;
  onToggle: (trackIndex: number, stepIndex: number) => void;
}

const GridCell = memo(function GridCell({
  trackIndex,
  stepIndex,
  isActive,
  isCurrentlyPlaying,
  onToggle,
}: GridCellProps) {
  const handleClick = useCallback(() => {
    onToggle(trackIndex, stepIndex);
  }, [trackIndex, stepIndex, onToggle]);

  const bgColor = stepIndex % 2 === 0 ? 'bg-[#3f3f47]' : 'bg-[#18181b]';
  const finalBgColor = isActive ? 'bg-[#8200db]' : bgColor;

  return (
    <button
      onClick={handleClick}
      className={`${finalBgColor} relative rounded-[8px] shrink-0 size-[40px] transition-all cursor-pointer hover:opacity-80 ${
        isCurrentlyPlaying ? 'ring-2 ring-[#ad46ff]' : ''
      }`}
      data-name="Grid Item"
    >
      <div
        aria-hidden="true"
        className={`absolute border ${
          isActive ? 'border-[#ad46ff]' : 'border-[#4a5565]'
        } border-solid inset-0 pointer-events-none rounded-[8px]`}
      />
    </button>
  );
});

function BeatGridInner({ tracks, steps, isPlaying, tempo, onCellToggle, pattern }: BeatGridProps) {
  const [currentStep, setCurrentStep] = useState<number>(-1);

  useEffect(() => {
    if (!isPlaying) {
      setCurrentStep(-1);
      return;
    }

    const intervalMs = (60 / tempo) * 1000 / 4; // 16th note timing
    let timerId: ReturnType<typeof setTimeout>;

    const scheduleNext = (step: number) => {
      timerId = setTimeout(() => {
        setCurrentStep(step);
        scheduleNext((step + 1) % steps);
      }, intervalMs);
    };

    scheduleNext(0);
    return () => clearTimeout(timerId);
  }, [isPlaying, tempo, steps]);

  return (
    <div className="content-stretch flex flex-col gap-[12px] items-start relative shrink-0">
      {/* Column numbers */}
      <div className="content-stretch flex gap-[18px] items-center py-[8px] relative shrink-0 pl-[140px]">
        {Array.from({ length: steps }, (_, i) => (
          <div key={i} className="w-[40px] flex items-center justify-center">
            <p className="font-['Inter:Medium',sans-serif] font-medium leading-[normal] not-italic text-[#3f3f47] text-[14px]">
              {i + 1}
            </p>
          </div>
        ))}
      </div>

      {/* Grid rows */}
      {tracks.map((track, trackIndex) => (
        <div key={trackIndex} className="content-stretch flex gap-[18px] items-center py-[8px] relative shrink-0">
          <div className="w-[140px]">
            <p className="font-['Inter:Medium',sans-serif] font-medium leading-[normal] not-italic text-[#9f9fa9] text-[20px]">
              {track}
            </p>
          </div>
          <div className="content-stretch flex gap-[18px] items-center relative shrink-0">
            {Array.from({ length: steps }, (_, stepIndex) => (
              <GridCell
                key={stepIndex}
                trackIndex={trackIndex}
                stepIndex={stepIndex}
                isActive={pattern[trackIndex][stepIndex]}
                isCurrentlyPlaying={isPlaying && currentStep === stepIndex}
                onToggle={onCellToggle}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export const BeatGrid = memo(BeatGridInner);
