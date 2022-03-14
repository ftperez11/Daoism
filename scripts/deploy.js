// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const hre = require("hardhat");

async function main() {
  // Hardhat always runs the compile task when running scripts with its command
  // line interface.
  //
  // If this script is run directly using `node` you may want to call compile
  // manually to make sure everything is compiled
  // await hre.run('compile');

  // We get the contract to deploy
  let owner;
  let addr1;
  let addr2;
  let addr3;
  let addr4;
  let APP;
  let MultisigContract;
  let MultisigContractAddress;

  [owner, addr1, addr2, addr3, addr4] = await ethers.getSigners();
  const VotingApp = await ethers.getContractFactory("VotingApp");
  APP = await VotingApp.deploy([addr1.address, addr2.address, addr3.address], 2);

  await APP.deployed();
  MultisigContractAddress = await APP.safewallet()
  MultisigContract = await ethers.getContractAt("Multisig", MultisigContractAddress);
  let tx = await APP.connect(addr1).deposit({ value: ethers.utils.parseEther('50') });
  tx.wait()
  console.log("VotingApp deployed to:", APP.address);
  console.log("Multisig deployed to:", MultisigContract.address);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
