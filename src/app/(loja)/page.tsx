import PreviewHomePage from "./previa/page";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// A Home aprovada usa exatamente a mesma composição validada na rota /previa.
// A raiz fica dinâmica para refletir imediatamente as alterações salvas no ADM.
// A rota de prévia mantém seus próprios metadados noindex; a raiz continua usando
// os metadados públicos definidos no layout da loja.
export default PreviewHomePage;
