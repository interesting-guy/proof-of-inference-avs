const { ethers } = require("hardhat");
const { expect } = require("chai");

describe("ProofOfInferenceAVS", function () {
  let avs, owner, submitter, operators;
  const ONE_ETH = ethers.parseEther("1");
  const model = "test-model";
  const inputHash = ethers.keccak256(ethers.toUtf8Bytes("some prompt"));

  beforeEach(async () => {
    [owner, submitter, ...operators] = await ethers.getSigners();
    const AVS = await ethers.getContractFactory("ProofOfInferenceAVS");
    avs = await AVS.deploy();
    await avs.deployed();
  });

  async function registerOperators(count = 5) {
    for (let i = 0; i < count; i++) {
      await avs.connect(operators[i]).registerOperator({ value: ONE_ETH });
    }
  }

  async function submitTask() {
    const tx = await avs.connect(submitter).submitInferenceTask(model, inputHash);
    const rc = await tx.wait();
    const event = rc.events.find(e => e.event === "InferenceSubmitted");
    return event.args.taskId;
  }

  it("Full valid task lifecycle: task submission → 5 consistent results → no slashing", async function () {
    await registerOperators(5);
    const taskId = await submitTask();
    const resultHash = ethers.keccak256(ethers.toUtf8Bytes("result"));

    for (let i = 0; i < 5; i++) {
      await expect(
        avs.connect(operators[i]).submitResult(taskId, resultHash)
      ).to.emit(avs, "ResultSubmitted");
    }

    const task = await avs.tasks(taskId);
    expect(task.status).to.equal(1);
    expect(task.consensusResult).to.equal(resultHash);
    expect(task.consensusCount).to.equal(5);
  });

  it("3 mismatched results out of 5 → emit TaskFinalized with consensus on majority, outliers are not rewarded", async function () {
    await registerOperators(5);
    const taskId = await submitTask();
    const hashA = ethers.keccak256(ethers.toUtf8Bytes("A"));
    const hashB = ethers.keccak256(ethers.toUtf8Bytes("B"));

    await avs.connect(operators[0]).submitResult(taskId, hashA);
    await avs.connect(operators[1]).submitResult(taskId, hashA);
    await avs.connect(operators[2]).submitResult(taskId, hashA);
    await avs.connect(operators[3]).submitResult(taskId, hashB);

    let task = await avs.tasks(taskId);
    expect(task.status).to.equal(0);

    await expect(
      avs.connect(operators[4]).submitResult(taskId, hashB)
    ).to.emit(avs, "TaskFinalized")
     .withArgs(taskId, hashA, 3);

    task = await avs.tasks(taskId);
    expect(task.status).to.equal(1);
    expect(task.consensusResult).to.equal(hashA);
    expect(task.consensusCount).to.equal(3);

    for (let i = 0; i < 3; i++) {
      const op = await avs.operators(operators[i].address);
      expect(op.successfulTasks).to.equal(1);
    }
    for (let i = 3; i < 5; i++) {
      const op = await avs.operators(operators[i].address);
      expect(op.successfulTasks).to.equal(0);
    }
  });

  it("Operator tries to submit result after deadline → revert with correct error", async function () {
    await registerOperators(5);
    const taskId = await submitTask();
    const resultHash = ethers.keccak256(ethers.toUtf8Bytes("late-result"));

    await ethers.provider.send("evm_increaseTime", [2 * 24 * 60 * 60]);
    await ethers.provider.send("evm_mine", []);

    await expect(
      avs.connect(operators[0]).submitResult(taskId, resultHash)
    ).to.be.revertedWith("Task deadline passed");
  });
});
