/**
 * Records a short clip from the microphone for a custom horn. Needs https (or
 * localhost) and the player's permission.
 */
export const RECORD_MAX_S = 3;

export interface Recording {
  /** Stop early; the clip is delivered through `done`. */
  stop(): void;
  readonly done: Promise<string>;
}

export const canRecord = (): boolean =>
  typeof navigator !== 'undefined' &&
  typeof navigator.mediaDevices?.getUserMedia === 'function' &&
  typeof MediaRecorder !== 'undefined';

const toDataUrl = (blob: Blob) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error('read failed'));
    reader.readAsDataURL(blob);
  });

export async function startRecording(): Promise<Recording> {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const recorder = new MediaRecorder(stream);
  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };
  const done = new Promise<string>((resolve, reject) => {
    recorder.onstop = () => {
      stream.getTracks().forEach((t) => t.stop());
      const type = (recorder.mimeType || 'audio/webm').split(';')[0] ?? 'audio/webm';
      toDataUrl(new Blob(chunks, { type })).then(resolve, reject);
    };
    recorder.onerror = () => reject(new Error('recording failed'));
  });
  recorder.start();
  const timer = setTimeout(() => stop(), RECORD_MAX_S * 1000);
  function stop() {
    clearTimeout(timer);
    if (recorder.state !== 'inactive') recorder.stop();
  }
  return { stop, done };
}
