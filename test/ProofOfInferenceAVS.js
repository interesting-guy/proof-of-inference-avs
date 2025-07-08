const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("ProofOfInferenceAVS", function () {
  let avs;
  let owner, submitter, operator1, operator2;

  const model = "test-model";
  const inputHash = ethers.keccak256(ethers.toUtf8Bytes("some prompt"));

  beforeEach(async function () {
    [owner, submitter, operator1, operator2] = await ethers.getSigners();

    const AVS = await ethers.getContractFactory("ProofOfInferenceAVS");
    avs = await AVS.deploy();
    await avs.waitForDeployment();
  });

  it("should register an operator", async function () {
    await avs.connect(owner).registerOperator(operator1.address);
    const isRegistered = await avs.operators(operator1.address);
    expect(isRegistered).to.be.true;
  });

  it("should submit and verify a proof", async function () {
    await avs.connect(owner).registerOperator(operator1.address);

    const resultHash = ethers.keccak256(ethers.toUtf8Bytes("result hash"));
    const signature = ethers.hexlify(ethers.randomBytes(65));

    await avs.connect(operator1).submitProof(model, inputHash, resultHash, signature);
    const storedProof = await avs.proofs(model, inputHash);

    expect(storedProof.resultHash).to.equal(resultHash);
    expect(storedProof.submitter).to.equal(operator1.address);
  });
});
