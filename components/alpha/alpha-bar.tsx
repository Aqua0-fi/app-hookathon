// Thin disclaimer bar above the nav — reminds users this is an alpha.

export function AlphaBar() {
  return (
    <div className="relative z-10 flex items-center justify-center gap-3 border-b border-white/10 bg-white/[0.015] px-4 py-2 text-[11px] uppercase tracking-[0.08em] text-white/60">
      <span
        className="inline-block h-1.5 w-1.5 rounded-full bg-[#7FE5E5] shadow-[0_0_8px_#7FE5E5]"
        style={{ animation: "a0-pulse-dot 2.5s infinite ease-out" }}
      />
      <span>Aqua0 alpha on testnets — data is for demonstration.</span>
      <a
        href="https://docs.aqua0.xyz/docs"
        target="_blank"
        rel="noopener noreferrer"
        className="border-b border-dotted border-white/40 text-white transition-colors hover:border-[#7FE5E5] hover:text-[#7FE5E5]"
      >
        Read how it works →
      </a>
      <style jsx>{`
        @keyframes a0-pulse-dot {
          0% {
            box-shadow: 0 0 8px #7fe5e5;
          }
          50% {
            box-shadow: 0 0 16px #7fe5e5, 0 0 4px #7fe5e5;
          }
          100% {
            box-shadow: 0 0 8px #7fe5e5;
          }
        }
      `}</style>
    </div>
  )
}
