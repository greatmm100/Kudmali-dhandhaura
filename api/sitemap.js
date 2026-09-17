export default async function handler(req, res) {
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_KEY = process.env.SUPABASE_SECRET_KEY;

  const baseUrl = "https://kurmali.co.in";

  try {
    if (!SUPABASE_URL || !SUPABASE_KEY) {
      throw new Error("Supabase environment variables are missing");
    }

    const headers = {
      apikey: SUPABASE_KEY
    };

    const urls = new Set([
      `${baseUrl}/`
    ]);

    // Published articles
    const articlesUrl =
      `${SUPABASE_URL}/rest/v1/articles?select=id&status=eq.published`;

    const articlesResponse = await fetch(articlesUrl, {
      headers
    });

    if (!articlesResponse.ok) {
      const errorText = await articlesResponse.text();
      throw new Error(
        `Articles query failed: ${articlesResponse.status} ${errorText}`
      );
    }

    const articles = await articlesResponse.json();

    for (const article of articles || []) {
      if (article.id !== undefined && article.id !== null) {
        urls.add(
          `${baseUrl}/rachna/${encodeURIComponent(String(article.id))}`
        );
      }
    }

    // Approved Rachna submissions
    const submissionsUrl =
      `${SUPABASE_URL}/rest/v1/submissions?select=id&status=eq.approved`;

    const submissionsResponse = await fetch(submissionsUrl, {
      headers
    });

    if (!submissionsResponse.ok) {
      const errorText = await submissionsResponse.text();
      throw new Error(
        `Submissions query failed: ${submissionsResponse.status} ${errorText}`
      );
    }

    const submissions = await submissionsResponse.json();

    for (const item of submissions || []) {
      if (item.id !== undefined && item.id !== null) {
        urls.add(
          `${baseUrl}/rachna/submission-${encodeURIComponent(String(item.id))}`
        );
      }
    }

    const xmlUrls = [...urls].map((url) => {
      return `<url><loc>${escapeXml(url)}</loc></url>`;
    }).join("");

    const xml =
      `<?xml version="1.0" encoding="UTF-8"?>` +
      `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">` +
      xmlUrls +
      `</urlset>`;

    res.status(200);
    res.setHeader("Content-Type", "application/xml; charset=utf-8");
    res.setHeader("Cache-Control", "public, s-maxage=300, stale-while-revalidate=600");
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
