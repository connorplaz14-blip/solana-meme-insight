import { createServerFn } from "@tanstack/react-start";
import { parseWalletRequest } from "./contracts";

export const getWalletAnalysisFn = createServerFn({ method: "POST" })
  .validator(parseWalletRequest)
  .handler(async ({ data }) => {
    const { requestWalletJob } = await import("./client.server");
    return requestWalletJob(data);
  });
