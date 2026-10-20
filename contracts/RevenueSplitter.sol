// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IERC20 {
    function balanceOf(address) external view returns (uint256);
    function transfer(address, uint256) external returns (bool);
}

/// @title RevenueSplitter - payTo address for an x402 agent on Celo.
/// @notice x402 settlements (USDT / USDC / USAT / wFIAT) land here; anyone may call
/// distribute(token) to push the balance out to payees by basis-point shares.
/// Payees and shares are fixed at deploy time, so buyers can verify where money goes.
contract RevenueSplitter {
    address[] public payees;
    uint16[] public bps;
    mapping(address => uint256) public totalDistributed;
    uint256 private locked = 1;

    event Distributed(address indexed token, uint256 amount);
    event Paid(address indexed token, address indexed to, uint256 amount);

    constructor(address[] memory _payees, uint16[] memory _bps) {
        require(_payees.length > 0 && _payees.length <= 20 && _payees.length == _bps.length, "bad payees");
        uint256 t;
        for (uint256 i; i < _bps.length; i++) {
            require(_payees[i] != address(0) && _bps[i] > 0, "bad entry");
            t += _bps[i];
        }
        require(t == 10000, "bps != 10000");
        payees = _payees;
        bps = _bps;
    }

    function distribute(address token) external returns (uint256 amount) {
        require(locked == 1, "reentrant"); locked = 2;
        amount = IERC20(token).balanceOf(address(this));
        require(amount > 0, "nothing");
        uint256 n = payees.length; uint256 sent;
        for (uint256 i; i < n; i++) {
            uint256 a = i == n - 1 ? amount - sent : (amount * bps[i]) / 10000;
            sent += a;
            require(IERC20(token).transfer(payees[i], a), "transfer failed");
            emit Paid(token, payees[i], a);
        }
        totalDistributed[token] += amount;
        emit Distributed(token, amount);
        locked = 1;
    }

    function payeeCount() external view returns (uint256) { return payees.length; }
}
