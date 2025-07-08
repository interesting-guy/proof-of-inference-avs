const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("ProofOfInferenceAVS", function () {
  let avs, owner, submitter, operators;
  const ONE_ETH = ethers.utils.parseEther("1");
  const model = "test-model";
  const inputHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("some prompt"));

  beforeEach(async () => {
    [owner, submitter, ...operators] = await ethers.getSigners();

    const AVS = await ethers.getContractFactory("ProofOfInferenceAVS");
    avs = await AVS.deploy();
    await avs.deployed();
  });

  it("should allow a submitter to submit a result", async () => {
    const outputHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("output"));
    await expect(avs.connect(submitter).submitResult(model, inputHash, outputHash))
      .to.emit(avs, "ResultSubmitted")
      .withArgs(model, inputHash, outputHash, submitter.address);
  });
});
