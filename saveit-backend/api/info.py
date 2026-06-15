import json
import re
from http.server import BaseHTTPRequestHandler
import yt_dlp


def detect_platform(url):
    patterns = {
        "youtube": r"(youtube\.com|youtu\.be)",
        "tiktok": r"tiktok\.com",
        "instagram": r"instagram\.com",
        "facebook": r"(facebook\.com|fb\.watch|fb\.com)",
        "twitter": r"(twitter\.com|x\.com)",
    }
    for platform, pattern in patterns.items():
        if re.search(pattern, url, re.IGNORECASE):
            return platform
    return "unknown"


def get_video_info(url):
    platform = detect_platform(url)

    ydl_opts = {
        "quiet": True,
        "no_warnings": True,
        "extract_flat": False,
        "skip_download": True,
        "noplaylist": True,
    }

    # TikTok: no watermark trick
    if platform == "tiktok":
        ydl_opts["extractor_args"] = {
            "tiktok": {"api_hostname": "api22-normal-c-useast2a.tiktokv.com"}
        }

    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        info = ydl.extract_info(url, download=False)

    if not info:
        raise ValueError("Tidak bisa mengambil info video")

    # Build format list
    formats = []
    seen = set()

    raw_formats = info.get("formats") or []
    for f in raw_formats:
        vcodec = f.get("vcodec", "none")
        acodec = f.get("acodec", "none")
        ext = f.get("ext", "")
        height = f.get("height")
        filesize = f.get("filesize") or f.get("filesize_approx")

        # Only video+audio combined, or video-only (we'll note it)
        if vcodec == "none" or ext not in ("mp4", "webm", "mov"):
            continue

        quality_label = f"{height}p" if height else "Unknown"
        key = (quality_label, ext)
        if key in seen:
            continue
        seen.add(key)

        formats.append({
            "format_id": f.get("format_id"),
            "url": f.get("url"),
            "ext": ext,
            "quality": quality_label,
            "height": height or 0,
            "filesize": filesize,
            "has_audio": acodec != "none",
        })

    # Sort by quality descending
    formats.sort(key=lambda x: x["height"], reverse=True)

    # Fallback: if no formats found, use direct url
    if not formats and info.get("url"):
        formats.append({
            "format_id": "best",
            "url": info["url"],
            "ext": info.get("ext", "mp4"),
            "quality": "Best",
            "height": 0,
            "filesize": None,
            "has_audio": True,
        })

    thumbnail = info.get("thumbnail") or ""
    # Use the best thumbnail
    thumbnails = info.get("thumbnails") or []
    if thumbnails:
        thumbnail = thumbnails[-1].get("url", thumbnail)

    return {
        "platform": platform,
        "title": info.get("title", "Video"),
        "thumbnail": thumbnail,
        "duration": info.get("duration"),
        "uploader": info.get("uploader") or info.get("channel", ""),
        "view_count": info.get("view_count"),
        "formats": formats[:8],  # max 8 format options
    }


class handler(BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def do_POST(self):
        try:
            length = int(self.headers.get("Content-Length", 0))
            body = self.rfile.read(length)
            data = json.loads(body)
            url = data.get("url", "").strip()

            if not url:
                raise ValueError("URL tidak boleh kosong")

            result = get_video_info(url)

            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(json.dumps({"success": True, "data": result}).encode())

        except Exception as e:
            self.send_response(400)
            self.send_header("Content-Type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(
                json.dumps({"success": False, "error": str(e)}).encode()
            )

    def log_message(self, format, *args):
        pass
