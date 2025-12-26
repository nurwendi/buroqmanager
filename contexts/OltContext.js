"use client";

import { createContext, useContext, useState, useEffect } from "react";
import { toast } from "sonner";

const OltContext = createContext();

export function OltProvider({ children }) {
    const [olts, setOlts] = useState([]);
    const [selectedOltId, setSelectedOltId] = useState(null);
    const [loading, setLoading] = useState(true);

    const fetchOlts = async () => {
        try {
            const res = await fetch("/api/settings/olt");
            if (res.ok) {
                const data = await res.json();
                setOlts(data);

                // Restore selection or default to first
                const saved = localStorage.getItem("selectedOltId");
                if (saved && data.find(o => o.id === saved)) {
                    setSelectedOltId(saved);
                } else if (data.length > 0) {
                    setSelectedOltId(data[0].id);
                }
            }
        } catch (error) {
            console.error("Failed to fetch OLTs", error);
            // toast.error("Failed to load OLT lists");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchOlts();
    }, []);

    const selectOlt = (id) => {
        setSelectedOltId(id);
        localStorage.setItem("selectedOltId", id);
        toast.success("Switched OLT");
    };

    return (
        <OltContext.Provider value={{ olts, selectedOltId, selectOlt, refreshOlts: fetchOlts, loading }}>
            {children}
        </OltContext.Provider>
    );
}

export function useOlt() {
    return useContext(OltContext);
}
