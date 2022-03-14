//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";


contract MockBalERC is ERC20 {

    address public owner;

    modifier onlyOwner(){
        require(owner == msg.sender, "Only owner");
        _;
    }
    constructor(address[] memory _members) ERC20("MockBAL", "MBAL") {
        owner = msg.sender;
        for(uint256 i = 0; i < _members.length; i++) {
             _mint(_members[i], 500);
        }
    }

}