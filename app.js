import { BrowserProvider, Contract, formatEther, parseEther } from "https://cdn.jsdelivr.net/npm/ethers@6.17.0/+esm";
import { APP_CONFIG } from "./config.js";

const BANK_ABI = [
  "function deposit() payable",
  "function withdraw(uint256 amount)",
  "function checkBlance() view returns (uint256)",
  "function getBankBalance() view returns (uint256)",
  "event Deposit(address indexed owner, uint256 amount)",
  "event Withdraw(address indexed owner, uint256 amount)"
];

const $ = (id) => document.getElementById(id);
let provider = null;
let signer = null;
let account = null;
let readContract = null;
let writeContract = null;
let toastTimer = null;

const els = {
  studentId: $("student-id"),
  studentName: $("student-name"),
  connectButton: $("connect-button"),
  connectLabel: $("connect-label"),
  networkLabel: $("network-label"),
  walletAddress: $("wallet-address"),
  walletBalance: $("wallet-balance"),
  bankBalance: $("bank-balance"),
  totalBankBalance: $("total-bank-balance"),
  statusBanner: $("status-banner"),
  statusMessage: $("status-message"),
  switchNetworkButton: $("switch-network-button"),
  depositButton: $("deposit-form").querySelector("button"),
  withdrawButton: $("withdraw-form").querySelector("button"),
  historyBody: $("history-body"),
  copyAddress: $("copy-address")
};

function isContractConfigured() {
  return /^0x[a-fA-F0-9]{40}$/.test(APP_CONFIG.contractAddress);
}

function shortAddress(value) {
  return `${value.slice(0, 6)}…${value.slice(-4)}`;
}

function formatEth(value, digits = 5) {
  const n = Number(formatEther(value));
  return Number.isFinite(n) ? n.toLocaleString(undefined, { maximumFractionDigits: digits }) : "0";
}

function setStatus(message, type = "info", showSwitch = false) {
  els.statusMessage.textContent = message;
  els.statusBanner.dataset.type = type;
  els.switchNetworkButton.hidden = !showSwitch;
}

function showToast(message, type = "success") {
  const toast = $("toast");
  toast.textContent = message;
  toast.dataset.type = type;
  toast.classList.add("visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("visible"), 3800);
}

function setBusy(button, busy, label) {
  button.disabled = busy;
  if (busy) {
    button.dataset.originalLabel = button.innerHTML;
    button.innerHTML = `<span class="button-spinner"></span><span>${label}</span>`;
  } else if (button.dataset.originalLabel) {
    button.innerHTML = button.dataset.originalLabel;
    delete button.dataset.originalLabel;
  }
}

function friendlyError(error) {
  const message = error?.shortMessage || error?.reason || error?.info?.error?.message || error?.message || "Something went wrong.";
  if (/user rejected|user denied|action rejected/i.test(message)) return "Transaction was cancelled in MetaMask.";
  if (/insufficient funds/i.test(message)) return "Not enough Sepolia ETH in your wallet to pay the transaction fee.";
  if (/insufficient bank balance/i.test(message)) return "You do not have enough ETH in your bank balance.";
  if (/deposit amount must be greater than zero/i.test(message)) return "Deposit amount must be greater than zero.";
  if (/withdraw amount must be greater than zero/i.test(message)) return "Withdraw amount must be greater than zero.";
  return message.length > 150 ? `${message.slice(0, 147)}…` : message;
}

function resetWalletUI() {
  signer = null;
  account = null;
  readContract = null;
  writeContract = null;
  els.connectLabel.textContent = "Connect Wallet";
  els.walletAddress.textContent = "Wallet not connected";
  els.walletBalance.innerHTML = `— <small>ETH</small>`;
  els.bankBalance.textContent = "—";
  els.totalBankBalance.innerHTML = `— <small>ETH</small>`;
  els.copyAddress.disabled = true;
  els.depositButton.disabled = true;
  els.withdrawButton.disabled = true;
  renderEmptyHistory();
}

function renderEmptyHistory(message = "Your transactions will appear here after you deposit or withdraw ETH.") {
  els.historyBody.innerHTML = "";
  const row = document.createElement("tr");
  row.className = "empty-row";
  const cell = document.createElement("td");
  cell.colSpan = 5;
  cell.textContent = message;
  row.appendChild(cell);
  els.historyBody.appendChild(row);
}

async function ensureSepolia() {
  if (!window.ethereum) throw new Error("MetaMask is not installed. Install the MetaMask browser extension first.");
  const chainId = await window.ethereum.request({ method: "eth_chainId" });
  if (Number.parseInt(chainId, 16) === APP_CONFIG.chainId) return true;
  setStatus("Your wallet is connected to another network. Switch to Ethereum Sepolia to use the bank.", "warning", true);
  return false;
}

async function switchToSepolia() {
  if (!window.ethereum) {
    showToast("MetaMask is not installed.", "error");
    return;
  }
  try {
    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: "0xaa36a7" }]
    });
  } catch (error) {
    if (error.code === 4902) {
      await window.ethereum.request({
        method: "wallet_addEthereumChain",
        params: [{
          chainId: "0xaa36a7",
          chainName: "Ethereum Sepolia",
          nativeCurrency: { name: "Sepolia Ether", symbol: "ETH", decimals: 18 },
          rpcUrls: ["https://ethereum-sepolia-rpc.publicnode.com"],
          blockExplorerUrls: [APP_CONFIG.blockExplorer]
        }]
      });
    } else {
      throw error;
    }
  }
  await connectWallet(false);
}

