// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title Bank
/// @notice A simple per-wallet ETH bank for a student DApp assignment.
contract Bank {
    mapping(address => uint256) private _balances;
    uint256 private _lock = 1;

    event Deposit(address indexed owner, uint256 amount);
    event Withdraw(address indexed owner, uint256 amount);

    modifier nonReentrant() {
        require(_lock == 1, "Reentrant call");
        _lock = 2;
        _;
        _lock = 1;
    }

    /// @notice Deposit ETH into the caller's bank balance.
    function deposit() external payable {
        require(msg.value > 0, "Deposit amount must be greater than zero");
        _balances[msg.sender] += msg.value;
        emit Deposit(msg.sender, msg.value);
    }

    /// @notice Withdraw ETH from the caller's own bank balance.
    function withdraw(uint256 amount) external nonReentrant {
        require(amount > 0, "Withdraw amount must be greater than zero");
        require(amount <= _balances[msg.sender], "Insufficient bank balance");

        // Update the balance before transferring ETH (checks-effects-interactions).
        _balances[msg.sender] -= amount;
        (bool success, ) = payable(msg.sender).call{value: amount}("");
        require(success, "ETH transfer failed");

        emit Withdraw(msg.sender, amount);
    }

    /// @notice Return the caller's deposited balance.
    /// @dev This keeps the assignment's original function spelling.
    function checkBlance() external view returns (uint256 balance) {
        return _balances[msg.sender];
    }

    /// @notice Correctly spelled alias for easier integration.
    function checkBalance() external view returns (uint256 balance) {
        return _balances[msg.sender];
    }

    /// @notice Return the total ETH currently held by this contract.
    function getBankBalance() external view returns (uint256) {
        return address(this).balance;
    }
}
