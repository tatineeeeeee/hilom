import { z } from "zod";

export const paymongoWebhookSchema = z.object({
  data: z.object({
    id: z.string().min(1),
    attributes: z.object({
      type: z.string().min(1),
      data: z
        .object({
          id: z.string().optional(),
          attributes: z
            .object({
              payment_intent_id: z.string().optional(),
              status: z.string().optional(),
            })
            .optional(),
        })
        .optional(),
    }),
  }),
});

export type PaymongoWebhookEvent = z.infer<typeof paymongoWebhookSchema>;
