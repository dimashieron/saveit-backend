const COBALT_INSTANCES = [
  'https://api.cobalt.tools',
  'https://cobalt.ggtyler.dev',
  'https://cobalt-api.kwiatekmiki.com',
];

function detectPlatform(url) {
  if (/youtube\.com|youtu\.be/.test(url)) return 'youtube';
  if (/tiktok\.com/.test(url)) return 'tiktok';
  if (/instagram\.com/.test(url)) return 'instagram';
  if (/facebook\.com|fb\.watch/.test(url)) return 'facebook';
  if (/twitter\.com|x\.com/.test(url)) return 'twitter';
  return 'unknown';
}

async function tryCobalt(url, instance) {
  const res = await fetch(`${instance}/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify({
      url,
      videoQuality: '1080',
      audioFormat: 'mp3',
    }),
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json();
}

async function getVideoInfo(url) {
  const platform = detectPlatform(url);
  let lastError = null;

  for (const instance of COBALT_INSTANCES) {
    try {
      const data = await tryCobalt(url, instance);
      if (data.status === 'error') throw new Error(data.error?.code || 'cobalt error');

      const formats = [];

      if (data.status === 'picker') {
        data.picker.forEach((item, i) => {
          formats.push({
            format_id: `item_${i}`,
            url: item.url,
            ext: 'mp4',
            quality: item.type === 'photo' ? `Foto ${i+1}` : `Video ${i+1}`,
            has_audio: item.type !== 'photo',
          });
        });
      } else if (data.url) {
        formats.push({
          format_id: 'best',
          url: data.url,
          ext: 'mp4',
          quality: 'Best Quality',
          has_audio: true,
        });
      }

      // oEmbed untuk metadata
      let title = platform.charAt(0).toUpperCase() + platform.slice(1) + ' Video';
      let thumbnail = '';
      let uploader = '';

      const oembedMap = {
        youtube: `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`,
        tiktok: `https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`,
        twitter: `https://publish.twitter.com/oembed?url=${encodeURIComponent(url)}`,
      };

      if (oembedMap[platform]) {
        try {
          const oe = await fetch(oembedMap[platform], { signal: AbortSignal.timeout(4000) });
          if (oe.ok) {
            const oed = await oe.json();
            title = oed.title || title;
            thumbnail = oed.thumbnail_url || thumbnail;
            uploader = oed.author_name || uploader;
          }
        } catch {}
      }

      return { platform, title, thumbnail, uploader, formats };
    } catch (err) {
      lastError = err;
    }
  }
  throw new Error(`Gagal: ${lastError?.message}`);
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method === 'GET') {
    return res.status(200).json({ status: 'SaveIt API is running!' });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { url } = req.body;
    if (!url?.trim()) return res.status(400).json({ success: false, error: 'URL kosong' });

    const data = await getVideoInfo(url.trim());
    return res.status(200).json({ success: true, data });
  } catch (err) {
    return res.status(400).json({ success: false, error: err.message });
  }
}
