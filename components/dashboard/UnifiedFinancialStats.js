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
    <div className="relative overflow-hidden rounded-2xl bg-white text-gray-800 border border-gray-100 shadow-sm">
      <div className="relative z-10 p-6">
        {/* Main Highlight: Net Revenue */}
        <div className="flex flex-col items-center justify-center text-center w-full mb-6">
          <div className="inline-flex items-center justify-center p-3 bg-blue-50 rounded-2xl mb-3">
            <Wallet size={28} className="text-blue-600" />
          </div>
          <p className="text-gray-500 font-medium text-sm lg:text-base mb-1 tracking-wide uppercase">
            {t("dashboard.netRevenue") || "Net Revenue"}
          </p>
          <h3 className="text-4xl md:text-5xl font-extrabold tracking-tight text-blue-600">
            {formatCurrency(net)}
          </h3>
        </div>

        {/* Divider */}
        <div className="w-full h-px bg-gray-100 mb-6"></div>

        {/* Secondary Stats Group: Gross and Commission */}
        <div className="grid grid-cols-2 gap-4">
          {/* Gross */}
          <div className="flex flex-col items-center justify-center p-4 rounded-xl bg-gray-50 border border-gray-100 hover:bg-gray-100 transition-colors">
            <div className="flex items-center gap-2 mb-2 text-indigo-600">
              <DollarSign size={16} />
              <p className="font-medium text-xs md:text-sm uppercase tracking-wider">
                {t("dashboard.totalGross") || "Total Gross"}
              </p>
            </div>
            <h4 className="text-lg md:text-xl font-bold text-gray-900">
              {formatCurrency(gross)}
            </h4>
          </div>

          {/* Commission */}
          <div className="flex flex-col items-center justify-center p-4 rounded-xl bg-gray-50 border border-gray-100 hover:bg-gray-100 transition-colors">
            <div className="flex items-center gap-2 mb-2 text-orange-600">
              <Percent size={16} />
              <p className="font-medium text-xs md:text-sm uppercase tracking-wider">
                {t("dashboard.komisiStaff") || "Staff Commission"}
              </p>
            </div>
            <h4 className="text-lg md:text-xl font-bold text-gray-900">
              {formatCurrency(commission)}
            </h4>
          </div>
        </div>
      </div>
    </div>
  );
}
