import axios from 'axios';
import path from 'path';
import crypto from 'crypto';
import { prisma } from '../models';
import { AppError } from '../middleware/errorHandler';
import { httpsAgent, httpAgent } from './gutenberg.service';

interface AssetInfo {
  originalUrl: string;
  localFilename: string;
  mimeType: string;
  sizeBytes: number;
  altText?: string;
}

interface ContentWithAssets {
  content: string;
  assets: AssetInfo[];
}

export class AssetService {
  private readonly maxAssetSizeBytes = 5 * 1024 * 1024; // 5MB limit per asset
  private readonly allowedMimeTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];

  /**
   * Extract all image URLs from HTML content (from <img>, <link>, and CSS background images)
   */
  extractImageUrls(html: string, baseUrl?: string): Array<{ src: string; alt?: string }> {
    const images: Array<{ src: string; alt?: string }> = [];
    const seenUrls = new Set<string>();

    const addImage = (src: string, alt?: string) => {
      // Resolve relative URLs if baseUrl provided
      if (baseUrl && !src.startsWith('http')) {
        try {
          const resolved = new URL(src, baseUrl).href;
          src = resolved;
        } catch (e) {
          // Keep original if resolution fails
        }
      }
      // Only add if not seen before
      if (!seenUrls.has(src)) {
        seenUrls.add(src);
        images.push({ src, alt });
      }
    };

    // Match img tags with src and optional alt
    const imgRegex = /<img\s+([^>]*?)src=["']([^"']+)["']([^>]*?)alt=["']([^"']*)["'][^>]*\/?>/gi;
    let match;

    while ((match = imgRegex.exec(html)) !== null) {
      addImage(match[2], match[4] || undefined);
    }

    // Also match img tags without explicit alt
    const simpleImgRegex = /<img\s+([^>]*?)src=["']([^"']+)["'][^>]*\/?>/gi;
    while ((match = simpleImgRegex.exec(html)) !== null) {
      addImage(match[2]);
    }

    // Match link tags for icons/favicons (e.g., <link href="images/cover.jpg" rel="icon">)
    // Also match <link href="..." type="image/x-icon"> without explicit rel
    const iconLinkRegex = /<link\s+[^>]*?href=["']([^"']+)["'][^>]*?(?:rel=["'](?:shortcut )?icon["']|rel=["']image\/x-icon["']|type=["'](?:image\/x-icon|image\/x-cover)["'])[^>]*\/?>/gi;
    while ((match = iconLinkRegex.exec(html)) !== null) {
      addImage(match[1]);
    }

    // Also match any link tags pointing to image files
    const anyLinkImageRegex = /<link\s+[^>]*?href=["']([^"']+\.(?:jpg|jpeg|png|gif|webp|svg))["'][^>]*\/?>/gi;
    while ((match = anyLinkImageRegex.exec(html)) !== null) {
      addImage(match[1]);
    }

    // Match link tags with rel="stylesheet" that might reference image URLs in CSS
    // These are usually not directly image files, so we skip them for now

    return images;
  }

  /**
   * Download an asset and cache it locally
   */
  async cacheAsset(bookId: number, srcUrl: string, altText?: string): Promise<AssetInfo | null> {
    try {
      // Check if already cached
      const existing = await prisma.bookAsset.findFirst({
        where: {
          bookId,
          originalUrl: srcUrl,
        },
      });

      if (existing) {
        return {
          originalUrl: existing.originalUrl,
          localFilename: existing.filename,
          mimeType: existing.mimeType,
          sizeBytes: existing.sizeBytes || 0,
          altText: existing.altText || undefined,
        };
      }

      // Fetch the image
      const response = await axios.get<ArrayBuffer>(srcUrl, {
        responseType: 'arraybuffer',
        timeout: 15000,
        maxRedirects: 5,
        httpAgent,
        httpsAgent,
        headers: {
          'User-Agent': 'Gutenberg-Reader/1.0 (educational project)',
        },
      });

      const contentType = response.headers['content-type'] || '';
      const mimeType = this.getMimeType(contentType, srcUrl);

      if (!this.allowedMimeTypes.includes(mimeType)) {
        console.warn(`Skipping unsupported asset type: ${mimeType} (${srcUrl})`);
        return null;
      }

      const sizeBytes = response.data.byteLength;

      if (sizeBytes > this.maxAssetSizeBytes) {
        console.warn(`Skipping asset too large: ${sizeBytes} bytes (${srcUrl})`);
        return null;
      }

      // Generate unique filename
      const ext = this.getExtension(mimeType, srcUrl);
      const hash = crypto.createHash('md5').update(srcUrl).digest('hex').substring(0, 12);
      const filename = `asset_${hash}${ext}`;

      // Store in database
      const asset = await prisma.bookAsset.create({
        data: {
          bookId,
          filename,
          originalUrl: srcUrl,
          mimeType,
          sizeBytes,
          data: Buffer.from(response.data),
          altText: altText || null,
        },
      });

      console.log(`Cached asset: ${filename} (${sizeBytes} bytes) for book ${bookId}`);

      return {
        originalUrl: srcUrl,
        localFilename: filename,
        mimeType,
        sizeBytes,
        altText,
      };
    } catch (error: any) {
      // Don't log errors for failed assets - they're optional
      // and many Gutenberg images have broken relative paths
      return null;
    }
  }

  /**
   * Process HTML content: extract images, cache them, and rewrite URLs
   */
  async processContent(bookId: number, html: string, baseUrl?: string): Promise<ContentWithAssets> {
    const images = this.extractImageUrls(html, baseUrl);

    if (images.length === 0) {
      return { content: html, assets: [] };
    }

    const assetMap = new Map<string, AssetInfo>();
    const assets: AssetInfo[] = [];

    // Cache all assets
    for (const img of images) {
      const asset = await this.cacheAsset(bookId, img.src, img.alt);
      if (asset) {
        assetMap.set(img.src, asset);
        assets.push(asset);
      }
    }

    // Rewrite image URLs in HTML
    let processedContent = html;
    for (const [originalUrl, asset] of assetMap) {
      // Replace all occurrences of the original URL
      processedContent = processedContent.replace(
        new RegExp(originalUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'),
        `/api/books/${bookId}/assets/${asset.localFilename}`
      );
    }

    return { content: processedContent, assets };
  }

  /**
   * Get an asset by book ID and filename
   */
  async getAsset(bookId: number, filename: string): Promise<{ data: Buffer; mimeType: string } | null> {
    const asset = await prisma.bookAsset.findUnique({
      where: {
        bookId_filename: {
          bookId,
          filename,
        },
      },
    });

    if (!asset || !asset.data) {
      return null;
    }

    return {
      data: asset.data,
      mimeType: asset.mimeType,
    };
  }

  /**
   * Delete all assets for a book
   */
  async deleteAssetsForBook(bookId: number): Promise<void> {
    await prisma.bookAsset.deleteMany({
      where: { bookId },
    });
  }

  private getMimeType(contentType: string, url: string): string {
    if (contentType) {
      const mime = contentType.split(';')[0].trim().toLowerCase();
      if (this.allowedMimeTypes.includes(mime)) {
        return mime;
      }
    }

    // Fallback to extension-based detection
    const ext = path.extname(url).toLowerCase();
    const mimeMap: Record<string, string> = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.svg': 'image/svg+xml',
    };

    return mimeMap[ext] || 'application/octet-stream';
  }

  private getExtension(mimeType: string, url: string): string {
    const extMap: Record<string, string> = {
      'image/jpeg': '.jpg',
      'image/png': '.png',
      'image/gif': '.gif',
      'image/webp': '.webp',
      'image/svg+xml': '.svg',
    };

    return extMap[mimeType] || path.extname(url) || '.bin';
  }
}

export const assetService = new AssetService();
