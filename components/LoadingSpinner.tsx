import React from "react";

interface LoadingSpinnerProps {
  message?: string;
}

export default function LoadingSpinner({ message = "Loading..." }: LoadingSpinnerProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-5">
      <div className="loading-spinner" />
      <p className="text-[#71717a] text-sm font-semibold tracking-wide animate-pulse">
        {message}
      </p>
    </div>
  );
}
