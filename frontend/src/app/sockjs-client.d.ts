declare module 'sockjs-client/dist/sockjs' {
  export default class SockJS {
    constructor(
      url: string,
      _reserved?: unknown,
      options?: Record<string, unknown>
    );

    close(): void;
    send(data: string): void;
    onopen: ((event?: unknown) => void) | null;
    onmessage: ((event: { data: string }) => void) | null;
    onclose: ((event?: unknown) => void) | null;
  }
}
