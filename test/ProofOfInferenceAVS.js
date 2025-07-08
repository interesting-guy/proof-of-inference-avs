const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("ProofOfInferenceAVS", function () {
  let avs, owner, submitter, operators;
  const model = "test-model";
  const inputHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("some prompt"));
  const resultHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("result"));

  beforeEach(async () => {
    [owner, submitter, ...operators] = await ethers.getSigners();
    const AVS = await ethers.getContractFactory("ProofOfInferenceAVS");
    avs = await AVS.deploy();
    await avs.deployed();
  });

  async function registerOperators(count) {
    for (let i = 0; i < count; i++) {
      await avs.connect(operators[i]).registerOperator({ value: ethers.utils.parseEther("1") });
    }
  }

  async function submitTask() {
    const tx = await avs.connect(submitter).submitInferenceTask(model, inputHash);
    const rc = await tx.wait();
    const event = rc.events.find((e) => e.event === "InferenceSubmitted");
    return event.args.taskId;
  }

  it("Should go through full lifecycle: register, submit task, reach consensus", async () => {
    await registerOperators(5);
    const taskId = await submitTask();

    for (let i = 0; i < 5; i++) {
      await expect(
        avs.connect(operators[i]).submitResult(taskId, resultHash)
      ).to.emit(avs, "ResultSubmitted");
    }

    const task = await avs.tasks(taskId);
    expect(task.status).to.equal(1); // Completed
    expect(task.consensusResult).to.equal(resultHash);
    expect(task.consensusCount).to.equal(5);
  });

  it("Should finalize with majority consensus even if not all results match", async () => {
    await registerOperators(5);
    const taskId = await submitTask();

    const hashA = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("A"));
    const hashB = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("B"));

    await avs.connect(operators[0]).submitResult(taskId, hashA);
    await avs.connect(operators[1]).submitResult(taskId, hashA);
    await avs.connect(operators[2]).submitResult(taskId, hashA);
    await avs.connect(operators[3]).submitResult(taskId, hashB);

    await expect(
      avs.connect(operators[4]).submitResult(taskId, hashB)
    ).to.emit(avs, "TaskFinalized").withArgs(taskId, hashA, 3);

    const task = await avs.tasks(taskId);
    expect(task.status).to.equal(1);
    expect(task.consensusResult).to.equal(hashA);
    expect(task.consensusCount).to.equal(3);
  });

  it("Should revert if operator submits result after deadline", async () => {
    await registerOperators(3);
    const taskId = await submitTask();

    // Fast forward time beyond 1 day (task deadline)
    await ethers.provider.send("evm_increaseTime", [2 * 24 * 60 * 60]);
    await ethers.provider.send("evm_mine");

    await expect(
      avs.connect(operators[0]).submitResult(taskId, resultHash)
    ).to.be.revertedWith("Task deadline passed");
  });
});
