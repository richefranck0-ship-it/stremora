/**
 * OmniSave / VideoDownloader helper
 * URL Format: https://videodownloader.site/?utm_source=MB_Official_Website&q=<ENCODED_TITLE>
 */

export const getOmniSaveUrl = (title: string): string => {
  return `https://videodownloader.site/?utm_source=MB_Official_Website&q=${encodeURIComponent(title.trim())}`;
};

export const openOmniSave = (title: string): void => {
  const url = getOmniSaveUrl(title);
  window.open(url, '_blank', 'noopener,noreferrer');
};
