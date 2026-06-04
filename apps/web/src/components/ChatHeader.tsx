export function ChatHeader() {
  return (
    <div className="bg-indigo-600 px-4 py-3 flex items-center gap-3 flex-shrink-0">
      <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
        <span className="text-white font-bold text-sm select-none">NW</span>
      </div>
      <div className="min-w-0">
        <p className="text-white font-semibold text-sm leading-tight">
          Northwind Goods
        </p>
        <div className="flex items-center gap-1.5 mt-0.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0" />
          <p className="text-indigo-200 text-xs leading-tight">
            Support · Nora is online
          </p>
        </div>
      </div>
    </div>
  );
}
