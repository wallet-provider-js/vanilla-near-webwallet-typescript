import { connect, Contract, keyStores, Near, WalletConnection } from 'near-api-js'
import { getConfig } from './config'

import {GreetingContract} from './contracts/GreetingContract'

import { WalletInterface } from './wallet-api/wallet-interface';
import { NearWebWallet } from './wallet-api/near-web-wallet/near-web-wallet';
import { narwallets, addNarwalletsListeners } from './wallet-api/narwallets/narwallets';

//shortcut for document.querySelector
function qs(selector:string):HTMLElement{ return document.querySelector(selector) as HTMLElement}

//get global config
const nearConfig = getConfig(process.env.NODE_ENV || 'development')

// global variables used throughout
let currentGreeting:string; 
let walletConnection:WalletConnection;
let contract:GreetingContract;

const submitButton = document.querySelector('form button') as HTMLButtonElement

//connect wallet selection boxes
qs('#near-web-wallet-box').onclick = loginNearWebWallet
qs('#narwallets-wallet-box').onclick = loginNarwallets
//connect Sign-out link
qs('#sign-out-button').onclick = logoutNearWebWallet

//the user submits a new greeting
qs('form').onsubmit = 
async function(event) {
  event.preventDefault()

  // get elements from the form using their id attribute
  const {fieldset,greeting} = event.target as HTMLFormElement

  // disable the form while the value gets updated on-chain
  fieldset.disabled = true

  try {
      // make an update call to the smart contract
      // pass the value that the user entered in the greeting field
      await contract.setGreeting(greeting.value);
      //if ok...
      showNotification();
      // disable the save button, since it now matches the persisted value
      submitButton.disabled = true
      // update the greeting in the UI
      await fetchGreeting()
  } 
  catch (ex) {
    showErr(ex.message);
  } 
  finally {
    // re-enable the form, whether the call succeeded or failed
    fieldset.disabled = false
  }
}

function showNotification(){
  // show notification
  qs('[data-behavior=notification]').style.display = 'block'
  // remove notification again after css animation completes
  // this allows it to be shown again next time the form is submitted
  setTimeout(() => {
    qs('[data-behavior=notification]').style.display = 'none'
  }, 11000)
}

function showErr(msg:string){
    // show notification
    qs('#err-msg').innerText = msg
    qs('#err-msg-aside').style.display = 'block'
    // remove notification again after css animation completes
    // this allows it to be shown again next time the form is submitted
    setTimeout(() => {
      qs('[data-behavior=notification]').style.display = 'none'
    }, 10000)
}

//while the user types in the input-field
qs('input#greeting').oninput = 
function(event:Event) {
  if ((event.target as HTMLInputElement).value !== currentGreeting) {
    submitButton.disabled = false
  } else {
    submitButton.disabled = true
  }
}

// Display the signed-out-flow container
function signedOutFlow() {
  qs('#signed-in-flow').style.display = 'none'
  qs('#signed-out-flow').style.display = 'block'
}

// Displaying the signed in flow container and fill in account-specific data
function signedInFlow() {
  qs('#signed-out-flow').style.display = 'none'
  qs('#signed-in-flow').style.display = 'block'

  // Getting the Account ID. If still unauthorized, it's just empty string
  const accountId = contract.wallet.getAccountId()

  document.querySelectorAll('[data-behavior=account-id]').forEach(el => {
    (el as HTMLElement).innerText = accountId
  })

  // populate links in the notification box
  const accountLink = qs('[data-behavior=notification] a:nth-of-type(1)') as HTMLLinkElement
  accountLink.href = accountLink.href + accountId
  accountLink.innerText = '@' + accountId
  const contractLink = document.querySelector('[data-behavior=notification] a:nth-of-type(2)') as HTMLLinkElement
  contractLink.href = contractLink.href + contract.contractId
  contractLink.innerText = '@' + contract.contractId

  // update with selected networkId
  accountLink.href = accountLink.href.replace('testnet', nearConfig.networkId)
  contractLink.href = contractLink.href.replace('testnet', nearConfig.networkId)

  fetchGreeting()
}

