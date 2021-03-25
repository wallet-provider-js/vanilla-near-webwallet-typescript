
export const DEFAULT_GAS="200"+"0".repeat(12);

export type U128String = string;

//----------------------
//-- BatchTransaction --
//----------------------
// this classes exists to facilitate the creation of BatchTransactions
// a BatchTransaction is a series of actions *to be executed on a fixed receiver*
// by having this classes we can make typescript help with type-checking and code suggestions
//
export class BatchTransaction {
    items: BatchAction[] = []
    constructor(
        public receiver:string,
    ){}

    addItem(item:BatchAction){
        this.items.push(item)
    }

}

//generic batch-action
export class BatchAction {
    constructor(
        public action: string,
        public attached: U128String = "0",
    ){}
}

export class FunctionCall extends BatchAction{
    public gas:U128String;
    constructor(
        public method:string,
        public args: Record<string,any>,
        gas?: U128String,
        attached?: U128String
    ){
        super("call",attached)
        this.gas = gas||DEFAULT_GAS;
    }

}

export class Transfer extends BatchAction{
    constructor(
        attached:U128String
    ){
        super("transfer",attached)
    }
}

//TODO
//add create-account, delete-account, etc
