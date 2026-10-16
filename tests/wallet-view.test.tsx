import { afterEach, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { WalletView } from "../src/components/wallet/WalletView";
import { getWalletAnalysisFn } from "../src/lib/wallet/wallet.functions";
vi.mock("../src/lib/wallet/wallet.functions", () => ({ getWalletAnalysisFn: vi.fn() }));
afterEach(() => {
  cleanup();
  localStorage.clear();
});
const wallet = "So11111111111111111111111111111111111111112";
const mint = "11111111111111111111111111111111";

it("renders one immutable result consistently in Simple and Terminal modes", async () => {
  const id = "ebd52f1a-80eb-4aa5-9ed1-4c118fc2b650";
  vi.mocked(getWalletAnalysisFn).mockResolvedValue({
    status: "ready",
    job: {
      id,
      wallet,
      mint,
      status: "complete",
      analysis: {
        version: id,
        wallet,
        mint,
        method: "ctrl-fifo-v1",
        accounting: {
          grossPnlUsd: "10",
          netPnlUsd: "7",
          feesUsd: "3",
          knownGrossPnlUsd: "10",
          remainingQuantity: "0",
          eventCount: 2,
          matches: [],
          warnings: [],
        },
        coverage: {
          status: "complete",
          historyExhausted: true,
          transactionCount: 2,
          recordBudget: 2000,
          warnings: [],
        },
        sources: [],
        observedAt: "2026-10-16T00:00:00Z",
        fetchedAt: "2026-10-16T00:01:00Z",
        computedAt: "2026-10-16T00:02:00Z",
        resumeCursor: null,
      },
    },
  });
  render(<WalletView initialAddress={wallet} />);
  fireEvent.change(screen.getByLabelText("Token mint"), { target: { value: mint } });
  fireEvent.click(screen.getByRole("button", { name: "Analyse wallet" }));
  expect(await screen.findByText("$7")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Terminal" }));
  expect(screen.getByText("$7")).toBeTruthy();
  expect(screen.getByText(`Wallet / ${wallet}`)).toBeTruthy();
  expect(screen.getByText(`Token / ${mint}`)).toBeTruthy();
});

it("validates both public keys and never populates an empty wallet with sample results", async () => {
  render(<WalletView />);
  fireEvent.click(screen.getByRole("button", { name: "Analyse wallet" }));
  expect(await screen.findByRole("alert")).toBeTruthy();
  expect(screen.queryByText("Wallet Score")).toBeNull();
});
it("shows an unavailable service honestly after valid submission", async () => {
  vi.mocked(getWalletAnalysisFn).mockResolvedValue({
    status: "unavailable",
    message: "Wallet analysis is not connected yet.",
  });
  render(<WalletView initialAddress={wallet} />);
  fireEvent.change(screen.getByLabelText("Token mint"), { target: { value: mint } });
  fireEvent.click(screen.getByRole("button", { name: "Analyse wallet" }));
  expect(await screen.findByText("Wallet analysis is not connected yet.")).toBeTruthy();
  expect(screen.queryByText("$0.00")).toBeNull();
});
it("persists terminal density and panel visibility, then resets", async () => {
  render(<WalletView />);
  fireEvent.click(screen.getByRole("button", { name: "Terminal" }));
  fireEvent.change(screen.getByLabelText("Density"), { target: { value: "compact" } });
  fireEvent.click(screen.getByLabelText("Show evidence"));
  await waitFor(() =>
    expect(JSON.parse(localStorage.getItem("ctrl:wallet-layout:v1")!)).toMatchObject({
      mode: "terminal",
      density: "compact",
      evidence: false,
    }),
  );
  fireEvent.click(screen.getByRole("button", { name: "Reset layout" }));
  await waitFor(() =>
    expect(JSON.parse(localStorage.getItem("ctrl:wallet-layout:v1")!).mode).toBe("simple"),
  );
});

it("ignores a response from an older wallet request", async () => {
  let oldReply: (value: { status: "error"; message: string }) => void = () => {};
  vi.mocked(getWalletAnalysisFn).mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        oldReply = resolve;
      }),
  );
  render(<WalletView initialAddress={wallet} />);
  fireEvent.change(screen.getByLabelText("Token mint"), { target: { value: mint } });
  const form = screen.getByRole("button", { name: "Analyse wallet" }).closest("form")!;
  fireEvent.submit(form);
  vi.mocked(getWalletAnalysisFn).mockResolvedValueOnce({
    status: "error",
    message: "Current request",
  });
  fireEvent.submit(form);
  expect(await screen.findByText("Current request")).toBeTruthy();
  await act(async () => oldReply({ status: "error", message: "Stale wallet response" }));
  await waitFor(() => expect(screen.queryByText("Stale wallet response")).toBeNull());
});

it("invalidates pending results when the wallet field changes", async () => {
  let reply: (value: { status: "error"; message: string }) => void = () => {};
  vi.mocked(getWalletAnalysisFn).mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        reply = resolve;
      }),
  );
  render(<WalletView initialAddress={wallet} />);
  fireEvent.change(screen.getByLabelText("Token mint"), { target: { value: mint } });
  fireEvent.click(screen.getByRole("button", { name: "Analyse wallet" }));
  fireEvent.change(screen.getByLabelText("Wallet address"), { target: { value: mint } });
  await act(async () => reply({ status: "error", message: "Old wallet result" }));
  expect(screen.queryByText("Old wallet result")).toBeNull();
});
