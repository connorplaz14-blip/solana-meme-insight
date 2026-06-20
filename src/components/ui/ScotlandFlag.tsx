export function ScotlandFlag({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Scotland flag"
    >
      <rect width="32" height="32" rx="3" fill="#005EB8" />
      <path
        d="M0 0L32 32M32 0L0 32"
        stroke="white"
        strokeWidth="6"
      />
      <path
        d="M0 0L32 32M32 0L0 32"
        stroke="white"
        strokeWidth="2"
      />
      <rect width="32" height="32" rx="3" fill="none" stroke="white/20" strokeWidth="1" />
    </svg>
  );
}
