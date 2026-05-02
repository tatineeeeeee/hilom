export interface SentEmail {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export interface EmailTransport {
  send: (msg: SentEmail) => Promise<void>;
}
