export function VirgilMark({ size = 24, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M4 5 L12 20 L20 5"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function VirgilLogo({ height = 22, className }: { height?: number; className?: string }) {
  const width = (140 / 28) * height;
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 140 28"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label="Virgil"
    >
      <path
        d="M4 8 L12 23 L20 8"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <text
        x="27"
        y="21"
        fontFamily="var(--font-display), Quicksand, ui-sans-serif, system-ui, sans-serif"
        fontWeight="800"
        fontSize="19"
        letterSpacing="-0.4"
        fill="currentColor"
      >
        virgil
      </text>
    </svg>
  );
}
