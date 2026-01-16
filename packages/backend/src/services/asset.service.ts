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

interface ImageInfo {
  originalSrc: string;  // URL as it appears in HTML (may be relative)
  resolvedSrc: string;  // Resolved absolute URL (used for caching)
  alt?: string;
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
   * Returns both the original URL (as in HTML) and resolved URL (for caching)
   */
  extractImageUrls(html: string, baseUrl?: string): ImageInfo[] {
    const images: ImageInfo[] = [];
    const seenUrls = new Set<string>();

    const addImage = (src: string, alt?: string) => {
      const originalSrc = src;
      let resolvedSrc = src;

      // Resolve relative URLs if baseUrl provided
      if (baseUrl && !src.startsWith('http')) {
        try {
          resolvedSrc = new URL(src, baseUrl).href;
        } catch (e) {
          // Keep original if resolution fails
        }
      }

      // Only add if not seen before (use resolved URL for deduplication)
      if (!seenUrls.has(resolvedSrc)) {
        seenUrls.add(resolvedSrc);
        images.push({ originalSrc, resolvedSrc, alt });
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
      // Log errors for debugging but return null since assets are optional
      const errorMessage = error.code === 'ECONNREFUSED' ? 'Connection refused'
        : error.code === 'ETIMEDOUT' ? 'Connection timeout'
        : error.code === 'ENOTFOUND' ? 'DNS resolution failed'
        : error.message || 'Unknown error';
      console.warn(`Failed to cache asset for book ${bookId}: ${srcUrl} - ${errorMessage}`);
      return null;
    }
  }

  /**
   * Process HTML content: extract images, cache them, and rewrite URLs
   */
  async processContent(bookId: number, html: string, baseUrl?: string): Promise<ContentWithAssets> {
    if (baseUrl) {
      console.log(`Processing content for book ${bookId} with baseUrl: ${baseUrl}`);
    } else {
      console.warn(`No baseUrl provided for book ${bookId} - relative URLs may not resolve correctly`);
    }

    const images = this.extractImageUrls(html, baseUrl);

    console.log(`Found ${images.length} images in book ${bookId} content`);

    if (images.length === 0) {
      return { content: html, assets: [] };
    }

    const assetMap = new Map<string, AssetInfo>();
    const urlToAssetMap = new Map<string, AssetInfo>(); // Maps any URL variant to asset
    const assets: AssetInfo[] = [];

    // Cache all assets in parallel for better performance
    const cachePromises = images.map(async (img) => {
      try {
        // Cache using the resolved (absolute) URL
        const asset = await this.cacheAsset(bookId, img.resolvedSrc, img.alt);
        if (asset) {
          assetMap.set(img.resolvedSrc, asset);
          urlToAssetMap.set(img.resolvedSrc, asset);
          // Also map the original URL so we can replace it in HTML
          urlToAssetMap.set(img.originalSrc, asset);
          assets.push(asset);
        }
      } catch (err) {
        console.warn(`Failed to cache image: ${img.resolvedSrc}`);
      }
    });

    await Promise.allSettled(cachePromises);

    // Rewrite image URLs in HTML
    // We need to replace URLs as they appear in the HTML (originalSrc)
    let processedContent = html;

    // Debug: Check for images in content
    const imgMatches = processedContent.match(/<img[^>]+src=["']([^"']+)["']/gi);
    console.log(`Found ${imgMatches?.length || 0} img tags in content`);
    if (imgMatches) {
      console.log('Image sources found:', imgMatches.slice(0, 5).join('; '));
    }

    for (const img of images) {
      const asset = urlToAssetMap.get(img.resolvedSrc);
      if (!asset) {
        console.log(`No asset found for resolvedSrc: ${img.resolvedSrc}`);
        continue; // Skip if not cached
      }

      // Replace the original URL (as it appears in HTML) - both encoded and decoded
      const urlsToReplace = new Set([img.originalSrc]);
      const decoded = decodeURI(img.originalSrc);
      if (decoded !== img.originalSrc) {
        urlsToReplace.add(decoded);
      }

      for (const url of urlsToReplace) {
        const escapedUrl = url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(escapedUrl, 'g');
        const replacements = processedContent.match(regex);
        if (replacements && replacements.length > 0) {
          console.log(`Replacing ${replacements.length} occurrences of "${url}" with /api/books/${bookId}/assets/${asset.localFilename}`);
          processedContent = processedContent.replace(regex, `/api/books/${bookId}/assets/${asset.localFilename}`);
        }
      }
    }

    // Debug: Check images after replacement
    const afterMatches = processedContent.match(/<img[^>]+src=["']([^"']+)["']/gi);
    console.log('Image sources after replacement:', afterMatches?.slice(0, 5).join('; '));

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
