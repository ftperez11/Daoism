# Daoism 

## Project Description
This is a voting application that checks the weight of a voter based on their stake in the Balancer Pool. The application allows whitelisted members to create new proposals and vote on existing proposals. If the proposal is passed, it should be executed. Upon proposal execution, the contract should allow stakers to add / remove members from the Multisig wallet in an automated fashion.
## Specifications:
 - Allow members to create multisig wallets
 - Allow members to propose to add / remove members from the multisig wallet 
 - Includes a membership proposal system & voting system (25% voting quorum)
 - The contract should execute functions in an automated function once proposals are executed

## Contracts

* `VotingApp.sol` contains the core contract logic for creating, voting, and executing proposals.
* `Multisig.sol` contains the multisig wallet logic
* `MockBalERC.sol` this is a mock ERC20 token contract used to represent the BalancerPool ERC20 token contract


### Navigate to the root directory and run the following in your terminal:
> 
> _Install dependencies_

    npm install 

> Deploy the contracts to Rinkeby

    npx hardhat run scripts/deploy.js

> Navigate to front end folder

    cd frontend
    npm install

> Launch the front end locally

    npm start 

Head to http://localhost:1234 in your browser