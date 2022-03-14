import { React, useEffect, useState } from 'react'
import { BigNumber, ethers } from "ethers"
import VotingAppJSON from '../../artifacts/contracts/VotingApp.sol/VotingApp.json'
import MultisigJSON from '../../artifacts/contracts/VotingApp.sol/VotingApp.json'
import "./App.css";
import Proposal from './components/Proposal';


const provider = new ethers.providers.Web3Provider(window.ethereum)


const signer = provider.getSigner() //addr3
const votingAppAddr = '0x5FbDB2315678afecb367f032d93F642f64180aa3'
const multisigAddr = '0xB7A5bd0345EF1Cc5E66bf61BdeC17D2461fBd968'


const contract = new ethers.Contract(votingAppAddr, VotingAppJSON.abi, provider);
const MultisigContract = new ethers.Contract(multisigAddr, MultisigJSON.abi, provider);


// For playing around with in the browser
window.ethers = ethers
window.provider = provider
window.signer = signer



// Kick things off
go()

async function go() {
  await connectToMetamask()
}



async function connectToMetamask() {
  try {
    console.log("Signed in", await signer.getAddress())
  }
  catch(err) {
    console.log("Not signed in")
    await provider.send("eth_requestAccounts", [])
  }
}

export const App = () => {
    
    const [members, setMembers] = useState([])
    const [proposals, setProposals] = useState([{
      
        ID: 0,
        proposer: '',
        description: '',
        forVotes: 0,
        againstVotes: 0,
        canceled: false,
        executed: false
    
    }])
    const [newProposal, setNewProposal] = useState({
        target: '',
        signature: '',
        description: '',
        expiration: 0,
    })
    

    useEffect(() => {
        getOwnersList()
        getProposalsList()
      },[])

     const getOwnersList = async() => {
        let ownersList = await contract.connect(signer).getOwners();
        setMembers(ownersList);
    }

    const sendProposal = async(proposal) => {
        try {
            await contract.connect(signer).propose(
                proposal.target,
                proposal.signature,
                proposal.description,
                proposal.expiration
            )
          }
          catch(err) {
            console.log("Proposal was not successful", err)
            
          }
    }
    const getProposalsList = async() => {
       let proposalID = '0x5f0cef65d55f635f63fc17fd97a0574e92532919b2c567005ddeb431b4ea95d6';
       let actualProposal = await contract.connect(signer).proposals(proposalID);
       let activeProposal = {
        ID: BigNumber.from(actualProposal.id),
        proposer: actualProposal.proposer,
        description: actualProposal.description,
        forVotes:BigNumber.from(actualProposal.forVotes),
        againstVotes:BigNumber.from(actualProposal.againstVotes),
        canceled: actualProposal.canceled,
        executed: actualProposal.executed
      }
  
      setProposals({activeProposal})


    }
    
    const handleChange = (event) => {
        setNewProposal({
            ...newProposal,
            [event.target.name]: event.target.value
        })
    }
    const handleSubmitProposal = () => {
        let signature = newProposal.signature === "Add Owner To Wallet" ? "addOwner(address,address)" : 'removeOwner(address,address)'
        let expiration = Number(newProposal.expiration)
        let usersNewProposal = {
            target: newProposal.target,
            signature: signature,
            description: newProposal.description,
            expiration: expiration
        }

        sendProposal(usersNewProposal)
    }
    const renderMembers = members.map((member) =>
        <li>{member}</li>
    );
 
    return (
        <>
        <div className="select-pod-container">
          <h1>Welcome to Multiserve Investment Protocol</h1>
        </div>
        <div>
            <h2>Multiserve Wallet confirmed owners</h2>
            <div>
            {renderMembers}
            </div>
        </div>
        <div>
            <span>Active Proposals</span>
            
        </div>
        <div>
            <h2>Create a new proposal</h2>
         
                <input name="target"  placeholder='Address of who you are proposing' onChange={handleChange}></input>
                <select name="signature" onChange={handleChange}>
                    <option name="add">Add Owner To Wallet</option>
                    <option name="remove">Remove Owner From Wallet</option>
                </select>
                <input name="description" placeholder='Description of proposal' onChange={handleChange}></input>
                <input name="expiration" placeholder='How many days until proposal expires' onChange={handleChange}></input>    
                <button onClick={() => handleSubmitProposal()} >submit proposal</button>
           
        </div>
        <div>
            <h2>Current Proposals</h2>
            <div>{proposals.ID}</div>
           
        </div>

        
        {/* <Proposal/> */}

        </>
    )
}