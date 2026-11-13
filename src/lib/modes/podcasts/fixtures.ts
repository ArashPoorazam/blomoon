export const item = (guid = 'one', url = 'https://cdn.example/one.mp3', extra = '') => `<item><guid>${guid}</guid><title>Episode</title><enclosure url="${url}" type="audio/mpeg" length="12"/>${extra}</item>`;
export const rss = (items = item(), title = 'Show') => `<rss><channel><title>${title}</title><language>fa</language>${items}</channel></rss>`;
