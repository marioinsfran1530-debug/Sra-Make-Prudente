import { Search, MessageCircle } from "lucide-react";
import { waLink } from "@/lib/whatsapp";

export function EmptyState({ hint }: { hint?: string }) {
  return (
    <div className="flex flex-col items-center text-center px-8 py-12">
      <div className="w-16 h-16 rounded-full flex items-center justify-center mb-3 bg-creme">
        <Search size={26} className="text-rosa-profundo" />
      </div>
      <p className="font-bold text-sm mb-1 text-texto">Não encontrou o que procura?</p>
      <p className="text-xs mb-4 text-cinza">
        {hint || "Manda uma foto ou o nome do produto que a gente confirma pra você."}
      </p>
      <a
        href={waLink("Oi! Não encontrei o produto que eu queria no catálogo. Pode me ajudar?")}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 text-sm font-bold px-4 py-2.5 rounded-full text-white"
        style={{ backgroundColor: "#25D366" }}
      >
        <MessageCircle size={15} /> Mandar foto no WhatsApp
      </a>
    </div>
  );
}
