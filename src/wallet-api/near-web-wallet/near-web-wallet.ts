import {WalletInterface, EventHandler} from "../wallet-interface"
import {BatchTransaction, U128String, DEFAULT_GAS} from "../batch-transaction"

import { WalletConnection } from "near-api-js";
import { getTransactionLastResult } from "near-api-js/lib/providers";
import BN from 'bn.js';

//-----------------------------
// WalletInterface implementation
// for the NEAR Web Wallet
//-----------------------------
export class NearWebWallet implements WalletInterface {
    
    constructor (
        public walletConnection: WalletConnection,
    )
    {}

    getAccountId():string{
        return this.walletConnection.getAccountId();
    }

    getNetwork(){ return this.walletConnection._near.connection.networkId}

    setNetwork(value:string){ throw Error("can't change networkId")}

    isConnected() {
        return this.walletConnection.isSignedIn()
    }
   
    disconnect(){
        this.walletConnection.signOut();
    }

    connectionHelp(){
        window.open("https://wallet.near.org/")
    }

    /**
     * isConnected or trhrows "wallet not connected"
     */
    checkConnected() {
        if (!this.walletConnection?.isSignedIn()) {
            throw Error("Wallet is not connected")
        }
    }

    /**
     * Just a single contract "view" call
     */
    async view (contract:string, method:string, args:Record<string,any>):Promise<any>{
        return this.walletConnection.account().viewFunction(contract, method, args);
    }

    /**
     * A single contract "payable" fn call
     */
    async call(contract:string, method:string, args:Record<string,any>, gas?:string, attachedYoctos?:string):Promise<any>{
        const rawResult = await this.walletConnection.account().functionCall(contract, method, args, new BN(gas||DEFAULT_GAS), new BN(attachedYoctos||"0"));
        return getTransactionLastResult(rawResult);
    }

    /**
     * ASYNC. sends a BatchTransaction to the blockchain
     */
    async apply (bt:BatchTransaction):Promise<any>{
        //TODO - implement BatchTransactions
        throw Error("Not implemented");
    }

}
