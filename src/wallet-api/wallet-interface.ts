import {U128String, BatchTransaction, FunctionCall, Transfer} from "./batch-transaction.js"

export type EventHandler = (this:Document,ev:any)=>any;

//helper to check wallet version
export function semver(major:number,minor:number,version:number){return major*1e6+minor*1e3+version}

//-----------------------
//-- WALLET Interface  --
//-----------------------
export interface WalletInterface {
    
    getAccountId():string;

    getNetwork():string;
    setNetwork(value:string):void;

    isConnected():boolean;
   
    disconnect():void;

    /**
     * isConnected or trhrows "wallet not connected"
     */
    checkConnected():void;

    /**
     * Just a single contract "view" call
     */
    view (contract:string, method:string, args:Record<string,any>):Promise<any>;

    /**
     * A single contract "payable" fn call
     */
    call(contract:string, method:string, args:Record<string,any>, gas?:U128String, attachedYoctos?:U128String):Promise<any>;

    /**
     * ASYNC. sends a BatchTransaction to the blockchain
     */
    apply (bt:BatchTransaction):Promise<any>;

}
