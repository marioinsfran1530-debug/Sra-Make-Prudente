import { AnalysisSubnav } from "@/components/admin/AnalysisSubnav";

export default function AnalysisLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="analysis-shell min-w-0">
      <AnalysisSubnav />
      {children}

      <style>{`
        .analysis-shell .mt-2.overflow-x-auto.pb-1 {
          scrollbar-width: none;
        }

        .analysis-shell .mt-2.overflow-x-auto.pb-1::-webkit-scrollbar {
          display: none;
        }

        @media (max-width: 639px) {
          .analysis-shell .py-3:has(> .mt-2.overflow-x-auto.pb-1) > .flex.items-start.justify-between {
            flex-direction: column;
            align-items: flex-start;
            gap: 0.5rem;
          }

          .analysis-shell .mt-2.overflow-x-auto.pb-1 {
            overflow-x: visible;
            padding-bottom: 0;
          }

          .analysis-shell .mt-2.overflow-x-auto.pb-1 > .flex.min-w-max.items-center.gap-1 {
            display: grid;
            min-width: 0;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 0.375rem;
          }

          .analysis-shell .mt-2.overflow-x-auto.pb-1 > .flex.min-w-max.items-center.gap-1 > span:nth-child(even) {
            display: none;
          }

          .analysis-shell .mt-2.overflow-x-auto.pb-1 > .flex.min-w-max.items-center.gap-1 > span:nth-child(odd) {
            display: flex;
            min-width: 0;
            width: 100%;
            align-items: center;
            justify-content: space-between;
            gap: 0.5rem;
            white-space: normal;
          }
        }
      `}</style>
    </div>
  );
}
