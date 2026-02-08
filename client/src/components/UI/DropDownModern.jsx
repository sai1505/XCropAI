import { useState, useRef, useEffect } from "react";
import downArrow from "/imgs/XCropAIDownArrow.png"

export default function DropDownModern({ label, value, options, onChange, disabled }) {
    const [open, setOpen] = useState(false);
    const ref = useRef(null);

    useEffect(() => {
        const handler = (e) => {
            if (ref.current && !ref.current.contains(e.target)) {
                setOpen(false);
            }
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    return (
        <div className="relative w-full" ref={ref}>
            <p className="text-sm text-gray-500 mb-1">{label}</p>

            {/* Trigger */}
            <button
                disabled={disabled}
                onClick={() => {
                    if (disabled) return;
                    setOpen(!open);
                }}
                className={`w-full flex items-center justify-between rounded-2xl border 
    border-neutral-400 px-4 py-3 text-sm bg-white
    ${disabled
                        ? "cursor-not-allowed opacity-60"
                        : "hover:outline-none"}`}
            >
                <span className="text-gray-900">{value}</span>

                <img
                    src={downArrow}
                    className={`w-4 h-4 transition-transform pointer-events-none
                    ${open ? "rotate-180" : ""}`}
                />
            </button>


            {/* Dropdown */}
            {open && !disabled && (
                <div className="absolute z-50 mt-2 w-full rounded-3xl border border-neutral-200 bg-white shadow-lg">
                    {options.map((opt) => (
                        <button
                            key={opt}
                            onClick={() => {
                                onChange(opt);
                                setOpen(false);
                            }}
                            className={`w-full text-left rounded-3xl px-4 py-3 text-sm hover:bg-neutral-100
                ${opt === value ? "bg-gray-50 font-medium" : ""}`}
                        >
                            {opt}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
