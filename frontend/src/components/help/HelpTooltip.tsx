import React, { useState, useRef, useEffect, useCallback } from 'react';
import { HelpCircle } from 'lucide-react';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface HelpTooltipProps {
  text: string;
}

// ---------------------------------------------------------------------------
// HelpTooltip
// ---------------------------------------------------------------------------

const HelpTooltip: React.FC<HelpTooltipProps> = ({ text }) => {
  const [visible, setVisible] = useState(false);
  const [position, setPosition] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const iconRef = useRef<HTMLSpanElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const updatePosition = useCallback(() => {
    if (!iconRef.current || !tooltipRef.current) return;
    const iconRect = iconRef.current.getBoundingClientRect();
    const tooltipRect = tooltipRef.current.getBoundingClientRect();
    const top = iconRect.top - tooltipRect.height - 6;
    let left = iconRect.left + iconRect.width / 2 - tooltipRect.width / 2;

    // Keep tooltip within viewport
    const padding = 8;
    if (left < padding) left = padding;
    if (left + tooltipRect.width > window.innerWidth - padding) {
      left = window.innerWidth - padding - tooltipRect.width;
    }

    setPosition({ top, left });
  }, []);

  useEffect(() => {
    if (visible) {
      // Defer to next frame so the tooltip is rendered and measurable
      requestAnimationFrame(updatePosition);
    }
  }, [visible, updatePosition]);

  return (
    <>
      <span
        ref={iconRef}
        className="inline-flex items-center cursor-help"
        onMouseEnter={() => setVisible(true)}
        onMouseLeave={() => setVisible(false)}
        onFocus={() => setVisible(true)}
        onBlur={() => setVisible(false)}
        tabIndex={0}
        role="img"
        aria-label={text}
      >
        <HelpCircle size={14} className="text-gray-400 hover:text-gray-500 transition-colors" />
      </span>

      {visible && (
        <div
          ref={tooltipRef}
          className="fixed z-[9999] bg-gray-900 text-white text-xs rounded-lg px-3 py-2 max-w-xs shadow-lg pointer-events-none transition-opacity duration-150"
          style={{
            top: position.top,
            left: position.left,
            opacity: position.top === 0 && position.left === 0 ? 0 : 1,
          }}
          role="tooltip"
        >
          {text}
          {/* Arrow */}
          <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-[5px] border-r-[5px] border-t-[5px] border-l-transparent border-r-transparent border-t-gray-900" />
        </div>
      )}
    </>
  );
};

export default HelpTooltip;
