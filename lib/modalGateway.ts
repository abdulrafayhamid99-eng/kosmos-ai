const endpoints = {
  dispatch: 'MODAL_PIPELINE_URL',
  status: 'MODAL_STATUS_URL',
  download: 'MODAL_DOWNLOAD_URL',
} as const;

export function modalEndpoint(kind: keyof typeof endpoints) {
  const value = process.env[endpoints[kind]];
  if (!value) throw new Error('The protected render worker is not configured.');
  return new URL(value);
}

export function modalHeaders() {
  const key = process.env.MODAL_PROXY_KEY;
  const secret = process.env.MODAL_PROXY_SECRET;
  if (!key || !secret) throw new Error('The protected render worker is not configured.');
  return { 'Modal-Key': key, 'Modal-Secret': secret };
}

export const validRenderId = (id: string) => /^[a-zA-Z0-9_-]{1,100}$/.test(id);

export function supportedSource(value: string) {
  if (/^data:video\/[a-z0-9.+-]+;base64,[a-z0-9+/=]+$/i.test(value)) return true;
  try {
    const url = new URL(value);
    return url.origin === 'https://raw.githubusercontent.com'
      && !url.username && !url.password && !url.search && !url.hash
      && url.pathname.startsWith('/intel-iot-devkit/sample-videos/master/')
      && /^[-A-Za-z0-9_]+\.mp4$/.test(url.pathname.split('/').pop() ?? '');
  } catch {
    return false;
  }
}
