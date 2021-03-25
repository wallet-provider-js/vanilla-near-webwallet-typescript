import {SmartContract} from "../wallet-api/base-smart-contract"

//singleton class
export class GreetingContract extends SmartContract {

    setGreeting(greeting:string): Promise<string> {
        return this.call("setGreeting", {message: greeting})
    }

    getGreeting(accountId:string):Promise<string> {
        return this.view("getGreeting", { accountId: accountId })
    };

}
