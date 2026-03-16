import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { Users } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";

export default function PppoePieChart({ active = 0, offline = 0, total = 0 }) {
  const { t } = useLanguage();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const activeNum = Number(active) || 0;
  const offlineNum = Number(offline) || 0;
  const totalNum = Number(total) || 0;
  const isEmpty = activeNum === 0 && offlineNum === 0;

  const data = isEmpty
    ? [{ name: t("common.noData") || "No Data", value: 1, color: "rgba(255,255,255,0.1)" }]
    : [
        {
          name: t("dashboard.pppoeActive") || "Online",
          value: activeNum,
          color: "#34d399",
        },
        {
          name: t("dashboard.pppoeOffline") || "Offline",
          value: offlineNum,
          color: "#f87171",
        },
      ];

  const handleClick = () => {
    router.push("/users");
  };

  if (!mounted) {
    return (
      <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-6 border border-white/20 shadow-2xl h-full flex flex-col justify-center items-center">
        <div className="animate-pulse flex flex-col items-center">
           <div className="h-40 w-40 rounded-full border-4 border-white/10"></div>
           <div className="mt-4 h-4 w-24 bg-white/10 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={handleClick}
      className="bg-white/10 backdrop-blur-xl rounded-2xl p-6 border border-white/20 shadow-2xl hover:bg-white/20 transition-all cursor-pointer h-full flex flex-col relative group overflow-hidden"
    >
      <div className="absolute inset-0 bg-white/5 group-hover:bg-white/10 transition-colors duration-300 pointer-events-none" />

      <div className="flex items-center justify-between mb-4 relative z-10 w-full">
        <h3 className="text-white/50 text-sm font-semibold uppercase">
          {t("dashboard.customerStatus") || "Customers / Routers"}
        </h3>
        <div className="p-2 bg-white/10 border border-white/10 rounded-lg text-blue-300 group-hover:scale-110 transition-transform">
          <Users size={20} />
        </div>
      </div>

      <div className="flex-1 w-full relative min-h-[200px] flex justify-center items-center z-10 my-2">
        <div className="w-full h-full absolute inset-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius="65%"
                outerRadius="90%"
                paddingAngle={isEmpty ? 0 : 5}
                dataKey="value"
                stroke="none"
                isAnimationActive={false}
              >
                {data.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.color}
                    className="transition-all duration-300 hover:opacity-80 drop-shadow-sm"
                  />
                ))}
              </Pie>
                {!isEmpty && (
                <Tooltip
                  cursor={{ fill: "transparent" }}
                  contentStyle={{
                    borderRadius: "12px",
                    border: "1px solid rgba(255,255,255,0.2)",
                    boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.5)",
                    backgroundColor: "rgba(0, 0, 0, 0.8)",
                    backdropFilter: "blur(8px)",
                    padding: "10px 14px",
                    color: "#ffffff",
                  }}
                  itemStyle={{ color: "#ffffff" }}
                />
              )}
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Center text for Total */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-20">
          <span className="text-4xl font-bold text-white leading-none mb-1 drop-shadow-md">
            {activeNum + offlineNum > 0 ? activeNum + offlineNum : totalNum}
          </span>
          <span className="text-xs text-white/50 uppercase font-bold tracking-wider">
            {t("dashboard.total") || "Total"}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mt-4 relative z-10 w-full">
        <div className="flex flex-col items-center p-3 rounded-xl bg-white/5 border border-white/5 transition-colors">
          <div className="flex items-center gap-1.5 text-green-300 text-xs font-semibold uppercase mb-1">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse shadow-[0_0_8px_rgba(74,222,128,0.5)]"></span>
            {t("dashboard.pppoeActive") || "Online"}
          </div>
          <span className="text-xl font-bold text-white">
            {activeNum}
          </span>
        </div>
        <div className="flex flex-col items-center p-3 rounded-xl bg-white/5 border border-white/5 transition-colors">
          <div className="flex items-center gap-1.5 text-red-300 text-xs font-semibold uppercase mb-1">
            <span className="w-2 h-2 rounded-full bg-red-400 shadow-[0_0_8px_rgba(248,113,113,0.5)]"></span>
            {t("dashboard.pppoeOffline") || "Offline"}
          </div>
          <span className="text-xl font-bold text-white">
            {offlineNum}
          </span>
        </div>
      </div>
    </div>
  );
}
