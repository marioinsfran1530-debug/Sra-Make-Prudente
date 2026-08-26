import { AnalysisSubnav } from "@/components/admin/AnalysisSubnav";

export default function AnalysisLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AnalysisSubnav />
      {children}
    </>
  );
}
