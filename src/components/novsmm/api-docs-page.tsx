"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, Copy, Check, Terminal, Key, Zap, Shield, Code2 } from "lucide-react";

type DocData = {
  name: string;
  version: string;
  baseUrl: string;
  auth: { type: string; description: string; header: string };
  permissions: Record<string, string>;
  endpoints: Array<{
    method: string;
    path: string;
    description: string;
    permission?: string;
    auth?: boolean;
    body?: any;
    params?: any;
    response?: any;
    notes?: string[];
  }>;
  examples: Record<string, string>;
  rateLimits: Record<string, string>;
  errors: Record<string, string>;
};

const METHOD_COLORS: Record<string, string> = {
  GET: "bg-emerald-500/15 text-emerald-700 border-emerald-500/30",
  POST: "bg-blue-500/15 text-blue-700 border-blue-500/30",
  PUT: "bg-amber-500/15 text-amber-700 border-amber-500/30",
  DELETE: "bg-red-500/15 text-red-700 border-red-500/30",
};

export function ApiDocsClient() {
  const [doc, setDoc] = useState<DocData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/docs")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d) setDoc(d);
        else setError("Failed to load API documentation");
      })
      .catch(() => setError("Failed to load API documentation"))
      .finally(() => setLoading(false));
  }, []);

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (error || !doc) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <p className="text-destructive">{error || "No documentation available"}</p>
          <a href="/" className="mt-4 inline-block text-primary hover:underline">
            Back to home
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <a
              href="/"
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Back to NOVSMM</span>
            </a>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-full border border-border px-3 py-1 text-xs font-medium text-muted-foreground">
              v{doc.version}
            </span>
            <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              {doc.name}
            </span>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
        {/* Hero */}
        <div className="mb-12">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{doc.name}</h1>
          <p className="mt-2 text-lg text-muted-foreground">
            Reseller API v{doc.version} — PerfectPanel-compatible
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm">
              <Terminal className="h-4 w-4 text-primary" />
              <code className="text-foreground">{doc.baseUrl}</code>
            </div>
          </div>
        </div>

        {/* Quick Nav */}
        <div className="mb-12 flex flex-wrap gap-2">
          {["Authentication", "Permissions", "Endpoints", "Examples", "Rate Limits", "Errors"].map((s) => (
            <a
              key={s}
              href={`#${s.toLowerCase().replace(/\s/g, "-")}`}
              className="rounded-full border border-border px-4 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              {s}
            </a>
          ))}
        </div>

        {/* Authentication */}
        <section id="authentication" className="mb-12 scroll-mt-20">
          <div className="flex items-center gap-2">
            <Key className="h-5 w-5 text-primary" />
            <h2 className="text-2xl font-semibold">Authentication</h2>
          </div>
          <div className="mt-4 rounded-2xl border border-border bg-muted/30 p-5">
            <p className="text-sm text-muted-foreground">{doc.auth.description}</p>
            <div className="mt-3 flex items-center gap-2 rounded-lg bg-background px-4 py-3">
              <code className="text-sm text-foreground">{doc.auth.header}</code>
              <button
                onClick={() => copyToClipboard(doc.auth.header, "auth-header")}
                className="btn-press ml-auto text-muted-foreground hover:text-foreground"
                aria-label="Copy"
              >
                {copiedKey === "auth-header" ? (
                  <Check className="h-4 w-4 text-emerald-500" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>
        </section>

        {/* Permissions */}
        <section id="permissions" className="mb-12 scroll-mt-20">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <h2 className="text-2xl font-semibold">Permissions</h2>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {Object.entries(doc.permissions).map(([key, desc]) => (
              <div key={key} className="rounded-xl border border-border p-4">
                <div className="flex items-center gap-2">
                  <span className="rounded-md bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                    {key}
                  </span>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Endpoints */}
        <section id="endpoints" className="mb-12 scroll-mt-20">
          <div className="flex items-center gap-2">
            <Code2 className="h-5 w-5 text-primary" />
            <h2 className="text-2xl font-semibold">Endpoints</h2>
          </div>
          <div className="mt-4 flex flex-col gap-4">
            {doc.endpoints.map((ep, i) => (
              <div
                key={i}
                className="endpoint-card-3d overflow-hidden rounded-2xl border border-border"
                id={`endpoint-${i}`}
              >
                {/* Endpoint header */}
                <div className="flex items-center gap-3 border-b border-border bg-muted/30 px-5 py-3">
                  <span
                    className={`method-badge-3d rounded-md border px-2 py-0.5 text-xs font-bold ${
                      METHOD_COLORS[ep.method] || "bg-muted text-muted-foreground border-border"
                    }`}
                  >
                    {ep.method}
                  </span>
                  <code className="text-sm font-medium text-foreground">{ep.path}</code>
                  {ep.auth === false ? (
                    <span className="ml-auto rounded-full bg-amber-500/10 px-2.5 py-0.5 text-xs text-amber-700">
                      No auth
                    </span>
                  ) : ep.permission ? (
                    <span className="ml-auto rounded-full bg-primary/10 px-2.5 py-0.5 text-xs text-primary">
                      {ep.permission}
                    </span>
                  ) : null}
                </div>

                {/* Endpoint body */}
                <div className="p-5">
                  <p className="text-sm text-muted-foreground">{ep.description}</p>

                  {/* Params */}
                  {ep.params && (
                    <div className="mt-4">
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Query Parameters
                      </h4>
                      <div className="mt-2 rounded-lg border border-border bg-muted/20 p-3">
                        {Object.entries(ep.params).map(([k, v]) => (
                          <div key={k} className="flex gap-2 py-1 text-sm">
                            <code className="font-medium text-primary">{k}</code>
                            <span className="text-muted-foreground">{typeof v === "string" ? v : JSON.stringify(v)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Body */}
                  {ep.body && (
                    <div className="mt-4">
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Request Body
                      </h4>
                      <pre className="code-block-3d mt-2 overflow-x-auto rounded-lg border border-border bg-muted/20 p-3 text-xs">
                        <code>{JSON.stringify(ep.body, null, 2)}</code>
                      </pre>
                    </div>
                  )}

                  {/* Response */}
                  {ep.response && (
                    <div className="mt-4">
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Response
                      </h4>
                      <pre className="code-block-3d mt-2 overflow-x-auto rounded-lg border border-border bg-muted/20 p-3 text-xs">
                        <code>{JSON.stringify(ep.response, null, 2)}</code>
                      </pre>
                    </div>
                  )}

                  {/* Notes */}
                  {ep.notes && ep.notes.length > 0 && (
                    <div className="mt-4">
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Notes
                      </h4>
                      <ul className="mt-2 flex flex-col gap-1">
                        {ep.notes.map((n, ni) => (
                          <li key={ni} className="flex gap-2 text-sm text-muted-foreground">
                            <span className="text-primary">•</span>
                            {n}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Examples */}
        <section id="examples" className="mb-12 scroll-mt-20">
          <div className="flex items-center gap-2">
            <Terminal className="h-5 w-5 text-primary" />
            <h2 className="text-2xl font-semibold">cURL Examples</h2>
          </div>
          <div className="mt-4 flex flex-col gap-3">
            {Object.entries(doc.examples).map(([name, cmd]) => (
              <div key={name} className="overflow-hidden rounded-xl border border-border">
                <div className="flex items-center justify-between border-b border-border bg-muted/30 px-4 py-2">
                  <span className="text-xs font-medium text-muted-foreground">{name}</span>
                  <button
                    onClick={() => copyToClipboard(cmd, `ex-${name}`)}
                    className="btn-press text-muted-foreground hover:text-foreground"
                    aria-label="Copy command"
                  >
                    {copiedKey === `ex-${name}` ? (
                      <Check className="h-4 w-4 text-emerald-500" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </button>
                </div>
                <pre className="code-block-3d overflow-x-auto p-4 text-xs">
                  <code className="text-foreground">{cmd}</code>
                </pre>
              </div>
            ))}
          </div>
        </section>

        {/* Rate Limits */}
        <section id="rate-limits" className="mb-12 scroll-mt-20">
          <div className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            <h2 className="text-2xl font-semibold">Rate Limits</h2>
          </div>
          <div className="mt-4 overflow-hidden rounded-2xl border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="px-5 py-3 text-left font-medium text-muted-foreground">Scope</th>
                  <th className="px-5 py-3 text-left font-medium text-muted-foreground">Limit</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(doc.rateLimits).map(([scope, limit]) => (
                  <tr key={scope} className="border-b border-border/50 last:border-0">
                    <td className="px-5 py-3 font-medium text-foreground">{scope}</td>
                    <td className="px-5 py-3 text-muted-foreground">{limit}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Errors */}
        <section id="errors" className="mb-12 scroll-mt-20">
          <h2 className="text-2xl font-semibold">Error Codes</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {Object.entries(doc.errors).map(([code, desc]) => (
              <div key={code} className="flex items-center gap-3 rounded-xl border border-border p-4">
                <span className="rounded-md bg-red-500/10 px-2.5 py-1 text-sm font-bold text-red-700">
                  {code}
                </span>
                <span className="text-sm text-muted-foreground">{desc}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Footer */}
        <div className="border-t border-border pt-8 text-center">
          <p className="text-sm text-muted-foreground">
            {doc.name} v{doc.version} · PerfectPanel-compatible reseller API
          </p>
          <a
            href="/"
            className="mt-2 inline-block text-sm text-primary hover:underline"
          >
            ← Back to NOVSMM
          </a>
        </div>
      </main>
    </div>
  );
}
