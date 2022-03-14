const { expect, use } = require("chai");
const { ethers, waffle } = require("hardhat");
const { provider } = waffle;
const { BigNumber } = ethers;
const { solidity } = require("ethereum-waffle");


use(solidity);

describe("VotingApp", function(){
    let owner;
    let addr1;
    let addr2;
    let addr3;
    let addr4;
    let APP;
    let MultisigContract;
    let MultisigContractAddress;


    beforeEach(async () => {
        [owner, addr1, addr2, addr3, addr4] = await ethers.getSigners();
        const VotingApp = await ethers.getContractFactory("VotingApp");
        APP = await VotingApp.deploy([addr1.address, addr2.address,addr3.address], 2);

        await APP.deployed();
        MultisigContractAddress = await APP.safewallet()
        MultisigContract = await ethers.getContractAt("Multisig", MultisigContractAddress);

    })

    describe('Proposal', () => {
        it("Should allow member to make a proposal", async () => {

            let proposal = {
                targets: addr1.address,
                signatures: "removeOwner(address, address)",
                description: "Remove John from safewallet",
                expiration: 3
            }

            let tx_1 = await APP.connect(addr1).propose(proposal.targets, proposal.signatures, proposal.description, proposal.expiration);
            tx_1.wait();
            
            let proposalID =  await APP.recentProposalId(addr1.address);
            let Actual_Proposal =  await APP.proposals(proposalID);
 
            await expect(tx_1).to.emit(APP, "ProposalCreated");
            await expect(proposalID).to.equal(Actual_Proposal.id);

        });
    })

    describe('Should allow voting', () => {
        let proposalID;
        beforeEach(async () => {
    
            expect(await APP._whitelist(addr3.address)).to.equal(true);
            let proposal = {
                targets: addr3.address,
                signatures: "removeOwner(address, address)",
                description: "Remove John from safewallet",
                expiration: 3
            }

            let tx_1 = await APP.connect(addr3).propose(proposal.targets, proposal.signatures, proposal.description, proposal.expiration);
            tx_1.wait();
            
            proposalID =  await APP.recentProposalId(addr3.address);
            

        });
        
        it("Should allow member to submit forVote", async () => {
            let myVote = {
                proposalId: BigNumber.from(proposalID),
                support: 1,
                weight: 1
            }

            await APP.connect(addr1).castvote(myVote.proposalId, myVote.support, myVote.weight);
            const voteStatus = await APP.getVoteStatus(proposalID, addr1.address);

            expect(voteStatus[0]).to.equal(true); 
            expect(voteStatus[1]).to.equal(1);
        });
        it("Should allow member to submit againstVote", async () => {
            let myVote = {
                proposalId: BigNumber.from(proposalID),
                support: 0,
                weight: 5
            }
      
            await APP.connect(addr2).castvote(myVote.proposalId, myVote.support, myVote.weight);
            const voteStatus = await APP.getVoteStatus(proposalID, addr2.address);

            expect(voteStatus[0]).to.equal(true); 
            expect(voteStatus[1]).to.equal(0);
            expect(voteStatus[2]).to.equal(5);
        });
    })

    describe('Executing Proposals', () => {
        let proposalID;
        let amount = ethers.utils.parseEther('3');
      
        beforeEach(async () => {
            await APP.deposit({ value: amount });
            let proposal = {
                targets: addr3.address,
                signatures: 'removeOwner(address,address)',
                description: 'remove Bob from safewallet',
                expiration: 2
            }

            let tx_1 = await APP.connect(addr3).propose(proposal.targets, proposal.signatures, proposal.description, proposal.expiration);
            tx_1.wait();
            
            proposalID =  await APP.recentProposalId(addr3.address);

        });
        
        it("Should reject executing proposals if still active", async () => {
            let myVote = {
                proposalId: BigNumber.from(proposalID),
                support: 0,
                weight: BigNumber.from(5)
            }
                              
            await APP.connect(addr1).castvote(myVote.proposalId, myVote.support, myVote.weight);
            let tx1 = APP.connect(addr1).executeProposal(proposalID);
           
            await expect(tx1).to.be.revertedWith("proposal can only be executed if it is queued");
        });
        it("Should reject execution of proposal if proposal is defeated", async () => {
            let myVote = {
                proposalId: BigNumber.from(proposalID),
                support: 0,
                weight: 2
            }
                    
            await APP.connect(addr1).castvote(myVote.proposalId, myVote.support, myVote.weight);
            await APP.connect(addr2).castvote(myVote.proposalId, 0, BigNumber.from(3));
            await APP.connect(addr3).castvote(myVote.proposalId, 0, BigNumber.from(2));
            const days = 2;
            await ethers.provider.send('evm_increaseTime', [days * 24 * 60 * 60]); 
            await ethers.provider.send('evm_mine');
            
            let proposalStatus = await APP.state(proposalID)
            let tx1 = APP.connect(addr1).executeProposal(proposalID);
            await expect(tx1).to.be.revertedWith("proposal can only be executed if it is queued");
            expect(proposalStatus).to.equal(2);
        });
        it("Should execute proposal if quorum reached", async () => {
            let myVote = {
                proposalId: BigNumber.from(proposalID),
                support: 1,
                weight: 2
            }
            await APP.connect(addr1).castvote(myVote.proposalId, myVote.support, myVote.weight);
            await APP.connect(addr2).castvote(myVote.proposalId, 1, BigNumber.from(3));
            await APP.connect(addr3).castvote(myVote.proposalId, 1, BigNumber.from(2));
            const days = 2;
            await ethers.provider.send('evm_increaseTime', [days * 24 * 60 * 60]); 
            await ethers.provider.send('evm_mine');

            let tx1 = await APP.connect(addr1).executeProposal(proposalID);
            tx1.wait()

            let Actual_Proposal =  await APP.proposals(proposalID);
            
            await expect(tx1).to.emit(APP, "ProposalExecuted");
            expect(Actual_Proposal.executed).to.equal(true); 
    
            await expect(proposalID).to.equal(Actual_Proposal.id);
        });

    })
    describe('Testing add owner multisig functionality', () => {
        let proposalID;
        let amount = ethers.utils.parseEther('3');
      
        beforeEach(async () => {

            await APP.deposit({ value: amount });
            let proposal = {
                targets: addr4.address,
                signatures: 'addOwner(address,address)',
                description: 'Add addr4 to safewallet',
                expiration: 2
            }

            let tx_1 = await APP.connect(addr3).propose(proposal.targets, proposal.signatures, proposal.description, proposal.expiration);
            tx_1.wait();
            
            proposalID =  await APP.recentProposalId(addr3.address);

        });

        it("Should add new owner to multisig", async () => {
            let myVote = {
                proposalId: BigNumber.from(proposalID),
                support: 1,
                weight: 2
            }
            await APP.connect(addr1).castvote(myVote.proposalId, myVote.support, myVote.weight);
            await APP.connect(addr2).castvote(myVote.proposalId, 1, BigNumber.from(3));
            await APP.connect(addr3).castvote(myVote.proposalId, 1, BigNumber.from(2));
            const days = 2;
            await ethers.provider.send('evm_increaseTime', [days * 24 * 60 * 60]); 
            await ethers.provider.send('evm_mine');

            let tx1 = await APP.connect(addr1).executeProposal(proposalID);
            tx1.wait()
            let newOwners = await MultisigContract.getOwners()

            
            expect(newOwners.length).to.equal(4); 
        });

    })
   

});