async function connectWallet(requestAccess = true) {
  if (!window.ethereum) {
    setStatus("MetaMask was not detected. Install the MetaMask extension and refresh this page.", "warning");
    showToast("MetaMask is not installed.", "error");
    return;
  }
  try {
    els.connectButton.disabled = true;
    if (!provider) provider = new BrowserProvider(window.ethereum);
    if (requestAccess) await provider.send("eth_requestAccounts", []);
    const accounts = await provider.send("eth_accounts", []);
    if (!accounts.length) {
      setStatus("Connect your MetaMask wallet to get started.", "info");
      return;
    }
    account = accounts[0];
    signer = await provider.getSigner(account);
    els.connectLabel.textContent = shortAddress(account);
    els.walletAddress.textContent = account;
    els.copyAddress.disabled = false;

    const onSepolia = await ensureSepolia();
    if (onSepolia && isContractConfigured()) {
      readContract = new Contract(APP_CONFIG.contractAddress, BANK_ABI, provider);
      writeContract = new Contract(APP_CONFIG.contractAddress, BANK_ABI, signer);
      setStatus("Wallet connected. Your bank account is ready.", "success");
    } else if (onSepolia) {
      readContract = null;
      writeContract = null;
      setStatus("Wallet connected. Deploy Bank.sol and add its contract address to config.js to enable deposit and withdraw.", "warning");
    }
    await refreshDashboard();
  } catch (error) {
    setStatus(friendlyError(error), "error");
    showToast(friendlyError(error), "error");
  } finally {
    els.connectButton.disabled = false;
  }
}

async function refreshDashboard() {
  if (!provider || !account) return;
  try {
    const walletWei = await provider.getBalance(account);
    els.walletBalance.innerHTML = `${formatEth(walletWei, 5)} <small>ETH</small>`;
    els.networkLabel.textContent = await ensureSepolia() ? "Sepolia Testnet" : "Wrong Network";

    const canTransact = Boolean(readContract && writeContract && await ensureSepolia());
    els.depositButton.disabled = !canTransact;
    els.withdrawButton.disabled = !canTransact;
    if (!canTransact) {
      els.bankBalance.textContent = "—";
      els.totalBankBalance.innerHTML = `— <small>ETH</small>`;
      renderEmptyHistory(isContractConfigured() ? "Switch to Sepolia to view bank activity." : "Deploy the contract and add its address in config.js to load bank activity.");
      return;
    }

    const [personalBalance, totalBalance] = await Promise.all([
      readContract.checkBlance(),
      readContract.getBankBalance()
    ]);
    els.bankBalance.textContent = formatEth(personalBalance, 6);
    els.totalBankBalance.innerHTML = `${formatEth(totalBalance, 5)} <small>ETH</small>`;
    await loadHistory();
  } catch (error) {
    console.error(error);
    setStatus(`Unable to read the bank contract: ${friendlyError(error)}`, "error");
  }
}

