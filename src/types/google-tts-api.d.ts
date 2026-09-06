declare module 'google-tts-api' {
  export function getAudioUrl(
    text: string,
    options?: {
      lang?: string;
      slow?: boolean;
      host?: string;
      timeout?: number;
    }
  ): string;

  export function getAudioBase64(
    text: string,
    options?: {
      lang?: string;
      slow?: boolean;
      host?: string;
      timeout?: number;
    }
  ): Promise<string>;
}
