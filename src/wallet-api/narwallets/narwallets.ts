import {WalletInterface, EventHandler, semver} from "../wallet-interface"
import {BatchTransaction, U128String, FunctionCall, Transfer} from "../batch-transaction"

//-------------------------------
// WalletInterface implementation
// for Narwallet-chrome-extension
//-------------------------------

//-----------------------------
//-- SINGLETON WALLET class  --
//-----------------------------
export class Narwallet implements WalletInterface {
    
    _isConnected: boolean =false;
    _accountId: string="";
    _network="mainnet"; //default required network. Users will be required to connect accounts from mainnet
    version = 0; //0 until wallet connected

    getAccountId():string{
        return this._accountId;
    }

    getNetwork(){ return this._network }
    setNetwork(value:string){ this._network = value;}

    // Note: Connection is started from the chrome-extension, so web pages don't get any info before the user decides to "connect"
    // Also pages don't need to create buttons/options to connect to different wallets, as long all wallets connect with Dapp-pages by using this API
    // potentially, a single DApp can be used to operate on multiple chains, since all requests are high-level and go thru the chrome-extension

    isConnected() {return this._isConnected}
   
    disconnect(){
        //console.log("wallet.disconnect") 
        document.dispatchEvent(new CustomEvent("wallet-disconnected"));
        if (this._isConnected) window.postMessage({dest:"ext",code:"disconnect"},"*"); //inform the extension
        this._isConnected = false;
        this._accountId = "";
        this.version = 0
    }

    connectionHelp(){
        window.open("http://www.narwallets.com/help/connect-to-web-app")
    }

    /**
     * isConnected or trhrows "wallet not connected"
     */
    checkConnected() {
        if (!this._isConnected) {
            throw Error("Wallet is not connected. Open the wallet extension and click 'Connect to Web Page'")
        }
    }

    /**
     * Just a single contract "view" call
     */
    async view (contract:string, method:string, args:Record<string,any>):Promise<any>{

        narwallet.checkConnected()
        //ask the extension to make the view-call
        const requestPayload={dest:"ext", code:"view", contract:contract, method:method, args:args}
        return backgroundRequest(requestPayload);
    }

    /**
     * A single contract "payable" fn call
     */
    async call(contract:string, method:string, args:Record<string,any>, gas?:U128String, attached?:U128String):Promise<any>{
        const bt=new BatchTransaction(contract)
        bt.addItem(new FunctionCall(method,args,gas,attached))
        return this.apply(bt)
    }

    /**
     * ASYNC. Applies/broadcasts a BatchTransaction to the blockchain
     */
    async apply (bt:BatchTransaction):Promise<any>{

        narwallet.checkConnected()
        
        //ask the extension to broadcast the transaction
        //register request. Promise will be resolved when the response arrives
        const requestPayload={dest:"ext", code:"apply", tx:bt}
        return backgroundRequest(requestPayload);
    }

}
//-----------------
// SINGLETON EXPORT
//-----------------
export let narwallet = new Narwallet();

//----------------------------------------
//-- Add all listeners
export function addNarwalletsListeners(onConnect:EventHandler,OnDisconnect:EventHandler){
    addGeneralListener()
    addOnConnectListener(onConnect)
    addOnDisconnectListener(OnDisconnect)
}
//----------------------------------------------------
//-- LISTEN to "message" from injected content script
//-- msg path is ext-> content-script-> here-> dispatchEvent("wallet-connected"|"wallet-disconnected"|"wallet-event")
//-- process by raising 'wallet-event'  
//----------------------------------------------------
export function addGeneralListener(){
    window.addEventListener("message", 
        function(event) {
            //console.log("wallet-ts messagelistener",event.data.dest, event.data);
            if (event.source != window) return; //only internal messages (from the injected content script)
            if (event.data.dest!="page") return; //only messages destined to this web page (DApp) 
            msgReceivedFromContentScript(event.data)
        }
        , false)
    ;
}
//to add connect event listener
export function addOnConnectListener(handler:EventHandler){
    document.addEventListener<any>("wallet-connected",handler)
}
//to add disconnect event listener
export function addOnDisconnectListener(handler:EventHandler){
    document.addEventListener<any>("wallet-disconnected",handler)
}

function msgReceivedFromContentScript(msg:Record<string,any>){
    
    //console.log("msg ext->page: " + JSON.stringify(msg));

    //handle connect and disconnect
    if (msg.code=="connect"){
        //capture wallet version, default 1.0.2
        narwallet.version=msg.data?.version||semver(1,0,2);
        //prepare response
        const wnet = narwallet.getNetwork();
        const response={dest:"ext", code:"connected", relayer:"wallet-api", version:"0.1", network:wnet, err:""}
        if (wnet && (!msg.data || msg.data.network!=wnet)){
            //respond back what network we require
            response.err="The web page requires a "+wnet+" account";
            window.postMessage(response,"*")
            return;
        }
        //turn on connected flags
        narwallet._isConnected = true;
        narwallet._accountId = msg.data.accountId;
        //respond back so the the chrome-extension knows we're listening
        window.postMessage(response,"*")
    }
    else if (msg.code=="disconnect"){
        if (narwallet.isConnected()) {      
            narwallet.disconnect(); //dispatchs event, does it all
        }   
        return;
    }
    else if (msg.code=="request-resolved"){
        //chrome-extension completed a request
        //find & resolve the request by requestId 
        processRequestResolved(msg);
    }

    //Also dispatchEvent to the DApp can react to extension-wallet events
    //like "wallet-connected"|"wallet-disconnected"
    let eventKey:string = eventFromCode(msg.code);
    const eventInfo = 
        new CustomEvent(
            eventKey,
            { detail:{
                source:'ext',
                code: msg.code,
                err: msg.err,
                data: msg.data,
                }
            })
    //console.log("document.dispatchEvent "+ eventInfo.type) 
    document.dispatchEvent(eventInfo);
}

function eventFromCode(code:string):string{
    switch(code){
        case "connect": return "wallet-connected";
        case "disconnect": return "wallet-disconnected";
        default: return 'wallet-event';
    }
}

//called when the resolved msg comes back
function processRequestResolved(msg:any){

    let inx=requests.findIndex(req => req.requestId==msg.requestId);
    if (inx>=0){
        //remove it from the array
        let r=requests.splice(inx,1)[0];
        //reject or resolve promise
        if (msg.err){
            return r.reject(Error(msg.err));
        }
        else {
            return r.resolve(msg.data);
        }
    }
    else {
        console.error("requestId NOT FOUND ",msg)        
    }
    
}

/* ----------------
example event data:
  connected = {
        code: 'connected',
        source:'ext',
        dest:'page',
        err: undefined,
        data: {
            accountId: "${user_account_id}"
        },
  }
*/

//requests made to the extension's background.js
type requestInfo = {
    requestId:number,
    payload: any,
    resolve: Function,
    reject: Function,
}
const requests:requestInfo[]=[];
let requestId=0; //incremental request-id

//result from the extension
export type RequestResult = {
    requestId:number,
    err?:string,
    data?:any,
}

//queue a request, send to the extension via window.postMessage, return a Promise
export function backgroundRequest(requestPayload:any):Promise<any>{
    return new Promise((resolve,reject)=>{
        const request:requestInfo = {requestId:++requestId, payload: requestPayload, reject:reject, resolve:resolve}
        requests.push(request)
        requestPayload.requestId=requestId; //add requestId to payload
        if (!requestPayload.dest) requestPayload.dest="ext";
        //broadcast (injected content script will process it)
        window.postMessage(requestPayload, "*")
    })
}
