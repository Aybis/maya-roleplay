export function MayaMark({ size = 24, className }: { size?: number; className?: string }) {
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
        d="M3 21 L3 6 L8 12 L12 6 L16 12 L21 6 L21 21"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function MayaLogo({ height = 22, className }: { height?: number; className?: string }) {
  const width = (132 / 28) * height;
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 132 28"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label="Maya"
    >
      <path
        d="M3 24 L3 9 L8 15 L12 9 L16 15 L21 9 L21 24"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <text
        x="31"
        y="21"
        fontFamily="var(--font-display), Quicksand, ui-sans-serif, system-ui, sans-serif"
        fontWeight="800"
        fontSize="19"
        letterSpacing="-0.4"
        fill="currentColor"
      >
        maya
      </text>
    </svg>
  );
}
