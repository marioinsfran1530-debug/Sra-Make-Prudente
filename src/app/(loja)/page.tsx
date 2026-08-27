import PreviewHomePage from "./previa/page";

export const revalidate = 60;

// A Home aprovada usa exatamente a mesma composição validada na rota /previa.
// A rota de prévia mantém seus próprios metadados noindex; a raiz continua usando
// os metadados públicos definidos no layout da loja.
export default PreviewHomePage;
