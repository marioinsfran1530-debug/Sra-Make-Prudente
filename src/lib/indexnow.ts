const SITE_URL = "https://www.sramakeprudente.com.br";
const INDEXNOW_KEY = "8d93f10c5a4e47c2b691e0ad3f8c7621";
const INDEXNOW_ENDPOINT = "https://api.indexnow.org/indexnow";

function toAbsoluteUrl(pathOrUrl: string) {
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  const path = pathOrUrl.startsWith("/") ? pathOrUrl : `/${pathOrUrl}`;
  return `${SITE_URL}${path}`;
}

export async function notifyIndexNow(paths: string[]) {
  if (process.env.VERCEL_ENV && process.env.VERCEL_ENV !== "production") return;

  const urlList = Array.from(new Set(paths.filter(Boolean).map(toAbsoluteUrl)));
  if (urlList.length === 0) return;

  try {
    const response = await fetch(INDEXNOW_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({
        host: "www.sramakeprudente.com.br",
        key: INDEXNOW_KEY,
        keyLocation: `${SITE_URL}/${INDEXNOW_KEY}.txt`,
        urlList,
      }),
      cache: "no-store",
    });

    if (!response.ok && response.status !== 202) {
      console.error("IndexNow rejeitou a notificação:", response.status, await response.text());
    }
  } catch (error) {
    console.error("Falha ao notificar IndexNow:", error);
  }
}

export const indexNowPaths = {
  product: (id: string) => `/produto/${id}`,
  category: (slug: string) => `/categoria/${slug}`,
  catalog: "/categoria",
  sitemap: "/sitemap.xml",
};
