import {WalletInterface, EventHandler} from "../wallet-interface.js"
import {BatchTransaction, FunctionCall, Transfer} from "../batch-transaction.js"

//import { getTransactionLastResult } from './providers';
import { WalletConnection,Account } from "near-api-js";
import { getTransactionLastResult } from "near-api-js/lib/providers";
import BN from 'bn.js';

//-----------------------------
//-- SINGLETON WALLET class  --
//-----------------------------
export class NearWebWallet implements WalletInterface {
    
    _isConnected: boolean =false;
    _accountId: string="";
    _network="mainnet"; //default required network. Users will be required to connect accounts from mainnet
    version = 0; //0 until wallet connected

    constructor (
        public walletConnection: WalletConnection,
    )
    {}

    getAccountId():string{
        return this.walletConnection.getAccountId();
    }

    getNetwork(){ return this.walletConnection._near.connection.networkId}
    setNetwork(value:string){ throw Error("can't change network")}

    // Note: Connection is started from the chrome-extension, so web pages don't get any info before the user decides to "connect"
    // Also pages don't need to create buttons/options to connect to different wallets, as long all wallets connect with Dapp-pages by using this API
    // potentially, a single DApp can be used to operate on multiple chains, since all requests are high-level and go thru the chrome-extension

    isConnected() {
        return this.walletConnection.isSignedIn()
    }
   
    disconnect(){
        // console.log("wallet.disconnect") 
        // document.dispatchEvent(new CustomEvent("wallet-disconnected"));
        this.walletConnection.signOut();
        // if (this._isConnected) window.postMessage({dest:"ext",code:"disconnect"},"*"); //inform the extension
        // this._isConnected = false;
        // this._accountId = "";
        // this.version = 0
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
    async view (contract:string, method:string, args:Record<string,any>, options?:any):Promise<any>{

        //wallet.checkConnected()
        //ask the wallet to make the view-call
        return this.walletConnection.account().viewFunction(contract, method, args, options);
    }

    /**
     * A single contract "payable" fn call
     */
    async call(contract:string, method:string, args:Record<string,any>, TGas:number, attachedNEAR:number=0):Promise<any>{
        const rawResult = await this.walletConnection.account().functionCall(contract, method, args, new BN(Math.trunc(TGas*1e12)), new BN(Math.trunc(attachedNEAR*1e6)+"0".repeat(18)));
        return getTransactionLastResult(rawResult);
        // const bt=new BatchTransaction(contract)
        // bt.addItem(new FunctionCall(method,args,TGas,attachedNEAR))
        // return this.apply(bt)
    }

    /**
     * ASYNC. Applies/broadcasts a BatchTransaction to the blockchain
     */
    async apply (bt:BatchTransaction):Promise<any>{
        throw Error("Not implemented");
    }

}
