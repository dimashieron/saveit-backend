// Serverless function - Node.js
// Pakai cobalt.tools API sebagai proxy (open source, gratis, no key)

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

function formatDuration(sec) {
  if (!sec) return null;
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  return h > 0
    ? `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`
    : `${m}:${String(s).padStart(2,'0')}`;
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
      tiktokH265: false,
    }),
    signal: AbortSignal.timeout(10000),
  });

  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json();
}

async function getVideoInfoFromCobalt(url) {
  const platform = detectPlatform(url);
  let lastError = null;

  for (const instance of COBALT_INSTANCES) {
    try {
      const data = await tryCobalt(url, instance);

      // Cobalt returns: { status: 'stream'|'redirect'|'picker'|'error', url, picker, ... }
      if (data.status === 'error') {
        throw new Error(data.error?.code || 'cobalt error');
      }

      const formats = [];

      if (data.status === 'picker') {
        // Multiple items (e.g. carousel post)
        data.picker.forEach((item, i) => {
          formats.push({
            format_id: `item_${i}`,
            url: item.url,
            ext: 'mp4',
            quality: item.type === 'photo' ? 'Foto' : `Video ${i + 1}`,
            height: 0,
            filesize: null,
            has_audio: item.type !== 'photo',
          });
        });
      } else if (data.url) {
        // Single video - offer multiple quality via URL params if possible
        formats.push({
          format_id: 'best',
          url: data.url,
          ext: 'mp4',
          quality: 'Best',
          height: 0,
          filesize: null,
          has_audio: true,
        });
      }

      return {
        platform,
        title: `${platform.charAt(0).toUpperCase() + platform.slice(1)} Video`,
        thumbnail: data.thumbnail || '',
        duration: null,
        uploader: '',
        view_count: null,
        formats,
        _cobalt_instance: instance,
      };
    } catch (err) {
      lastError = err;
      continue;
    }
  }

  throw new Error(`Semua server gagal: ${lastError?.message}`);
}

// Fallback: oEmbed untuk ambil metadata thumbnail/title
async function getOEmbed(url, platform) {
  const oembedUrls = {
    youtube: `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`,
    twitter: `https://publish.twitter.com/oembed?url=${encodeURIComponent(url)}`,
    instagram: null,
    tiktok: `https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`,
  };

  const ourl = oembedUrls[platform];
  if (!ourl) return null;

  try {
    const res = await fetch(ourl, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { url } = req.body;
    if (!url || !url.trim()) {
      return res.status(400).json({ success: false, error: 'URL tidak boleh kosong' });
    }

    const platform = detectPlatform(url.trim());

    // Get download links from cobalt
    const videoInfo = await getVideoInfoFromCobalt(url.trim());

    // Try to enrich with oEmbed metadata
    const oembed = await getOEmbed(url.trim(), platform);
    if (oembed) {
      videoInfo.title = oembed.title || videoInfo.title;
      videoInfo.thumbnail = oembed.thumbnail_url || videoInfo.thumbnail;
      videoInfo.uploader = oembed.author_name || videoInfo.uploader;
    }

    return res.status(200).json({ success: true, data: videoInfo });
  } catch (err) {
    return res.status(400).json({
      success: false,
      error: err.message || 'Gagal mengambil video',
    });
  }
}
