import { createServerFn } from "@tanstack/react-start";
import type { SocialPulse } from "./social-pulse.server";

export const getSocialPulseFn = createServerFn({ method: "GET" })
  .inputValidator((d: { force?: boolean } | undefined) => ({
    force: Boolean(d?.force ?? false),
  }))
  .handler(async ({ data }): Promise<SocialPulse> => {
    const { getSocialPulse } = await import("./social-pulse.server");
    return getSocialPulse(data.force);
  });