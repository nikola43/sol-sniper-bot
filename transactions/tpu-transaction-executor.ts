import {
    BlockhashWithExpiryBlockHeight,
    Keypair,
    VersionedTransaction
} from '@solana/web3.js';
import { AxiosError } from 'axios';
import { logger } from '../buy';
import { TransactionExecutor } from './transaction-executor.interface';
import { load, DataType, open, close } from 'ffi-rs';
import bs58 from 'bs58';

export class TpuTransactionExecutor implements TransactionExecutor {

    constructor() { }

    public async executeAndConfirm(
        transaction: VersionedTransaction,
        payer: Keypair,
        latestBlockhash: BlockhashWithExpiryBlockHeight,
        simulate: boolean
    ): Promise<{ confirmed: boolean; signature?: string }> {
        const serializedTransaction = transaction.serialize();
        const signatureBase58 = bs58.encode(transaction.signatures[0]);
        let result = false
        try {
            open({
                library: 'tpu_client', // key
                path: "/Users/kasiopea/dev/rust/tpu-sol-test/target/aarch64-apple-darwin/release/libtpu_client.dylib" // path
            })
            const RPC_ENDPOINT="http://asgard-47bd5d56.thornode.io/569f6823761f718d22bfa465614bbf88"
            const RPC_WEBSOCKET_ENDPOINT="ws://asgard-47bd5d56.thornode.io/569f6823761f718d22bfa465614bbf88"
            result = load({
                library: "tpu_client", // path to the dynamic library file
                funcName: 'send_tpu_tx', // the name of the function to call
                retType: DataType.Boolean, // the return value type
                paramsType: [DataType.String, DataType.String, DataType.U8Array, DataType.I32], // the parameter types
                paramsValue: [RPC_ENDPOINT, RPC_WEBSOCKET_ENDPOINT, serializedTransaction, serializedTransaction.length] // the actual parameter values
            })
            console.log({
                result
            })
        } catch (error) {
            if (error instanceof AxiosError) {
                logger.trace({ error: error.response?.data }, 'Failed to execute warp transaction');
            }
        } finally {
            close('tpu_client')
        }

        return { confirmed: result, signature: signatureBase58 };
    }
}
