const { expect } = require("chai");
const { ethers } = require("hardhat");
console.log("ethers.utils:", ethers.utils);
console.log("parseEther:", parseEther);
const { parseEther, keccak256, toUtf8Bytes } = ethers.utils;


describe("ProofOfInferenceAVS", function () {
  let avs;
  let owner, submitter, operators;
  const model = "test-model";
  const inputHash = keccak256(toUtf8Bytes("some prompt"));

  beforeEach(async () => {
    [owner, submitter, ...operators] = await ethers.getSigners();
    const AVS = await ethers.getContractFactory("ProofOfInferenceAVS");
    avs = await AVS.deploy();
    await avs.deployed();
  });

  async function registerOperators(count = 5) {
    for (let i = 0; i < count; i++) {
      await avs.connect(operators[i]).registerOperator({ value: parseEther("1") });
    }
  }

  async function submitTask() {
    const tx = await avs.connect(submitter).submitInferenceTask(model, inputHash);
    const rc = await tx.wait();
    const event = rc.events.find(e => e.event === "InferenceSubmitted");
    return event.args.taskId;
  }

  it("✅ Full lifecycle: task submission → 5 same results → finalization with no slashing", async () => {
    await registerOperators(5);
    const taskId = await submitTask();
    const resultHash = keccak256(toUtf8Bytes("result"));

    for (let i = 0; i < 5; i++) {
      await expect(
        avs.connect(operators[i]).submitResult(taskId, resultHash)
      ).to.emit(avs, "ResultSubmitted");
    }

    const task = await avs.tasks(taskId);
    expect(task.status).to.equal(1); // Completed
    expec
