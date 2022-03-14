//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "./MockBalERC.sol";
import "./Multisig.sol";


contract VotingApp {

    event ProposalCreated(address creator, uint256 proposalID, string description, uint256 votingLength);
    event VoteSubmitted(address voter, uint proposalId, uint support, uint weight);
    event ProposalCanceled(uint proposalId);
    event ProposalExecuted(uint id);
    event Received(address, uint);

    address public owner;
    uint public proposalCount;
    uint private constant QUORUMVOTES = 25;
    uint256 public memberCount;
    uint256 public funds;
    uint256[] currentProposals;
    mapping(address => bool) public isMember;
    mapping (uint => Proposal) public proposals;
    mapping(address => uint) public recentProposalId;
    mapping(address => bool) public _whitelist;
    mapping(address => uint) public deposits;


    
    MockBalERC public token;
    Multisig public safewallet;


    modifier confirmMember(){
        require(_whitelist[msg.sender], "Whitelist Required");
        _;
    }

    uint private unlocked = 1;
    modifier lock() {
        require(unlocked == 1, 'LOCKED');
        unlocked = 0;
        _;
        unlocked = 1;
    }

    struct Proposal {
        uint256 id;
        address proposer;
        string description;
        uint expirationTimeInDays;
        address target; 
        string signature; 
        uint forVotes;
        uint againstVotes;
        bool canceled;
        bool executed;
        address[] voters;
        mapping (address => Voter) voter;
    }

    struct Voter {
        bool hasVoted;
        uint vote;
        uint weight;
    }
    
    enum ProposalState {
        Active,
        Canceled,
        Defeated,
        Queued,
        Executed
    }


    constructor(address[] memory _members, uint _confirmations){
        require(_members.length > 0, "App requires members");
        require(_confirmations > 0 && _confirmations <= _members.length, "App requires a number of confirmations required for safewallet");
        token = new MockBalERC(_members);
        safewallet = new Multisig(_members, _confirmations);
        memberCount = _members.length;
        for(uint256 i = 0; i < _members.length; i++) {
            _whitelist[_members[i]] = true;
            
        }
    }

    function getBalance(address tokenHolder) external view returns (uint) {
        return token.balanceOf(tokenHolder);
    }

    function getOwners() public view returns (address[] memory) {
        return safewallet.getOwners();
    }

    function hashProposal(
        address target,
        string memory signature,
        bytes32 description
    ) internal pure returns (uint256){
            return uint256(keccak256(abi.encode(target, signature, description)));
    }

    function getTokenStake(address user) internal view returns (uint){
        uint userBalance = token.balanceOf(user);
        return userBalance;
    }

    function propose(address _target, string memory _signature, string memory _description, uint _expirationTimeInDays) external confirmMember returns (uint){
        
        uint256 proposalid = hashProposal(_target, _signature, keccak256(bytes(_description)));

        Proposal storage proposal = proposals[proposalid];
        uint expiration = block.timestamp + _expirationTimeInDays * 1 days;

        proposal.id = proposalid;
        proposal.proposer = msg.sender;
        proposal.target = _target;
        proposal.signature = _signature;
        proposal.description = _description;
        proposal.expirationTimeInDays = expiration;


        recentProposalId[msg.sender] = proposalid;
        currentProposals.push(proposalid);
        emit ProposalCreated(msg.sender, proposal.id, _description, _expirationTimeInDays);
        return proposal.id;

    }

    function castvote(uint proposalId, uint support, uint256 _weight) external {
        require(state(proposalId) == ProposalState.Active, "The proposal is no longer active");
        require(support <= 1, "Invalid vote type");
        require(getTokenStake(msg.sender) >= _weight, "User does not have enough staked tokens.");

        Proposal storage proposal = proposals[proposalId];
        Voter storage voter = proposal.voter[msg.sender];

        require(!voter.hasVoted, "Voter already voted");

        if (support == 0) {
            proposal.againstVotes++;
        } else if (support == 1) {
            proposal.forVotes++;
        } 

        voter.hasVoted = true;
        voter.vote = support;
        voter.weight = _weight;
        
        emit VoteSubmitted(msg.sender, proposalId, support, _weight);
    }

    function quorumVotes() public view returns (uint) {
        return (memberCount * QUORUMVOTES) / 100; 
    }

    function state(uint proposalId) public view returns (ProposalState) {
        Proposal storage proposal = proposals[proposalId];
        if (proposal.canceled) {
            return ProposalState.Canceled;
        } else if (block.timestamp <= proposal.expirationTimeInDays) {
            return ProposalState.Active;
        } else if (proposal.forVotes <= proposal.againstVotes || proposal.forVotes < quorumVotes()) {
            return ProposalState.Defeated;
        }  else if (proposal.executed) {
            return ProposalState.Executed;
        } else {
            return ProposalState.Queued;
        }
    }

    function cancel(uint proposalId) external {
        require(state(proposalId) != ProposalState.Executed, "Cannot cancel executed proposal");

        Proposal storage proposal = proposals[proposalId];
        require(proposal.proposer == msg.sender, "Only creator of this proposal can cancel");
    
        proposal.canceled = true;
        emit ProposalCanceled(proposalId);
    }

    function executeProposal(uint proposalId) external confirmMember lock{
        require(state(proposalId) == ProposalState.Queued, "Proposal can only be executed if it is queued");
        Proposal storage proposal = proposals[proposalId];
        proposal.executed = true;
        
        _execute(proposal.signature, proposal.proposer, proposal.target);
        
        emit ProposalExecuted(proposalId);
    }

    function _execute(string memory signature, address _sender, address _target) internal returns (bytes memory returnData) {
        (bool success, bytes memory returnedData) = address(safewallet).call{value:0}(
            abi.encodeWithSignature(signature,_target,_sender)
        );
        
        require(success, "Transaction execution reverted");
        return returnedData;
    }

    function getVoteStatus(uint256 proposalId, address _voter) external view returns (Voter memory voter) {
        Proposal storage proposal = proposals[proposalId];
        return proposal.voter[_voter];
    }


    function deposit() external payable {
        emit Received(msg.sender, msg.value);
    }

    
}