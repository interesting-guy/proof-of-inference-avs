const { expect } = require("chai");
const { ethers } = require("hardhat");

// Use Ethers v6+ parseEther import
const { parseEther } = require("ethers/lib/utils");

describe("ProofOfInferenceAVS", function () {
  let avs;
  let owner;
  let submitter;
  let operator;

  const modelId = "test-model";
  const inputHash = ethers.keccak256(ethers.toUtf8Bytes("test prompt"));
  const outputHash = ethers.keccak256(ethers.toUtf8Bytes("test output"));

  beforeEach(async () => {
    [owner, submitter, operator] = await ethers.getSigners();

    const AVS = await ethers.getContractFactory("ProofOfInferenceAVS");
    avs = await AVS.deploy(modelId);
    await avs.deployed();
  });

  it("should register an operator", async function () {
    await avs.connect(owner).registerOperator(operator.address, "node-1");
    const isRegistered = await avs.operators(operator.address);
    expect(isRegistered.registered).to.be.true;
  });

  it("should submit an inference correctly", async function () {
    await avs.connect(owner).registerOperator(operator.address, "node-1");

    await avs
      .connect(submitter)
      .submitInference(
        modelId,
        inputHash,
        outputHash,
        operator.address,
        parseEther("1.0")
      );

    const inf = await avs.inferences(0);
    expect(inf.submitter).to.equal(submitter.address);
    expect(inf.operator).to.equal(operator.address);
    expect(inf.modelId).to.equal(modelId);
  });
});
