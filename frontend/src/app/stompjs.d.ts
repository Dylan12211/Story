declare module 'stompjs' {
  export interface Frame {
    body: string;
  }

  export interface Subscription {
    unsubscribe(): void;
  }

  export interface Client {
    connected: boolean;
    debug: ((message: string) => void) | null;
    connect(
      headers: Record<string, string>,
      connectCallback: (frame?: Frame) => void,
      errorCallback?: (error?: unknown) => void
    ): void;
    disconnect(disconnectCallback?: () => void): void;
    subscribe(
      destination: string,
      callback: (message: Frame) => void
    ): Subscription;
  }

  export function over(socket: unknown): Client;

  const Stomp: {
    over: typeof over;
  };

  export default Stomp;
}
