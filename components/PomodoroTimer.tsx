"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Play, Pause, RotateCcw, CheckCircle2, Volume2 } from "lucide-react";

interface PomodoroTimerProps {
  onSessionComplete?: (minutesLogged: number) => void;
  defaultMinutes?: number;
}

export default function PomodoroTimer({
  onSessionComplete,
  defaultMinutes = 25,
}: PomodoroTimerProps) {
  const [mode, setMode] = useState<"focus" | "shortBreak" | "longBreak">(
    "focus",
  );
  const [timeLeft, setTimeLeft] = useState(defaultMinutes * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [completedSessions, setCompletedSessions] = useState(0);

  const getDuration = (m: "focus" | "shortBreak" | "longBreak") => {
    switch (m) {
      case "focus":
        return defaultMinutes * 60;
      case "shortBreak":
        return 5 * 60;
      case "longBreak":
        return 15 * 60;
    }
  };

  const playBeep = useCallback(() => {
    if (!soundEnabled) return;
    try {
      const AudioCtx =
        window.AudioContext ||
        (
          window as unknown as {
            webkitAudioContext: typeof AudioContext;
          }
        ).webkitAudioContext;
      const audioCtx = new AudioCtx();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(587.33, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(
        880,
        audioCtx.currentTime + 0.3,
      );
      gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.6);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.6);
    } catch {
      // Audio failed
    }
  }, [soundEnabled]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isRunning && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && isRunning) {
      queueMicrotask(() => {
        setIsRunning(false);
        playBeep();
        if (mode === "focus") {
          setCompletedSessions((prev) => prev + 1);
          if (onSessionComplete) {
            onSessionComplete(defaultMinutes);
          }
        }
      });
    }
    return () => clearInterval(timer);
  }, [isRunning, timeLeft, mode, defaultMinutes, onSessionComplete, playBeep]);

  const switchMode = (newMode: "focus" | "shortBreak" | "longBreak") => {
    setIsRunning(false);
    setMode(newMode);
    setTimeLeft(getDuration(newMode));
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const totalDuration = getDuration(mode);
  const progressPercent = ((totalDuration - timeLeft) / totalDuration) * 100;

  return (
    <div className="bg-white border border-[#e4e4e7] rounded-xl p-6 shadow-xs relative">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h4 className="text-base font-bold text-black tracking-tight">
            Focus Timer
          </h4>
          <p className="text-xs text-[#71717a]">
            Audio alerted study sessions
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            title={soundEnabled ? "Sound Enabled" : "Sound Muted"}
            className={`p-2 rounded-md border transition-all cursor-pointer ${
              soundEnabled
                ? "bg-[#f4f4f5] border-[#e4e4e7] text-black"
                : "bg-white border-[#e4e4e7] text-[#a1a1aa]"
            }`}
          >
            <Volume2 className="w-4 h-4" />
          </button>
          <div className="px-2.5 py-1 rounded-md bg-[#f4f4f5] border border-[#e4e4e7] text-xs font-semibold text-black flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-black" />
            <span>{completedSessions} done</span>
          </div>
        </div>
      </div>

      {/* Mode selectors */}
      <div className="grid grid-cols-3 gap-2 p-1.5 bg-[#f4f4f5] border border-[#e4e4e7] rounded-md mb-8">
        <button
          onClick={() => switchMode("focus")}
          className={`py-2 rounded text-xs font-semibold transition-all cursor-pointer ${
            mode === "focus"
              ? "bg-black text-white shadow-2xs"
              : "text-[#71717a] hover:text-black"
          }`}
        >
          Focus Session
        </button>
        <button
          onClick={() => switchMode("shortBreak")}
          className={`py-2 rounded text-xs font-semibold transition-all cursor-pointer ${
            mode === "shortBreak"
              ? "bg-black text-white shadow-2xs"
              : "text-[#71717a] hover:text-black"
          }`}
        >
          Short Break
        </button>
        <button
          onClick={() => switchMode("longBreak")}
          className={`py-2 rounded text-xs font-semibold transition-all cursor-pointer ${
            mode === "longBreak"
              ? "bg-black text-white shadow-2xs"
              : "text-[#71717a] hover:text-black"
          }`}
        >
          Long Break
        </button>
      </div>

      {/* Timer Display */}
      <div className="flex flex-col items-center justify-center my-6">
        <div className="relative w-48 h-48 flex items-center justify-center">
          <svg className="w-full h-full transform -rotate-90">
            <circle
              cx="96"
              cy="96"
              r="84"
              className="stroke-[#e4e4e7]"
              strokeWidth="8"
              fill="transparent"
            />
            <circle
              cx="96"
              cy="96"
              r="84"
              className="transition-all duration-1000 ease-linear stroke-black"
              strokeWidth="8"
              strokeDasharray={2 * Math.PI * 84}
              strokeDashoffset={2 * Math.PI * 84 * (1 - progressPercent / 100)}
              strokeLinecap="round"
              fill="transparent"
            />
          </svg>

          <div className="absolute flex flex-col items-center">
            <span className="text-4xl font-extrabold text-black tracking-wider font-mono">
              {formatTime(timeLeft)}
            </span>
            <span className="text-xs text-[#71717a] font-semibold mt-1">
              {mode === "focus" ? "Study Time" : "Break Time"}
            </span>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-3 mt-6">
        <button
          onClick={() => setIsRunning(!isRunning)}
          className={`w-32 py-3 rounded-md font-bold text-xs shadow-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
            isRunning
              ? "bg-[#27272a] text-white"
              : "bg-black hover:bg-[#27272a] text-white"
          }`}
        >
          {isRunning ? (
            <>
              <Pause className="w-4 h-4 fill-current" />
              <span>Pause</span>
            </>
          ) : (
            <>
              <Play className="w-4 h-4 fill-current" />
              <span>Start</span>
            </>
          )}
        </button>

        <button
          onClick={() => {
            setIsRunning(false);
            setTimeLeft(getDuration(mode));
          }}
          title="Reset Timer"
          className="p-3 rounded-md bg-[#f4f4f5] hover:bg-[#e4e4e7] text-black border border-[#e4e4e7] transition-all cursor-pointer"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
