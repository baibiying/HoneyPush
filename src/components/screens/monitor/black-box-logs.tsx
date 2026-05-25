"use client";

interface BlackBoxLogsProps {
  entries: { time: string; text: string; type: "normal" | "warning" | "success" }[];
}

export function BlackBoxLogs({ entries }: BlackBoxLogsProps) {
  return (
    <div className="bg-white p-5 comic-border comic-shadow-sm comic-panel-halftone">
      <div className="flex items-center gap-2 pb-2 mb-3 border-b-2 border-[#1C1917]">
        <div className="w-2.5 h-2.5 rounded-full bg-[#1C1917]"></div>
        <h4 className="font-bold text-sm tracking-wider font-bangers">BLACK BOX LOGS</h4>
      </div>
      <div className="space-y-2 text-xs font-mono max-h-[180px] overflow-y-auto">
        {entries.map((e, i) => (
          <div
            key={i}
            className={
              e.type === "warning"
                ? "text-rose-600 font-bold"
                : e.type === "success"
                ? "text-emerald-600"
                : "text-gray-500"
            }
          >
            [{e.time}] {e.text}
          </div>
        ))}
      </div>
    </div>
  );
}