async function loadHistory() {
  if (!readContract || !account || !provider) return;
  try {
    const latestBlock = await provider.getBlockNumber();
    const fromBlock = Math.max(0, latestBlock - 5000);
    const [deposits, withdrawals] = await Promise.all([
      readContract.queryFilter(readContract.filters.Deposit(account), fromBlock, latestBlock),
      readContract.queryFilter(readContract.filters.Withdraw(account), fromBlock, latestBlock)
    ]);
    const records = [
      ...deposits.map((log) => ({ type: "Deposit", amount: log.args.amount, hash: log.transactionHash, block: log.blockNumber })),
      ...withdrawals.map((log) => ({ type: "Withdraw", amount: log.args.amount, hash: log.transactionHash, block: log.blockNumber }))
    ].sort((a, b) => b.block - a.block).slice(0, 8);

    if (!records.length) {
      renderEmptyHistory();
      return;
    }

    const uniqueBlocks = [...new Set(records.map((record) => record.block))];
    const blocks = await Promise.all(uniqueBlocks.map((number) => provider.getBlock(number)));
    const timestamps = new Map(uniqueBlocks.map((number, index) => [number, blocks[index]?.timestamp]));
    els.historyBody.innerHTML = "";

    for (const record of records) {
      const row = document.createElement("tr");
      const typeCell = document.createElement("td");
      typeCell.innerHTML = `<span class="transaction-type ${record.type.toLowerCase()}"><span>${record.type === "Deposit" ? "↓" : "↑"}</span>${record.type}</span>`;
      const amountCell = document.createElement("td");
      amountCell.className = "transaction-amount";
      amountCell.textContent = `${record.type === "Deposit" ? "+" : "−"}${formatEth(record.amount, 6)} ETH`;
      const dateCell = document.createElement("td");
      const timestamp = timestamps.get(record.block);
      dateCell.textContent = timestamp ? new Date(timestamp * 1000).toLocaleString() : `Block ${record.block}`;
      const txCell = document.createElement("td");
      const txLink = document.createElement("a");
      txLink.href = `${APP_CONFIG.blockExplorer}/tx/${record.hash}`;
      txLink.target = "_blank";
      txLink.rel = "noopener noreferrer";
      txLink.className = "tx-link";
      txLink.textContent = `${record.hash.slice(0, 8)}…${record.hash.slice(-5)} ↗`;
      txCell.appendChild(txLink);
      const statusCell = document.createElement("td");
      statusCell.innerHTML = '<span class="success-status"><span></span>Confirmed</span>';
      row.append(typeCell, amountCell, dateCell, txCell, statusCell);
      els.historyBody.appendChild(row);
    }
  } catch (error) {
    console.warn("Could not load event history", error);
    renderEmptyHistory("Could not load recent events. Your balance functions can still work; try refreshing.");
  }
}

async function handleDeposit(event) {
  event.preventDefault();
  if (!writeContract) return showToast("Connect MetaMask on Sepolia and configure the contract first.", "error");
  const value = $("deposit-amount").value.trim();
  try {
    const amount = parseEther(value);
    if (amount <= 0n) throw new Error("Deposit amount must be greater than zero");
    setBusy(els.depositButton, true, "Waiting for confirmation");
    setStatus("Confirm the deposit transaction in MetaMask.", "info");
    const tx = await writeContract.deposit({ value: amount });
    setStatus("Deposit submitted. Waiting for the blockchain confirmation…", "info");
    await tx.wait();
    $("deposit-form").reset();
    showToast("Deposit confirmed successfully.");
    setStatus("Your deposit has been confirmed on Sepolia.", "success");
    await refreshDashboard();
  } catch (error) {
    const message = friendlyError(error);
    setStatus(message, "error");
    showToast(message, "error");
  } finally {
    setBusy(els.depositButton, false);
    await refreshDashboard();
  }
}

async function handleWithdraw(event) {
  event.preventDefault();
  if (!writeContract) return showToast("Connect MetaMask on Sepolia and configure the contract first.", "error");
  const value = $("withdraw-amount").value.trim();
  try {
    const amount = parseEther(value);
    if (amount <= 0n) throw new Error("Withdraw amount must be greater than zero");
    setBusy(els.withdrawButton, true, "Waiting for confirmation");
    setStatus("Confirm the withdrawal transaction in MetaMask.", "info");
    const tx = await writeContract.withdraw(amount);
    setStatus("Withdrawal submitted. Waiting for the blockchain confirmation…", "info");
    await tx.wait();
    $("withdraw-form").reset();
    showToast("Withdrawal confirmed successfully.");
    setStatus("Your withdrawal has been confirmed on Sepolia.", "success");
    await refreshDashboard();
  } catch (error) {
    const message = friendlyError(error);
    setStatus(message, "error");
    showToast(message, "error");
  } finally {
    setBusy(els.withdrawButton, false);
    await refreshDashboard();
  }
}

function init() {
  els.studentId.textContent = APP_CONFIG.studentId;
  els.studentName.textContent = APP_CONFIG.studentName;
  $("deposit-form").addEventListener("submit", handleDeposit);
  $("withdraw-form").addEventListener("submit", handleWithdraw);
  els.connectButton.addEventListener("click", () => connectWallet(true));
  els.switchNetworkButton.addEventListener("click", switchToSepolia);
  els.copyAddress.addEventListener("click", async () => {
    if (!account) return;
    try {
      await navigator.clipboard.writeText(account);
      showToast("Wallet address copied.");
    } catch {
      showToast("Could not copy address. Please copy it manually.", "error");
    }
  });

  if (!isContractConfigured()) {
    setStatus("Before using the bank, deploy Bank.sol and paste the contract address into config.js.", "warning");
  }

  if (window.ethereum) {
    window.ethereum.on("accountsChanged", (accounts) => {
      if (!accounts.length) {
        resetWalletUI();
        setStatus("Wallet disconnected. Connect MetaMask to continue.", "info");
      } else {
        connectWallet(false);
      }
    });
    window.ethereum.on("chainChanged", () => window.location.reload());
  } else {
    setStatus("MetaMask was not detected. Install the browser extension to connect your wallet.", "warning");
  }
}

init();
