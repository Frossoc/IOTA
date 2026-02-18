module proof_registry::proof_registry {
    use std::ascii;
    use std::string::{Self, String};
    use iota::event;
    use iota::tx_context::{Self, TxContext};

    /// Event emitted when a proof is registered.
    public struct ProofRegistered has copy, drop {
        event_hash: String,
        uri: String,
        schema_version: String,
        adapter: String,
        sender: address,
        ts_ms: u64,
    }

    /// Minimal MVP entrypoint for proof registration.
    public entry fun register_proof(
        event_hash: vector<u8>,
        uri: vector<u8>,
        schema_version: vector<u8>,
        adapter: vector<u8>,
        ctx: &mut TxContext,
    ) {
        assert!(!vector::is_empty(&event_hash), 0);
        assert!(!vector::is_empty(&uri), 1);
        assert!(!vector::is_empty(&schema_version), 2);
        assert!(!vector::is_empty(&adapter), 3);

        let proof_event = ProofRegistered {
            event_hash: string::utf8(event_hash),
            uri: string::utf8(uri),
            schema_version: string::utf8(schema_version),
            adapter: string::utf8(adapter),
            sender: tx_context::sender(ctx),
            ts_ms: tx_context::epoch_timestamp_ms(ctx),
        };

        event::emit(proof_event);
    }
}