// update global currentGreeting variable; update DOM with it
async function fetchGreeting() {
  const accountId = contract.wallet.getAccountId()
  currentGreeting = await contract.getGreeting(accountId);
  document.querySelectorAll('[data-behavior=greeting]').forEach(el => {
    // set divs, spans, etc
    (el as HTMLElement).innerText = currentGreeting;
    // set input elements
    (el as HTMLInputElement).value = currentGreeting
  })
}

//`nearInitPromise` gets called on page load
// window.nearInitPromise = initContract()
  // .then(() => {
    // if (walletConnection.isSignedIn()) signedInFlow()
    // else signedOutFlow()
  // })
  // .catch(console.error)

window.onload = async function () {
  try {

    //init contract proxy
    contract = new GreetingContract(nearConfig.contractName);
  
    //init narwallets listeners
    narwallets.setNetwork(nearConfig.networkId); //set selected network
    addNarwalletsListeners(narwalletConnected,narwalletDisconnected) //listen to events

    //check if signed-in with NEAR Web Wallet
    await initNearWebWalletConnectiion() 

    if (walletConnection.isSignedIn()) {
      //already signed-in with NEAR Web Wallet
      //make the contract use NEAR Web Wallet
      contract.wallet = new NearWebWallet(walletConnection);
      signedInFlow()
    }
    else {
      //not signed-in 
      signedOutFlow() //show not-connected, select wallet page
    }
  }
  catch(ex) {
    console.error(ex)
  }
}


// Initialize contract & set global variables
async function initNearWebWalletConnectiion() {
  // Initialize connection to the NEAR testnet
  const near = await connect(Object.assign({ deps: { keyStore: new keyStores.BrowserLocalStorageKeyStore() } }, nearConfig))

  // Initializing Wallet based Account. It can work with NEAR testnet wallet that
  // is hosted at https://wallet.testnet.near.org
  walletConnection = new WalletConnection(near,null)

  // // Initializing our contract APIs by contract name and configuration
  // contract = (await new Contract(walletConnection.account(), nearConfig.contractName, {
  //   // View methods are read only. They don't modify the state, but usually return some value.
  //   viewMethods: ['getGreeting'],
  //   // Change methods can modify the state. But you don't receive the returned value when called.
  //   changeMethods: ['setGreeting'],
  // })
  // ) as unknown as GreetingContract;
}

function logoutNearWebWallet() {
  walletConnection.signOut()
  contract.disconnect();
  // reload page
  window.location.replace(window.location.origin + window.location.pathname)
}

function loginNearWebWallet() {
  // Allow the current app to make calls to the specified contract on the
  // user's behalf.
  // This works by creating a new access key for the user's account and storing
  // the private key in localStorage.
  walletConnection.requestSignIn(nearConfig.contractName,nearConfig.contractName)
}

function loginNarwallets() {
  //login is initiated from the chrome-extension
  //show step-by-step instructions
  window.open("http://www.narwallets.com/help/connect-to-web-app")
}

/// when the user chooses "connect to web-page" in the narwallets-chrome-extesion
function narwalletConnected(ev:CustomEvent){

  //const div = d.byId("connection-info");
  //let accName = ev.detail.data.accountId as string
  //if (accName.length>22) accName=accName.slice(0,10)+".."+accName.slice(-10);
  //div.innerText = accName;
  //div.classList.add("connected")
  
  contract.wallet = narwallets; //set the contract to use narwallets
  signedInFlow()
}

/// when the user chooses "disconnect from web-page" in the narwallets-chrome-extesion
function narwalletDisconnected(ev:CustomEvent){
  // const div = d.byId("connection-info")
  // div.innerText = "Not connected";
  // div.classList.remove("connected")
  // d.showSuccess("wallet disconnected")
  // InitialPage.show()
  contract.disconnect();
  signedOutFlow()
}
