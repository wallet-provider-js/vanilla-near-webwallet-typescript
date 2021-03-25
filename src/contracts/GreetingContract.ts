import {SmartContract} from "../wallet-api/base-sc"

//singleton class
export class GreetingContract extends SmartContract {

    setGreeting(params:any): Promise<string> {
        return this.call("setGreeting", params, 25,0)
    }

    getGreeting(params:any):Promise<string> {
        return this.view("getGreeting", params)
    };

}
