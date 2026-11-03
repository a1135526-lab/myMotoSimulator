import type { OnlineSubmission } from '@/application';

/** One line on how a score did on the global board; null when it wasn't sent. */
export function onlineText(online: OnlineSubmission): string | null {
  switch (online.state) {
    case 'off':
      return null;
    case 'sending':
      return '上傳全球排行榜中…';
    case 'done':
      return online.improved
        ? `🌏 全球第 ${online.rank} 名（新的個人最佳）`
        : `🌏 你在全球榜第 ${online.rank} 名（這次沒有比較快）`;
    case 'error':
      return `⚠ 沒有上傳：${online.error}`;
  }
}
