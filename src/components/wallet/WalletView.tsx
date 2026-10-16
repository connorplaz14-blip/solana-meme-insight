import { useEffect, useRef, useState, type FormEvent } from "react";
import { ArrowUpRight, Check, SlidersHorizontal } from "lucide-react";
import { getWalletAnalysisFn } from "@/lib/wallet/wallet.functions";
import { parseWalletRequest, type WalletJob, type WalletRequest } from "@/lib/wallet/contracts";
import { defaults, readPreferences, type WalletPreferences } from "@/lib/wallet/preferences";

const storageKey = "ctrl:wallet-layout:v1";
const money = (value: string | null) => (value === null ? "Unavailable" : `$${value}`);
const humanize = (value: string) => value.replaceAll("_", " ");

export function WalletView({ initialAddress = "" }: { initialAddress?: string } = {}) {
  const [wallet, setWallet] = useState(initialAddress);
  const [mint, setMint] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [preferences, setPreferences] = useState<WalletPreferences>({ ...defaults });
  const [preferencesReady, setPreferencesReady] = useState(false);
  const [job, setJob] = useState<WalletJob | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const generation = useRef(0);
  const request = useRef<WalletRequest | null>(null);
  useEffect(() => {
    try {
      setPreferences(readPreferences(localStorage.getItem(storageKey)));
    } catch {
      /* Private browsing may disable storage. */
    }
    setPreferencesReady(true);
    return () => {
      generation.current += 1;
    };
  }, []);
  useEffect(() => {
    if (preferencesReady) {
      try {
        localStorage.setItem(storageKey, JSON.stringify(preferences));
      } catch {
        /* Layout still works in memory. */
      }
    }
  }, [preferences, preferencesReady]);
  useEffect(() => {
    generation.current += 1;
    setJob(null);
    setMessage("");
    setBusy(false);
    request.current = null;
    setWallet(initialAddress);
  }, [initialAddress]);

  const jobId = job?.id;
  const jobStatus = job?.status;
  useEffect(() => {
    if (!jobId || !jobStatus || !["queued", "running"].includes(jobStatus) || !request.current)
      return;
    const current = generation.current;
    const context = { ...request.current, jobId };
    let cancelled = false;
    let attempts = 0;
    let timer: ReturnType<typeof setTimeout>;
    const poll = async () => {
      try {
        const result = await getWalletAnalysisFn({ data: context });
        if (cancelled || current !== generation.current) return;
        if (result.status !== "ready") {
          setMessage(result.message);
          return;
        }
        setJob(result.job);
        if (["queued", "running"].includes(result.job.status)) {
          attempts += 1;
          if (attempts < 60) timer = setTimeout(poll, 2000);
          else
            setMessage(
              "This analysis is taking longer than expected. Its version remains in the queue.",
            );
        }
      } catch {
        if (!cancelled && current === generation.current)
          setMessage("Could not read the analysis status. Try again shortly.");
      }
    };
    timer = setTimeout(poll, 2000);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [jobId, jobStatus]);

  function invalidateIdentity() {
    generation.current += 1;
    request.current = null;
    setJob(null);
    setMessage("");
    setBusy(false);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    const current = ++generation.current;
    setMessage("");
    setJob(null);
    let input: WalletRequest;
    try {
      input = parseWalletRequest({ wallet, mint, accessToken, requestKey: crypto.randomUUID() });
    } catch {
      setMessage("Enter a valid Solana wallet address and token mint.");
      return;
    }
    request.current = input;
    setBusy(true);
    try {
      const result = await getWalletAnalysisFn({ data: input });
      if (current !== generation.current) return;
      if (result.status === "ready") setJob(result.job);
      else setMessage(result.message);
    } catch {
      if (current === generation.current)
        setMessage("Analysis could not be verified. No sample result was substituted.");
    } finally {
      if (current === generation.current) setBusy(false);
    }
  }
  const analysis = job?.analysis;
  const terminal = preferences.mode === "terminal";
  return (
    <section
      className={`ctrl-wallet ${terminal ? "ctrl-terminal" : ""} ${preferences.density === "compact" ? "ctrl-compact" : ""}`}
    >
      <header className="ctrl-heading">
        <div>
          <p className="ctrl-eyebrow">CTRL INTELLIGENCE / WALLET RESEARCH</p>
          <h1>Follow the evidence.</h1>
          <p className="ctrl-intro">
            Understand the wallet behind the move. Every lot, every fee, every gap.
          </p>
        </div>
        <div className="ctrl-mode" aria-label="Workspace mode">
          {(["simple", "terminal"] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              aria-pressed={preferences.mode === mode}
              onClick={() => setPreferences((p) => ({ ...p, mode }))}
            >
              {mode === "simple" ? "Simple" : "Terminal"}
            </button>
          ))}
        </div>
      </header>
      {terminal && (
        <div className="ctrl-tools">
          <SlidersHorizontal size={14} aria-hidden="true" />
          <label>
            Density{" "}
            <select
              aria-label="Density"
              value={preferences.density}
              onChange={(e) =>
                setPreferences((p) => ({
                  ...p,
                  density: e.target.value as WalletPreferences["density"],
                }))
              }
            >
              <option value="comfortable">Comfortable</option>
              <option value="compact">Compact</option>
            </select>
          </label>
          <label>
            <input
              type="checkbox"
              checked={preferences.lots}
              onChange={(e) => setPreferences((p) => ({ ...p, lots: e.target.checked }))}
            />{" "}
            Show lots
          </label>
          <label>
            <input
              type="checkbox"
              checked={preferences.evidence}
              onChange={(e) => setPreferences((p) => ({ ...p, evidence: e.target.checked }))}
            />{" "}
            Show evidence
          </label>
          <button type="button" onClick={() => setPreferences({ ...defaults })}>
            Reset layout
          </button>
        </div>
      )}
      <form className="ctrl-lookup" onSubmit={submit} noValidate>
        <div className="ctrl-form-fields">
          <label>
            Wallet address
            <input
              aria-label="Wallet address"
              autoComplete="off"
              spellCheck={false}
              value={wallet}
              onChange={(e) => {
                invalidateIdentity();
                setWallet(e.target.value);
              }}
              placeholder="Solana public address"
            />
          </label>
          <label>
            Token mint
            <input
              aria-label="Token mint"
              autoComplete="off"
              spellCheck={false}
              value={mint}
              onChange={(e) => {
                invalidateIdentity();
                setMint(e.target.value);
              }}
              placeholder="Token contract address"
            />
          </label>
        </div>
        <div className="ctrl-form-footer">
          <details>
            <summary>Private preview access</summary>
            <label>
              Access code
              <input
                aria-label="Access code"
                type="password"
                autoComplete="off"
                value={accessToken}
                onChange={(e) => setAccessToken(e.target.value)}
              />
            </label>
            <small>Used only for this session. Never saved with your layout.</small>
          </details>
          <button className="ctrl-primary" type="submit" disabled={busy}>
            {busy ? "Starting analysis…" : "Analyse wallet"}
            <ArrowUpRight size={16} aria-hidden="true" />
          </button>
        </div>
      </form>
      {message && (
        <div className="ctrl-notice" role="alert">
          {message}
        </div>
      )}
      {job && (
        <div className="ctrl-version" role="status">
          <span className="ctrl-status">
            {job.status === "complete" ? <Check size={13} /> : null}
            {job.status === "failed" ? "Analysis unavailable" : humanize(job.status)}
          </span>
          <span>VERSION {job.id}</span>
        </div>
      )}
      {job?.status === "failed" && (
        <p className="ctrl-notice">
          The provider-backed analysis could not finish. No figures have been invented.
        </p>
      )}
      {analysis ? (
        <>
          <div className="ctrl-version" aria-label="Result identity">
            <span>Wallet / {analysis.wallet}</span>
            <span>Token / {analysis.mint}</span>
          </div>
          <div className="ctrl-metrics">
            <article>
              <span>Realised net P&amp;L</span>
              <strong>{money(analysis.accounting.netPnlUsd)}</strong>
              <small>FIFO after known costs</small>
            </article>
            <article>
              <span>Realised gross P&amp;L</span>
              <strong>{money(analysis.accounting.grossPnlUsd)}</strong>
              <small>Before allocated fees</small>
            </article>
            <article>
              <span>Observed fees</span>
              <strong>{money(analysis.accounting.feesUsd)}</strong>
              <small>Unknown USD costs stay unavailable</small>
            </article>
            <article>
              <span>Supported events</span>
              <strong>{analysis.accounting.eventCount}</strong>
              <small>{analysis.coverage.transactionCount} records examined</small>
            </article>
          </div>
          <div className="ctrl-coverage">
            <div>
              <p className="ctrl-eyebrow">COVERAGE</p>
              <h2>
                {analysis.coverage.status === "partial"
                  ? "The gaps are part of the result."
                  : "Evidence checked."}
              </h2>
            </div>
            <p>
              Observed{" "}
              {analysis.observedAt
                ? new Date(analysis.observedAt).toLocaleString()
                : "time unavailable"}
              . Fetched{" "}
              {analysis.fetchedAt
                ? new Date(analysis.fetchedAt).toLocaleString()
                : "time unavailable"}
              .<br />
              {analysis.coverage.historyExhausted
                ? "Provider history exhausted."
                : "History remains incomplete."}{" "}
              This is not a lifetime performance claim.
            </p>
            <ul>
              {analysis.coverage.warnings.map((w) => (
                <li key={w}>{humanize(w)}</li>
              ))}
            </ul>
          </div>
          {(preferences.lots || !terminal) && (
            <section className="ctrl-panel">
              <header>
                <h2>FIFO lot matches</h2>
                <span>{analysis.accounting.matches.length} matches</span>
              </header>
              {analysis.accounting.matches.length === 0 ? (
                <p className="ctrl-empty">
                  No supported closed lots were reconstructed. This does not mean the wallet has
                  never traded.
                </p>
              ) : (
                <div className="ctrl-table-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th>Quantity</th>
                        <th>Acquired cost</th>
                        <th>Proceeds</th>
                        <th>Net P&amp;L</th>
                        <th>Evidence</th>
                      </tr>
                    </thead>
                    <tbody>
                      {analysis.accounting.matches.map((m) => (
                        <tr key={m.closed_lot_match_id}>
                          <td>{m.matched_quantity}</td>
                          <td>{money(m.cost_basis_usd)}</td>
                          <td>{money(m.proceeds_usd)}</td>
                          <td>{money(m.realized_pnl_usd)}</td>
                          <td>
                            <a
                              href={`https://solscan.io/tx/${encodeURIComponent(m.entry_signature)}`}
                              target="_blank"
                              rel="noreferrer"
                            >
                              Entry ↗
                            </a>
                            <a
                              href={`https://solscan.io/tx/${encodeURIComponent(m.exit_signature)}`}
                              target="_blank"
                              rel="noreferrer"
                            >
                              Exit ↗
                            </a>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          )}
          {(preferences.evidence || !terminal) && (
            <section className="ctrl-panel">
              <header>
                <h2>Why this result?</h2>
                <span>{analysis.method}</span>
              </header>
              <p>
                FIFO matches the earliest observed acquisition first. USD results require historical
                prices, acquired basis and fees. Unsupported activity and unknown values remain
                visible.
              </p>
              <ul className="ctrl-sources">
                {analysis.sources.map((source, index) => (
                  <li key={`${source.payloadHash}:${index}`}>
                    <strong>{source.provider}</strong>
                    <span>
                      {source.recordCount} records · {source.parserVersion}
                    </span>
                    <code title={source.payloadHash}>{source.payloadHash.slice(0, 20)}…</code>
                    <time>{new Date(source.fetchedAt).toLocaleString()}</time>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      ) : (
        !job &&
        !message && (
          <div className="ctrl-start">
            <span className="ctrl-outline-mark">CTRL</span>
            <h2>Know what you are following.</h2>
            <p>
              Choose a wallet and token to trace its acquired lots and closed positions. Results
              include source timestamps and coverage, so missing history is never mistaken for zero.
            </p>
            <div>
              <span>01 / Public addresses only</span>
              <span>02 / Transaction evidence</span>
              <span>03 / No trading or signing</span>
            </div>
          </div>
        )
      )}
      <footer className="ctrl-footnote">
        TAKE CTRL <span>Read-only research. No trade execution.</span>
      </footer>
    </section>
  );
}
