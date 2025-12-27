'use client';

import React from 'react';

export default function ThermalInvoicePrint({ payment, customer, settings, formatCurrency, formatDate }) {
    return (
        <div className={`hidden print:block font-mono text-black text-[12px] leading-tight w-full max-w-[58mm] mx-auto`}>
            <style jsx global>{`
                @media print {
                    @page {
                        margin: 0;
                        size: 58mm auto; /* Some mobile browsers ignore this */
                    }
                    body {
                        margin: 0 !important;
                        padding: 0 !important;
                        width: 100% !important;
                        background-color: white !important;
                    }
                    /* Hide everything by default, then show our print container */
                    body > * {
                        display: none !important;
                    }
                    /* We need to target the Next.js root div or body specifically */
                    /* But simpler: ensure our container is visible and others hidden */
                    /* The tailwind 'print:hidden' might fail if specificity issues, so let's enforce */
                    .print\\:hidden {
                        display: none !important;
                    }
                    .print\\:block {
                        display: block !important;
                    }
                    
                    /* Force container ID to show */
                    #thermal-print-container {
                        display: block !important;
                        width: 100%;
                        max-width: 58mm; /* Constrain width */
                        margin: 0 auto;
                    }
                }
            `}</style>

            <div id="thermal-print-container">
                {/* Header */}
                <div className="text-center mb-2 pt-2">
                    <h1 className="font-bold text-[14px]">*{settings.companyName || 'INTERNET BILLING'}*</h1>
                    <p className="text-[10px] whitespace-pre-line">{settings.companyAddress}</p>
                    <p className="text-[10px]">{settings.companyContact}</p>
                </div>

                <div className="flex items-center justify-center my-2 text-[10px] text-gray-400">
                    --------------------------------
                </div>

                {/* Details */}
                <div className="mb-2">
                    <p>No: #{payment.invoiceNumber || payment.id}</p>
                    <p>Tgl: {formatDate(payment.date)}</p>
                    <p className="mt-1 font-bold">Kpd: {customer.name || payment.username}</p>
                </div>

                <div className="flex items-center justify-center my-1 text-[10px] text-gray-400">
                    --------------------------------
                </div>

                {/* Item List */}
                <div className="mb-2">
                    <div className="flex justify-between mb-1">
                        <span>Layanan Internet</span>
                    </div>
                    <div className="flex justify-between font-bold">
                        <span>Total</span>
                        <span>{formatCurrency(payment.amount)}</span>
                    </div>
                </div>

                <div className="flex items-center justify-center my-1 text-[10px] text-gray-400">
                    --------------------------------
                </div>

                {/* Status & Footer */}
                <div className="text-center mt-2 pb-4">
                    <p className="font-bold text-[14px] mb-2 uppercase">
                        *{payment.status === 'completed' ? 'LUNAS' : 'BELUM BAYAR'}*
                    </p>
                    <p className="text-[10px]">Simpan struk ini sebagai</p>
                    <p className="text-[10px]">bukti pembayaran yang sah.</p>
                    <p className="text-[10px] mt-1">*** Terima Kasih ***</p>
                </div>
            </div>
        </div>
    );
}
