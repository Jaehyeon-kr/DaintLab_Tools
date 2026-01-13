"use client";

import { ComputationStep } from "@/types/model";
import { useState, useEffect } from "react";

interface ComputationAnimationProps {
  steps: ComputationStep[];
  isPlaying: boolean;
  onStepChange: (stepIndex: number) => void;
  onPlayToggle: () => void;
  speed: number;
  onSpeedChange: (speed: number) => void;
}

export default function ComputationAnimation({
  steps,
  isPlaying,
  onStepChange,
  onPlayToggle,
  speed,
  onSpeedChange,
}: ComputationAnimationProps) {
  const [currentStep, setCurrentStep] = useState(0);

  // 자동 재생 효과
  useEffect(() => {
    if (!isPlaying || steps.length === 0) return;

    const interval = setInterval(() => {
      setCurrentStep((prev) => (prev + 1) % steps.length);
    }, 1000 / speed);

    return () => clearInterval(interval);
  }, [isPlaying, steps.length, speed]);

  // currentStep이 변경될 때 부모에게 알림 (별도 effect로 분리)
  useEffect(() => {
    onStepChange(currentStep);
  }, [currentStep, onStepChange]);

  if (steps.length === 0) {
    return (
      <div className="p-3 text-center text-xs text-gray-400">
        Click "Run Inference" to see computation flow
      </div>
    );
  }

  const step = steps[currentStep];

  return (
    <div className="p-3 space-y-2">
      <div className="flex items-center gap-2">
        <button
          onClick={onPlayToggle}
          className="px-3 py-1 text-xs bg-blue-500 hover:bg-blue-600 text-white rounded"
        >
          {isPlaying ? "Pause" : "Play"}
        </button>

        <input
          type="range"
          min={0}
          max={steps.length - 1}
          value={currentStep}
          onChange={(e) => {
            const idx = parseInt(e.target.value);
            setCurrentStep(idx);
            onStepChange(idx);
          }}
          className="flex-1"
        />

        <select
          value={speed}
          onChange={(e) => onSpeedChange(Number(e.target.value))}
          className="text-xs border rounded px-1 py-0.5"
        >
          <option value={0.5}>0.5x</option>
          <option value={1}>1x</option>
          <option value={2}>2x</option>
        </select>
      </div>

      <div className="text-xs text-gray-600">
        Step {currentStep + 1}/{steps.length}: {step?.layer_name} ({step?.operation})
      </div>
    </div>
  );
}
