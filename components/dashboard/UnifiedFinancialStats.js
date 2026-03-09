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
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600 via-blue-600 to-indigo-800 text-white shadow-xl">
      {/* Background design elements */}
      <div className="absolute top-0 right-0 -mt-10 -mr-10 w-40 h-40 bg-white/10 rounded-full blur-2xl"></div>
      <div className="absolute bottom-0 left-0 -mb-10 -ml-10 w-40 h-40 bg-blue-400/20 rounded-full blur-2xl"></div>

      <div className="relative z-10 p-6">
        {/* Main Highlight: Net Revenue */}
        <div className="flex flex-col items-center justify-center text-center w-full mb-6">
          <div className="inline-flex items-center justify-center p-3 bg-white/10 backdrop-blur-md rounded-2xl mb-3 shadow-inner">
            <Wallet size={28} className="text-blue-100" />
          </div>
          <p className="text-blue-100 font-medium text-sm lg:text-base mb-1 tracking-wide uppercase">
            {t("dashboard.netRevenue") || "Net Revenue"}
          </p>
          <h3 className="text-4xl md:text-5xl font-extrabold tracking-tight drop-shadow-md">
            {formatCurrency(net)}
          </h3>
        </div>

        {/* Divider */}
        <div className="w-full h-px bg-white/20 mb-6"></div>

        {/* Secondary Stats Group: Gross and Commission */}
        <div className="grid grid-cols-2 gap-4">
          {/* Gross */}
          <div className="flex flex-col items-center justify-center p-4 rounded-xl bg-white/10 backdrop-blur-md border border-white/10 hover:bg-white/15 transition-colors">
            <div className="flex items-center gap-2 mb-2 text-blue-200">
              <DollarSign size={16} />
              <p className="font-medium text-xs md:text-sm uppercase tracking-wider">
                {t("dashboard.totalGross") || "Total Gross"}
              </p>
            </div>
            <h4 className="text-lg md:text-xl font-bold">
              {formatCurrency(gross)}
            </h4>
          </div>

          {/* Commission */}
          <div className="flex flex-col items-center justify-center p-4 rounded-xl bg-white/10 backdrop-blur-md border border-white/10 hover:bg-white/15 transition-colors">
            <div className="flex items-center gap-2 mb-2 text-orange-200">
              <Percent size={16} />
              <p className="font-medium text-xs md:text-sm uppercase tracking-wider">
                {t("dashboard.komisiStaff") || "Staff Commission"}
              </p>
            </div>
            <h4 className="text-lg md:text-xl font-bold">
              {formatCurrency(commission)}
            </h4>
          </div>
        </div>
      </div>
    </div>
  );
}
