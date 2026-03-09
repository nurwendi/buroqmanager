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
    ? [{ name: t("common.noData") || "No Data", value: 1, color: "#e5e7eb" }]
    : [
        {
          name: t("dashboard.pppoeActive") || "Online",
          value: activeNum,
          color: "#10b981",
        },
        {
          name: t("dashboard.pppoeOffline") || "Offline",
          value: offlineNum,
          color: "#ef4444",
        },
      ];

  const handleClick = () => {
    router.push("/users");
  };

  if (!mounted) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700 shadow-sm h-full flex flex-col justify-center items-center">
        <div className="animate-pulse flex flex-col items-center">
           <div className="h-40 w-40 rounded-full border-4 border-gray-100 dark:border-gray-700"></div>
           <div className="mt-4 h-4 w-24 bg-gray-100 dark:bg-gray-700 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={handleClick}
      className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md transition-all cursor-pointer h-full flex flex-col relative group overflow-hidden"
    >
      <div className="absolute inset-0 bg-blue-50/0 group-hover:bg-blue-50/50 dark:group-hover:bg-blue-900/10 transition-colors duration-300 pointer-events-none" />

      <div className="flex items-center justify-between mb-4 relative z-10 w-full">
        <h3 className="text-gray-500 dark:text-gray-400 text-sm font-semibold uppercase">
          {t("dashboard.customerStatus") || "Customers / NAT"}
        </h3>
        <div className="p-2 bg-blue-50 dark:bg-blue-900/30 rounded-lg text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform">
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
                    boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
                    backgroundColor: "rgba(255, 255, 255, 0.95)",
                    padding: "10px 14px",
                    color: "#1f2937",
                  }}
                />
              )}
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Center text for Total */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-20">
          <span className="text-4xl font-bold text-gray-800 dark:text-white leading-none mb-1">
            {activeNum + offlineNum > 0 ? activeNum + offlineNum : totalNum}
          </span>
          <span className="text-xs text-gray-500 uppercase font-bold tracking-wider">
            {t("dashboard.total") || "Total"}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mt-4 relative z-10 w-full">
        <div className="flex flex-col items-center p-3 rounded-xl bg-green-50/50 dark:bg-green-900/10 transition-colors">
          <div className="flex items-center gap-1.5 text-green-600 dark:text-green-400 text-xs font-semibold uppercase mb-1">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
            {t("dashboard.pppoeActive") || "Online"}
          </div>
          <span className="text-xl font-bold text-gray-800 dark:text-white">
            {activeNum}
          </span>
        </div>
        <div className="flex flex-col items-center p-3 rounded-xl bg-red-50/50 dark:bg-red-900/10 transition-colors">
          <div className="flex items-center gap-1.5 text-red-600 dark:text-red-400 text-xs font-semibold uppercase mb-1">
            <span className="w-2 h-2 rounded-full bg-red-500"></span>
            {t("dashboard.pppoeOffline") || "Offline"}
          </div>
          <span className="text-xl font-bold text-gray-800 dark:text-white">
            {offlineNum}
          </span>
        </div>
      </div>
    </div>
  );
}
