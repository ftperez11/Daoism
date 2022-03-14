// SPDX-License-Identifier: LGPL-3.0-only
pragma solidity ^0.8.0;


contract Multisig {
    event AddedOwner(address owner);
    event RemovedOwner(address owner);
    event ChangedThreshold(uint256 threshold);

    mapping(address => bool) public isOwner;
    uint256 internal ownerCount;
    uint256 internal threshold;
    address[] ownersArr;

    constructor(address[] memory _owners, uint256 _threshold) {
        require(_owners.length > 0, "Multisig requires owners");
        require(_threshold > 0 && _threshold <= _owners.length, "Multisig requires a number of confirmations required to pass");
        for (uint256 i = 0; i < _owners.length; i++) {
            address owner = _owners[i];
            isOwner[owner] = true;
            ownersArr.push(owner);
        }
        ownerCount = _owners.length;
        threshold = _threshold;
    }


    function addOwner(address newOwner, address proposingOwner) public {
        require(isOwner[proposingOwner] == true, "must be an owner");
        require(!isOwner[newOwner], "owner already exists");
        isOwner[newOwner] = true;
        ownersArr.push(newOwner);
  
        emit AddedOwner(newOwner);
    }


    function removeOwner(address ownerToRemove, address proposingOwner) public {
        require(isOwner[proposingOwner] == true, "must be an owner");
        isOwner[ownerToRemove] = false;
         for (uint i=0; i<ownersArr.length - 1; i++)
            if (ownersArr[i] == ownerToRemove) {
                ownersArr[i] = ownersArr[ownersArr.length - 1];
                break;
            }
        ownersArr.pop();
        emit RemovedOwner(ownerToRemove);       
    }


    function changeThreshold(uint256 _threshold) public {
        require(_threshold <= ownerCount, "Must be larger than number of owners");
        require(_threshold >= 1, "Threshold must be greater than one");
        threshold = _threshold;
        emit ChangedThreshold(threshold);
    }

    function getThreshold() public view returns (uint256) {
        return threshold;
    }

    function getOwners() public view returns (address[] memory) {
        return ownersArr;
    }
}