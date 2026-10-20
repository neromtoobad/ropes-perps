// Boot the Crag engine with the server, so the wall is warm before the first visitor.
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { wireLinks } = await import("./server/links");
  wireLinks();
}
