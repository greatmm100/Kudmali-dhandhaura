const SITE_URL = 'https://kurmali.co.in';
const SUPABASE_URL =
  process.env.SUPABASE_URL ||
  'https://ajtviwhdjclpubqpnkoo.supabase.co';

const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_ANON_KEY;

function escapeXml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function articleUrl(id) {
  return SITE_URL + '/rachna/' + encodeURIComponent(String(id));
}

function isoDate(value) {
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime())
    ? date.toISOString()
    : null;
}

module.exports = async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.status(405);
    res.setHeader('Allow', 'GET, HEAD');
    return res.end();
  }

  if (!SUPABASE_KEY) {
    res.status(500);
    res.setHeader(
      'Content-Type',
      'application/xml; charset=utf-8'
    );

    return res.end(
      '<?xml version="1.0" encoding="UTF-8"?>' +
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' +
      '<url><loc>' + SITE_URL + '/</loc></url>' +
      '</urlset>'
    );
  }

  try {
    const headers = {
      apikey: SUPABASE_KEY,
      Authorization: 'Bearer ' + SUPABASE_KEY
    };

    const articlesResponse = await fetch(
      SUPABASE_URL +
      '/rest/v1/articles' +
      '?select=id,created_at,updated_at' +
      '&status=eq.published' +
      '&order=created_at.desc' +
      '&limit=50000',
      { headers }
    );

    if (!articlesResponse.ok) {
      throw new Error(
        'articles HTTP ' + articlesResponse.status
      );
    }

    const articles = await articlesResponse.json();

    let submissions = [];

    try {
      const submissionsResponse = await fetch(
        SUPABASE_URL +
        '/rest/v1/submissions' +
        '?select=id,created_at,updated_at,status' +
        '&status=eq.approved' +
        '&order=created_at.desc' +
        '&limit=50000',
        { headers }
      );

      if (submissionsResponse.ok) {
        submissions = await submissionsResponse.json();
      }
    } catch (error) {
      // submissions unavailable — continue with articles
    }

    const articleIds = new Set(
      (articles || []).map(item => String(item.id))
    );

    const urls = [
      '<url><loc>' + SITE_URL + '/</loc></url>'
    ];

    for (const item of articles || []) {
      const lastModified = isoDate(
        item.updated_at || item.created_at
      );

      urls.push(
        '<url>' +
          '<loc>' +
          escapeXml(articleUrl(item.id)) +
          '</loc>' +
          (
            lastModified
              ? '<lastmod>' + lastModified + '</lastmod>'
              : ''
          ) +
        '</url>'
      );
    }

    for (const item of submissions || []) {
      const submissionId = 'submission-' + item.id;

      if (articleIds.has(submissionId)) {
        continue;
      }

      const lastModified = isoDate(
        item.updated_at || item.created_at
      );

      urls.push(
        '<url>' +
          '<loc>' +
          escapeXml(articleUrl(submissionId)) +
          '</loc>' +
          (
            lastModified
              ? '<lastmod>' + lastModified + '</lastmod>'
              : ''
          ) +
        '</url>'
      );
    }

    const xml =
      '<?xml version="1.0" encoding="UTF-8"?>\n' +
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
      urls.join('\n') +
      '\n</urlset>';

    res.status(200);
    res.setHeader(
      'Content-Type',
      'application/xml; charset=utf-8'
    );

    res.setHeader(
      'Cache-Control',
      'public, s-maxage=300, stale-while-revalidate=600'
    );

    if (req.method === 'HEAD') {
      return res.end();
    }

    return res.end(xml);

  } catch (error) {
    res.status(500);
    res.setHeader(
      'Content-Type',
      'application/xml; charset=utf-8'
    );

    return res.end(
      '<?xml version="1.0" encoding="UTF-8"?>' +
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' +
      '<url><loc>' + SITE_URL + '/</loc></url>' +
      '</urlset>'
    );
  }
};
