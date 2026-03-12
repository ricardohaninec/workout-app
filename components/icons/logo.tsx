export default function Logo() {
  return (
    <svg
      width="28"
      height="28"
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect width="32" height="32" rx="7" fill="#111" />
      {/* Left weight plate */}
      <rect x="3" y="10" width="6" height="12" rx="2" fill="white" />
      {/* Left collar */}
      <rect x="9" y="13" width="3" height="6" rx="1" fill="white" />
      {/* Handle / bar */}
      <rect x="12" y="14.5" width="8" height="3" rx="1" fill="white" />
      {/* Right collar */}
      <rect x="20" y="13" width="3" height="6" rx="1" fill="white" />
      {/* Right weight plate */}
      <rect x="23" y="10" width="6" height="12" rx="2" fill="white" />
    </svg>
  );
}
