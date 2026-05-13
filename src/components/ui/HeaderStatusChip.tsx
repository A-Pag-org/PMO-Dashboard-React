// FILE: src/components/ui/HeaderStatusChip.tsx
// PURPOSE: Static status chip rendered on the left of the navy filter
//          bar — Figma's "157 MODERATE · Delhi-NCR · ● Live". Real data
//          will replace these props later; for now the defaults match
//          the design verbatim.

import { ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';

interface HeaderStatusChipProps {
  score?: number;
  scoreLabel?: string;
  regionLabel?: string;
  live?: boolean;
  /** Optional click handler for the external-link icon. */
  onOpen?: () => void;
  className?: string;
}

export default function HeaderStatusChip({
  score = 157,
  scoreLabel = 'MODERATE',
  regionLabel = 'Delhi-NCR',
  live = true,
  onOpen,
  className,
}: HeaderStatusChipProps) {
  return (
    <div
      className={cn(
        'box-border inline-flex h-[38px] items-center gap-[10px] rounded-[4px] border border-white/50 bg-white/[0.33] px-[15px] py-[5px]',
        className,
      )}
    >
      <span className="inline-flex items-center justify-center rounded-[4px] bg-[#FFF3E0] px-[7px] py-[2px] pb-[3px] font-['Open_Sans',sans-serif] text-[10px] font-medium leading-[14px] text-[#E65100]">
        {score} {scoreLabel}
      </span>
      <div className="flex flex-col leading-none">
        <span className="font-['Open_Sans',sans-serif] text-[10px] font-normal leading-[14px] text-white">
          {regionLabel}
        </span>
        {live ? (
          <span className="mt-[2px] inline-flex items-center gap-[2px]">
            <span
              aria-hidden
              className="h-[6px] w-[6px] rounded-full bg-[#FC6468]"
            />
            <span className="font-['Open_Sans',sans-serif] text-[10px] font-normal leading-[14px] text-white">
              Live
            </span>
          </span>
        ) : null}
      </div>
      {onOpen ? (
        <button
          type="button"
          onClick={onOpen}
          aria-label="Open detail view"
          className="ml-auto inline-flex h-[12px] w-[12px] items-center justify-center text-white hover:opacity-80"
        >
          <ExternalLink className="h-3 w-3" aria-hidden />
        </button>
      ) : (
        <ExternalLink
          className="ml-auto h-3 w-3 text-white"
          aria-hidden
        />
      )}
    </div>
  );
}
