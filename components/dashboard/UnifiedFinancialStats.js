"use client";

import { useLanguage } from "@/contexts/LanguageContext";
import { DollarSign, Wallet, Percent } from "lucide-react";

export default function UnifiedFinancialStats({
  gross = 0,
  commission = 0,
  net = 0,
}) {
  const { t } = useLanguage();

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
    }).format(amount);
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700 shadow-sm h-full flex flex-col justify-center transition-all duration-300">
      <div className="relative z-10">
        {/* Main Highlight: Net Revenue */}
        <div className="flex flex-col items-center justify-center text-center w-full mb-6">
          <div className="inline-flex items-center justify-center p-4 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl mb-3 text-indigo-600 dark:text-indigo-400">
            <Wallet size={28} />
          </div>
          <p className="text-gray-600 dark:text-gray-400 text-sm font-semibold mb-2 tracking-wide uppercase">
            {t("dashboard.netRevenue") || "Net Revenue"}
          </p>
          <h3 className="text-4xl md:text-5xl font-extrabold tracking-tight text-gray-900 dark:text-white">
            {formatCurrency(net)}
          </h3>
        </div>

        {/* Divider */}
        <div className="w-full h-px bg-gray-100 dark:bg-gray-700 mb-6"></div>

        {/* Secondary Stats Group: Gross and Commission */}
        <div className="grid grid-cols-2 gap-4">
          {/* Gross */}
          <div className="flex flex-col items-center justify-center p-4 rounded-xl bg-gray-50 dark:bg-gray-900/40 border border-gray-100 dark:border-gray-700">
            <div className="flex items-center gap-2 mb-2 text-indigo-500 dark:text-indigo-400">
              <DollarSign size={16} />
              <p className="font-semibold text-xs md:text-sm uppercase tracking-wider text-gray-600 dark:text-gray-400">
                {t("dashboard.totalGross") || "Total Gross"}
              </p>
            </div>
            <h4 className="text-lg md:text-xl font-bold text-gray-900 dark:text-white">
              {formatCurrency(gross)}
            </h4>
          </div>

          {/* Commission */}
          <div className="flex flex-col items-center justify-center p-4 rounded-xl bg-gray-50 dark:bg-gray-900/40 border border-gray-100 dark:border-gray-700">
            <div className="flex items-center gap-2 mb-2 text-orange-500 dark:text-orange-400">
              <Percent size={16} />
              <p className="font-semibold text-xs md:text-sm uppercase tracking-wider text-gray-600 dark:text-gray-400">
                {t("dashboard.komisiStaff") || "Staff Commission"}
              </p>
            </div>
            <h4 className="text-lg md:text-xl font-bold text-gray-900 dark:text-white">
              {formatCurrency(commission)}
            </h4>
          </div>
        </div>
      </div>
    </div>
  );
}
