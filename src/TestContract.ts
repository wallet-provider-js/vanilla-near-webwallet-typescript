export interface TestContract {
    contractId:string;
    setGreeting(params:any):string;
    getGreeting(params:any):string;
}