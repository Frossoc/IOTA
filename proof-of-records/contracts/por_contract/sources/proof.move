module por_contract::proof {
    use iota::object::{Self, UID};
    use iota::transfer;
    use iota::tx_context::TxContext;

    struct Proof has key, store {
        id: UID,
        event_hash: vector<u8>,
        uri: vector<u8>,
        issuer: address,
        timestamp: u64,
    }

    public entry fun register_proof(
        event_hash: vector<u8>,
        uri: vector<u8>,
        issuer: address,
        timestamp: u64,
        ctx: &mut TxContext,
    ) {
        let proof = Proof {
            id: object::new(ctx),
            event_hash,
            uri,
            issuer,
            timestamp,
        };

        transfer::public_transfer(proof, issuer);
    }
}
