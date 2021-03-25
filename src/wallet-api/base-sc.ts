//-----------------------------
// Base smart-contract class
// provides constructor, view & call methods
// derive your specific contract proxy from this class
//-----------------------------

import {WalletInterface} from "./wallet-interface.js"

type yoctos = string

//singleton class
export class SmartContract {
    
    constructor( 
        public contractId:string, 
        public wallet:WalletInterface
    )
    {}

    view(method:string, args?:any) : Promise<any> {
        if (!this.wallet) throw Error(`contract-proxy not connected ${this.contractId} trying to view ${method}`)
        return this.wallet.view(this.contractId,method,args)
    }

    //default gas is 100T
    call(method:string, args:any, TGas:number=100, nearsToDeposit:number=0) : Promise<any> {
        if (!this.wallet) throw Error(`contract-proxy not connected ${this.contractId} trying to call ${method}`)
        return this.wallet.call(this.contractId, method, args, TGas, nearsToDeposit)
    }
}

