// HTTP API docs (developers/http-api/market-data, /trading): unknown or malformed symbols on
// /v0/orderbooks, /v0/tickers and /v0/orders are "silently skipped", and the comma-joined form
// "is silently skipped, so the response is []". What the API actually returns:
for (const base of ["https://stg.api.dreamdex.io/v0", "https://api.dreamdex.io/v0"]) {
  for (const q of [
    "/orderbooks?symbols=SOMI:USDso,WETH:USDso",
    "/orderbooks?symbols=SOMI:USDso&symbols=NOPE:USDso",
    "/tickers?symbols=SOMI:USDso&symbols=NOPE:USDso",
    "/orderbooks?symbols=SOMI:USDso",
  ]) {
    const r = await fetch(base + q);
    const body = await r.text();
    console.log(`GET ${base}${q}\n  -> ${r.status} Error-Name=${r.headers.get("error-name") ?? "-"} ${body.slice(0, 160)}${body.length > 160 ? "…" : ""}`);
  }
}
