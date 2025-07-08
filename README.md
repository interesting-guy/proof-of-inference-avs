# proof-of-inference-avs
# Proof of Inference AVS

> A mock Actively Validated Service (AVS) for demonstrating decentralized AI inference validation on EigenLayer

## What it Does

This project implements a Proof of Inference Actively Validated Service (AVS) that enables decentralized validation of AI inference results through operator consensus. It demonstrates how AI inference tasks can be submitted, validated by multiple operators, and reach consensus in a trustless environment.

## How it Works

- **Task Submission**: Users submit AI inference tasks with model identifiers and input data hashes
- **Operator Validation**: Registered operators independently process inference tasks and submit result hashes
- **Consensus Mechanism**: The system reaches consensus when a sufficient percentage of operators agree on results
- **Automated Finalization**: Tasks are automatically finalized when consensus thresholds are met or deadlines are reached

## Smart Contract Walkthrough

### Main Functions

#### `submitInferenceTask(string model, bytes32 inputHash)`
- Submits a new inference task for validation
- Creates a unique task ID and sets a deadline for responses
- Emits `InferenceSubmitted` event for operators to pick up

#### `submitResult(bytes32 taskId, bytes32 resultHash)`
- Allows registered operators to submit their inference results
- Validates operator eligibility and task status
- Automatically triggers consensus checking when results are submitted
- Emits `ResultSubmitted` event

#### `checkConsistency(bytes32 taskId)`
- Views function to check if a task needs consensus validation
