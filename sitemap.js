export default async function handler(req, res) {
  const SUPABASE_URL = process.env.SUPABASE_URL;
  // Prefer service role for sitemap (server-only). Fall back to anon if needed.
  const SUPABASE_KEY =
    process.env.SUPABASE_SECRET_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_ANON_KEY;

  const baseUrl = "https://www.kurmali.co.in";

  try {
    if (!SUPABASE_URL || !SUPABASE_KEY) {
      throw new Error("Supabase environment variables are missing");
    }

    const headers = {
      apikey: SUPABASE_KEY,
      Authorization: "Bearer " + SUPABASE_KEY,
    };

    const urls = new Map();

    // Homepage — highest priority
    urls.set(`${baseUrl}/`, {
      loc: `${baseUrl}/`,
      changefreq: "daily",
      priority: "1.0",
    });

    // Static public sections (hash routes still useful for some crawlers)
    const staticPaths = [
      "#language",
      "#education",
      "#culture",
      "#blog",
      "#resources",
      "#about",
    ];
    // Prefer clean paths if you later add real routes; for now keep home only for static.

    // Published articles
    const articlesUrl =
      `${SUPABASE_URL}/rest/v1/articles?select=id,updated_at,created_at&status=eq.published&order=updated_at.desc`;

    const articlesResponse = await fetch(articlesUrl, { headers });
    if (!articlesResponse.ok) {
      const errorText = await articlesResponse.text();
      throw new Error(
        `Articles query failed: ${articlesResponse.status} ${errorText}`
      );
    }
    const articles = await articlesResponse.json();

    for (const article of articles || []) {
      if (article.id !== undefined && article.id !== null) {
        const loc = `${baseUrl}/rachna/${encodeURIComponent(String(article.id))}`;
        const lastmod = article.updated_at || article.created_at || null;
        urls.set(loc, {
          loc,
          lastmod: lastmod ? new Date(lastmod).toISOString().slice(0, 10) : null,
          changefreq: "weekly",
          priority: "0.8",
        });
      }
    }

    // Approved Rachna submissions
    const submissionsUrl =
      `${SUPABASE_URL}/rest/v1/submissions?select=id,updated_at,created_at&status=eq.approved&order=updated_at.desc`;

    const submissionsResponse = await fetch(submissionsUrl, { headers });
    if (!submissionsResponse.ok) {
      const errorText = await submissionsResponse.text();
      throw new Error(
        `Submissions query failed: ${submissionsResponse.status} ${errorText}`
      );
    }
    const submissions = await submissionsResponse.json();

    for (const item of submissions || []) {
      if (item.id !== undefined && item.id !== null) {
        const loc = `${baseUrl}/rachna/submission-${encodeURIComponent(String(item.id))}`;
        const lastmod = item.updated_at || item.created_at || null;
        urls.set(loc, {
          loc,
          lastmod: lastmod ? new Date(lastmod).toISOString().slice(0, 10) : null,
          changefreq: "weekly",
          priority: "0.7",
        });
      }
    }

    const xmlUrls = [...urls.values()]
      .map((u) => {
        let block = `<url><loc>${escapeXml(u.loc)}</loc>`;
        if (u.lastmod) block += `<lastmod>${escapeXml(u.lastmod)}</lastmod>`;
        if (u.changefreq) block += `<changefreq>${u.changefreq}</changefreq>`;
        if (u.priority) block += `<priority>${u.priority}</priority>`;
        block += `</url>`;
        return block;
      })
      .join("");

    const xml =
      `<?xml version="1.0" encoding="UTF-8"?>` +
      `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">` +
      xmlUrls +
      `</urlset>`;

    res.status(200);
    res.setHeader("Content-Type", "application/xml; charset=utf-8");
    res.setHeader(
      "Cache-Control",
      "public, s-maxage=300, stale-while-revalidate=600"
    );
    res.end(xml);
  } catch (error) {
    console.error("SITEMAP ERROR:", error);
    res.status(500);
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.end("Sitemap generation failed. Check Vercel Function Logs.");
  }
}

function escapeXml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
