import {
  BlockhashWithExpiryBlockHeight,
  Keypair,
  PublicKey,
  SystemProgram,
  TransactionMessage,
  VersionedTransaction,
} from '@solana/web3.js';
import { TransactionExecutor } from './transaction-executor.interface';

import axios, { AxiosError } from 'axios';
import bs58 from 'bs58';
import { Currency, CurrencyAmount } from '@raydium-io/raydium-sdk';
import { logger } from '../buy';

export class WarpTransactionExecutor implements TransactionExecutor {
  private readonly warpFeeWallet = new PublicKey('WARPzUMPnycu9eeCZ95rcAUxorqpBqHndfV3ZP5FSyS');

  constructor(private readonly warpFee: string) { }

  public async executeAndConfirm(
    transaction: VersionedTransaction,
    payer: Keypair,
    latestBlockhash: BlockhashWithExpiryBlockHeight,
    simulate: boolean
  ): Promise<{ confirmed: boolean; signature?: string }> {
    logger.debug('Executing transaction...');

    try {
      const fee = new CurrencyAmount(Currency.SOL, this.warpFee, false).raw.toNumber();
      const warpFeeMessage = new TransactionMessage({
        payerKey: payer.publicKey,
        recentBlockhash: latestBlockhash.blockhash,
        instructions: [
          SystemProgram.transfer({
            fromPubkey: payer.publicKey,
            toPubkey: this.warpFeeWallet,
            lamports: fee,
          }),
        ],
      }).compileToV0Message();

      const warpFeeTx = new VersionedTransaction(warpFeeMessage);
      warpFeeTx.sign([payer]);

      const response = await axios.post<{ confirmed: boolean; signature: string, error?: string }>(
        'https://tx.warp.id/transaction/execute',
        {
          transactions: [bs58.encode(warpFeeTx.serialize()), bs58.encode(transaction.serialize())],
          latestBlockhash,
        },
        {
          timeout: 100000,
        },
      );

      return response.data;
    } catch (error) {
      logger.error(error, "executeAndConfirm");
      if (error instanceof AxiosError) {
        logger.trace({ error: error.response?.data }, 'Failed to execute warp transaction');
      }
    }

    return { confirmed: false };
  }
}
