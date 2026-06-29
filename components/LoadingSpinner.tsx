"use client";

import React from "react";

interface LoadingSpinnerProps {
  message?: string;
}

export default function LoadingSpinner({
  message = "Loading...",
}: LoadingSpinnerProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] sm:min-h-[60vh] px-4 py-8 gap-4 sm:gap-5 text-center select-none">
      {/* Clean pure-tailwind CSS spinner fallback inside a relative container */}
      <div className="relative flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 sm:h-10 sm:w-10 border-2 border-[#e4e4e7] border-t-[#1e1e1e]" />
      </div>
      <p className="text-[#71717a] text-xs sm:text-sm font-black tracking-wide animate-pulse max-w-xs sm:max-w-sm truncate px-2">
        {message}
      </p>
    </div>
  );
}
