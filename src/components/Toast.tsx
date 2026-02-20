"use client";

import { useEffect, useState, useCallback } from "react";

let showToastFn: ((msg: string) => void) | null = null;

export function toast(msg: string) {
  showToastFn?.(msg);
}

export default function Toast() {
  const [message, setMessage] = useState("");
  const [visible, setVisible] = useState(false);

  const show = useCallback((msg: string) => {
    setMessage(msg);
    setVisible(true);
    setTimeout(() => setVisible(false), 2000);
  }, []);

  useEffect(() => {
    showToastFn = show;
    return () => {
      showToastFn = null;
    };
  }, [show]);

  return (
    <div
      className={`fixed bottom-24 left-1/2 -translate-x-1/2 bg-gray-800 text-white
        px-5 py-2.5 rounded-full text-sm z-[100] whitespace-nowrap
        transition-all duration-300 pointer-events-none
        ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-5"}`}
    >
      {message}
    </div>
  );
}
