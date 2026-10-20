import { gql, rpc } from "./_conn.ts";
const head = BigInt((await rpc("eth_blockNumber", [])).result);
const r1 = await gql(`{ chain_metadata { chain_id block_height latest_processed_block num_events_processed is_hyper_sync latest_fetched_block_number timestamp_caught_up_to_head_or_endblock } }`);
console.log("head", head, JSON.stringify(r1).slice(0, 800));
const r2 = await gql(`{ _meta { block { number } } }`);
console.log(JSON.stringify(r2).slice(0, 300));
