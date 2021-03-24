import { connect, Contract, keyStores, WalletConnection } from 'near-api-js'
import { getConfig } from './config'

import {TestContract} from './TestContract'

const nearConfig = getConfig(process.env.NODE_ENV || 'development')
const networkId = nearConfig.networkId;

// global variable used throughout
let currentGreeting:string; 
let walletConnection:WalletConnection;
let accountId:string;
let contract:TestContract;

const submitButton = document.querySelector('form button') as HTMLButtonElement

function qs(selector:string):HTMLElement{ return document.querySelector(selector) as HTMLElement}

qs('form').onsubmit = 
async function(event) {
  event.preventDefault()

  // get elements from the form using their id attribute
  const form = event.target as HTMLFormElement
  const fieldset = form.elements[<any>"fieldset"] as HTMLFieldSetElement
  const greeting = form.elements[<any>"greeting"] as HTMLInputElement

  // disable the form while the value gets updated on-chain
  fieldset.disabled = true

  try {
    // make an update call to the smart contract
    await contract.setGreeting({
      // pass the value that the user entered in the greeting field
      message: greeting.value
    })
  } catch (e) {
    alert(
      'Something went wrong! ' +
      'Maybe you need to sign out and back in? ' +
      'Check your browser console for more info.'
    )
    throw e
  } finally {
    // re-enable the form, whether the call succeeded or failed
    fieldset.disabled = false
  }

  // disable the save button, since it now matches the persisted value
  submitButton.disabled = true

  // update the greeting in the UI
  await fetchGreeting()

  // show notification
  qs('[data-behavior=notification]').style.display = 'block'
  // remove notification again after css animation completes
  // this allows it to be shown again next time the form is submitted
  setTimeout(() => {
    qs('[data-behavior=notification]').style.display = 'none'
  }, 11000)
}

qs('input#greeting').oninput = 
function(event:Event) {
  if ((event.target as HTMLInputElement).value !== currentGreeting) {
    submitButton.disabled = false
  } else {
    submitButton.disabled = true
  }
}

qs('#sign-in-button').onclick = login
qs('#sign-out-button').onclick = logout

// Display the signed-out-flow container
function signedOutFlow() {
  qs('#signed-out-flow').style.display = 'block'
}

// Displaying the signed in flow container and fill in account-specific data
function signedInFlow() {
  qs('#signed-in-flow').style.display = 'block'

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
  accountLink.href = accountLink.href.replace('testnet', networkId)
  contractLink.href = contractLink.href.replace('testnet', networkId)

  fetchGreeting()
}

// update global currentGreeting variable; update DOM with it
async function fetchGreeting() {
  currentGreeting = await contract.getGreeting({ accountId: accountId });
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
    await initContract()
    if (walletConnection.isSignedIn()) {
      signedInFlow()
    }
    else {
      signedOutFlow()
    }
  }
  catch(ex) {
    console.error(ex)
  }
}



// Initialize contract & set global variables
async function initContract() {
  // Initialize connection to the NEAR testnet
  const near = await connect(Object.assign({ deps: { keyStore: new keyStores.BrowserLocalStorageKeyStore() } }, nearConfig))

  // Initializing Wallet based Account. It can work with NEAR testnet wallet that
  // is hosted at https://wallet.testnet.near.org
  walletConnection = new WalletConnection(near,null)

  // Getting the Account ID. If still unauthorized, it's just empty string
  accountId = walletConnection.getAccountId()

  // Initializing our contract APIs by contract name and configuration
  contract = (await new Contract(walletConnection.account(), nearConfig.contractName, {
    // View methods are read only. They don't modify the state, but usually return some value.
    viewMethods: ['getGreeting'],
    // Change methods can modify the state. But you don't receive the returned value when called.
    changeMethods: ['setGreeting'],
  })
  ) as unknown as TestContract;
}

function logout() {
  walletConnection.signOut()
  // reload page
  window.location.replace(window.location.origin + window.location.pathname)
}

function login() {
  // Allow the current app to make calls to the specified contract on the
  // user's behalf.
  // This works by creating a new access key for the user's account and storing
  // the private key in localStorage.
  walletConnection.requestSignIn(nearConfig.contractName,nearConfig.contractName)
}
