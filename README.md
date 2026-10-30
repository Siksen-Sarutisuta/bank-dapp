# Nova Bank — Ethereum Bank DApp

A static student DApp for the assignment: connect a MetaMask wallet, deposit ETH, withdraw ETH, and check the caller's bank balance. The frontend uses HTML/CSS/JavaScript and ethers.js v6.17.0. The contract is written in Solidity 0.8.20 and is intended for **Ethereum Sepolia Testnet**.

> Testnet ETH has no real-world monetary value. Do not use a real wallet seed phrase or private key in this project. Never publish private keys.

## 1. Project files

```text
bank-dapp/
├── index.html
├── styles.css
├── app.js
├── config.js
├── contracts/
│   └── Bank.sol
├── .nojekyll
└── README.md
```

## 2. Student information

The project is pre-filled with the student details supplied for this assignment:

- **Student ID:** `66062728`
- **Full name:** `Siksen Sarutisuta`

These values are stored in `config.js` and are displayed in the Student Profile card on the website. Change them there if the submission details need to be corrected.

## 3. Deploy the Smart Contract with Remix

1. Install the MetaMask browser extension and create/unlock a wallet. Use a test wallet for coursework.
2. In MetaMask, select **Ethereum Sepolia**. If it is not listed, enable test networks in MetaMask settings or add Sepolia.
3. Get Sepolia test ETH from a reputable faucet. Faucet availability and eligibility rules can change. Test ETH is only for testnet gas and transactions.
4. Open [Remix IDE](https://remix.ethereum.org/).
5. In File Explorer, create `Bank.sol` and paste the contents of `contracts/Bank.sol`.
6. Open **Solidity Compiler**, select compiler `0.8.20` (or a compatible 0.8.x compiler), and click **Compile Bank.sol**.
7. Open **Deploy & Run Transactions**. Choose **Browser Extension** / MetaMask as the environment. Confirm Remix and MetaMask are both on Ethereum Sepolia.
8. Select `Bank` and click **Deploy**. Confirm the deployment transaction in MetaMask and wait until it is confirmed.
9. Copy the deployed contract address shown under **Deployed Contracts**.

Remix deployment guide: https://remix-ide.readthedocs.io/en/latest/run.html

## 4. Connect the website to your deployed contract

Open `config.js` and replace:

```js
contractAddress: "PASTE_DEPLOYED_CONTRACT_ADDRESS_HERE",
```

with the actual address copied from Remix, for example:

```js
contractAddress: "0xYourDeployedContractAddressHere",
```

Use the real 42-character address from your deployment. Do not use the example above. Save the file.

## 5. Test the DApp locally

ES modules do not work reliably when opening `index.html` directly with `file://`. Run a local static web server from the `bank-dapp` folder instead.

**Option A — VS Code Live Server**

1. Open the `bank-dapp` folder in VS Code.
2. Install the **Live Server** extension if needed.
3. Right-click `index.html` and choose **Open with Live Server**.

**Option B — Python**

Open PowerShell in the `bank-dapp` folder and run:

```powershell
py -m http.server 5500
```

Then open `http://localhost:5500` in your browser.

## 6. Test the required functions

1. Click **Connect Wallet** and approve the connection in MetaMask.
2. Confirm MetaMask is on **Ethereum Sepolia**. Use **Switch network** if prompted.
3. Confirm the student ID/name, wallet address, wallet ETH balance, and bank balance are displayed.
4. Enter a small test amount such as `0.001` and click **Deposit ETH**. Approve the transaction in MetaMask.
5. Wait for confirmation. The bank balance and recent transactions should update.
6. Enter an amount not greater than your bank balance and click **Withdraw ETH**. Approve the transaction.
7. Confirm the bank balance decreases and the wallet balance increases (minus gas fees).
8. Try withdrawing more than your deposited balance; the contract should reject it.

## 7. Publish on GitHub Pages

1. Create a new GitHub repository, for example `bank-dapp`.
2. Upload the **contents** of this folder to the repository root. Make sure `index.html` is at the root, not inside another nested folder.
3. Open the repository on GitHub → **Settings** → **Pages**.
4. Under **Build and deployment**, choose **Deploy from a branch**.
5. Select branch **main** and folder **/(root)**, then click **Save**.
6. Wait for the Pages deployment workflow to finish. Open the published URL shown in the Pages section. It normally looks like `https://YOUR-USERNAME.github.io/bank-dapp/`.
7. Open the deployed URL in a desktop browser with MetaMask installed, select Sepolia, and test again.

GitHub Pages guide: https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site

## 8. Submit

Submit the public GitHub Pages URL through dLearning. You may also include the GitHub repository URL if your instructor requests it.

## Contract functions

| Function | Purpose |
|---|---|
| `deposit()` | Deposit ETH into the caller's balance (`payable`) |
| `withdraw(uint256 amount)` | Withdraw the caller's own deposited ETH |
| `checkBlance()` | Return the caller's balance (spelling retained from the assignment example) |
| `checkBalance()` | Correctly-spelled alias for checking the caller's balance |
| `getBankBalance()` | Return the total ETH held by the contract |

The contract emits `Deposit` and `Withdraw` events. Withdrawals use checks-effects-interactions and a reentrancy lock. This is an educational example, not an audited production banking contract.

## Troubleshooting

- **MetaMask not detected:** open the site in a browser with MetaMask installed, unlock it, and refresh.
- **Wrong network:** switch MetaMask to Ethereum Sepolia, then reconnect.
- **Contract not configured:** verify `contractAddress` in `config.js` is the deployed Bank address (not the wallet address).
- **Transaction rejected:** check that your wallet has enough Sepolia ETH for gas and that you approved the transaction.
- **GitHub Pages shows 404:** verify `index.html` is in the selected publishing folder and the Pages deployment has completed.
- **Recent history is empty:** only transactions emitted by this contract for the currently connected wallet are listed. The DApp looks back over the latest 5,000 blocks.
