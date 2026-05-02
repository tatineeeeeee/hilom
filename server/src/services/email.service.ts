import { transport } from "./email/transport";
import type { SentEmail } from "./email/types";

export const sendEmail = (msg: SentEmail): Promise<void> => transport.send(msg);

export { _testCapture } from "./email/transport";
