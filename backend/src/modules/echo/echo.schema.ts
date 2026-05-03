import { z } from "zod";

export const echoSchema = z.object({
  body: z.object({
    message: z.string().min(1, "message is required"),
  }),
});

export type EchoBody = z.infer<typeof echoSchema>["body"];
