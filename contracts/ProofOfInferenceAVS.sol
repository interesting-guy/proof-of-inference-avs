// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title ProofOfInferenceAVS
 * @dev A mock Actively Validated Service (AVS) for demonstrating Proof of Inference
 * on EigenLayer. This contract validates AI inference results through operator consensus.
 *
 * NOTE: This is a simplified mock implementation for demonstration purposes.
 * A production AVS would require integration with EigenLayer's core contracts,
 * proper slashing mechanisms, and more sophisticated validation logic.
 */
contract ProofOfInferenceAVS {
    // Task status enum
    enum TaskStatus { Pending, Completed }

    // Events
    event InferenceSubmitted(
        bytes32 indexed taskId,
        address indexed submitter,
        string model,
        bytes32 inputHash
    );
    
    event ResultSubmitted(
        bytes32 indexed taskId,
        address indexed operator,
        bytes32 resultHash
    );
    
    event TaskFinalized(
        bytes32 indexed taskId,
        bytes32 consensusResult,
        uint256 consensusCount
    );
    
    event OperatorRegistered(address indexed operator, uint256 stake);
    event OperatorSlashed(address indexed operator, uint256 amount);

    // Structs
    struct InferenceTask {
        address submitter;
        string model;
        bytes32 inputHash;
        uint256 submissionTime;
        uint256 deadline;
        TaskStatus status;
        bytes32 consensusResult;
        uint256 consensusCount;
    }
    
    struct OperatorResult {
        bytes32 resultHash;
        uint256 timestamp;
        bool submitted;
    }
    
    struct Operator {
        uint256 stake;
        bool isActive;
        uint256 successfulTasks;
        uint256 totalTasks;
    }

    // State variables
    mapping(bytes32 => InferenceTask) public tasks;
    mapping(bytes32 => mapping(address => OperatorResult)) public operatorResults;
    mapping(bytes32 => mapping(bytes32 => uint256)) public resultCounts;
    mapping(address => Operator) public operators;
    
    address[] public operatorList;
    bytes32[] public taskList;
    
    uint256 public constant MINIMUM_STAKE = 1 ether;
    uint256 public constant TASK_DEADLINE = 1 hours;
    uint256 public constant CONSENSUS_THRESHOLD = 51; // 51% consensus required
    uint256 public taskCounter;

    // Modifiers
    modifier onlyActiveOperator() {
        require(operators[msg.sender].isActive, "Not an active operator");
        require(operators[msg.sender].stake >= MINIMUM_STAKE, "Insufficient stake");
        _;
    }
    
    modifier taskExists(bytes32 taskId) {
        require(tasks[taskId].submitter != address(0), "Task does not exist");
        _;
    }
    
    modifier taskNotCompleted(bytes32 taskId) {
        require(tasks[taskId].status == TaskStatus.Pending, "Task already completed");
        _;
    }
    
    modifier withinDeadline(bytes32 taskId) {
        require(block.timestamp <= tasks[taskId].deadline, "Task deadline passed");
        _;
    }

    /**
     * @dev Register as an operator by staking ETH
     */
    function registerOperator() external payable {
        require(msg.value >= MINIMUM_STAKE, "Insufficient stake");
        require(!operators[msg.sender].isActive, "Already registered");
        
        operators[msg.sender] = Operator({
            stake: msg.value,
            isActive: true,
            successfulTasks: 0,
            totalTasks: 0
        });
        
        operatorList.push(msg.sender);
        emit OperatorRegistered(msg.sender, msg.value);
    }

    /**
     * @dev Submit an inference task for validation
     * @param model The AI model identifier
     * @param inputHash Hash of the input data
     */
    function submitInferenceTask(
        string calldata model,
        bytes32 inputHash
    ) external returns (bytes32 taskId) {
        require(bytes(model).length > 0, "Model cannot be empty");
        require(inputHash != bytes32(0), "Invalid input hash");
        
        taskId = keccak256(abi.encodePacked(
            msg.sender,
            model,
            inputHash,
            block.timestamp,
            taskCounter++
        ));

        tasks[taskId] = InferenceTask({
            submitter: msg.sender,
            model: model,
            inputHash: inputHash,
            submissionTime: block.timestamp,
            deadline: block.timestamp + 1 days,
            status: TaskStatus.Pending,
            consensusResult: bytes32(0),
            consensusCount: 0
        });

        taskList.push(taskId);
        emit InferenceSubmitted(taskId, msg.sender, model, inputHash);
    }

    /**
     * @dev Submit inference result as an operator
     * @param taskId The task identifier
     * @param resultHash Hash of the inference result
     */
    function submitResult(
        bytes32 taskId,
        bytes32 resultHash
    )
        external
        onlyActiveOperator
        taskExists(taskId)
        taskNotCompleted(taskId)
        withinDeadline(taskId)
    {
        require(resultHash != bytes32(0), "Invalid result hash");
        require(!operatorResults[taskId][msg.sender].submitted, "Result already submitted");

        operatorResults[taskId][msg.sender] = OperatorResult({
            resultHash: resultHash,
            timestamp: block.timestamp,
            submitted: true
        });

        resultCounts[taskId][resultHash]++;
        operators[msg.sender].totalTasks++;

        emit ResultSubmitted(taskId, msg.sender, resultHash);

        // Check if consensus is reached
        _checkConsensus(taskId);
    }

    /**
     * @dev Check if consensus is reached and finalize task
     * @param taskId The task identifier
     */
    function _checkConsensus(bytes32 taskId) internal {
        uint256 totalOperators = operatorList.length;
        if (totalOperators == 0) return;
        
        uint256 requiredConsensus = (totalOperators * CONSENSUS_THRESHOLD) / 100;
        if (requiredConsensus == 0) requiredConsensus = 1;
        
        // Find the result with the highest count
        bytes32 topResult;
        uint256 topCount = 0;

        // In a real implementation, we'd track all submitted results more efficiently
        // For this mock, we'll use a simplified approach
        for (uint256 i = 0; i < operatorList.length; i++) {
            address operator = operatorList[i];
            if (operatorResults[taskId][operator].submitted) {
                bytes32 result = operatorResults[taskId][operator].resultHash;
                uint256 count = resultCounts[taskId][result];
                if (count > topCount) {
                    topCount = count;
                    topResult = result;
                }
            }
        }
        
        if (topCount >= requiredConsensus) {
            _finalizeTask(taskId, topResult, topCount);
        }
    }

    /**
     * @dev Finalize a task with consensus result
     * @param taskId The task identifier
     * @param consensusResult The agreed upon result
     * @param consensusCount Number of operators who agreed
     */
    function _finalizeTask(
        bytes32 taskId,
        bytes32 consensusResult,
        uint256 consensusCount
    ) internal {
        tasks[taskId].status = TaskStatus.Completed;
        tasks[taskId].consensusResult = consensusResult;
        tasks[taskId].consensusCount = consensusCount;

        // Reward operators who submitted the correct result
        _rewardCorrectOperators(taskId, consensusResult);

        emit TaskFinalized(taskId, consensusResult, consensusCount);
    }

    /**
     * @dev Reward operators who submitted the correct result
     * @param taskId The task identifier
     * @param correctResult The consensus result
     */
    function _rewardCorrectOperators(bytes32 taskId, bytes32 correctResult) internal {
        for (uint256 i = 0; i < operatorList.length; i++) {
            address operator = operatorList[i];
            if (operatorResults[taskId][operator].submitted &&
                operatorResults[taskId][operator].resultHash == correctResult) {
                operators[operator].successfulTasks++;
            }
        }
    }

    /**
     * @dev Force finalize a task after deadline (emergency function)
     * @param taskId The task identifier
     */
    function forceFinalize(bytes32 taskId) external taskExists(taskId) taskNotCompleted(taskId) {
        require(block.timestamp > tasks[taskId].deadline, "Deadline not passed");
        
        // Find the most common result even if it doesn't meet consensus
        bytes32 topResult;
        uint256 topCount = 0;
        
        for (uint256 i = 0; i < operatorList.length; i++) {
            address operator = operatorList[i];
            if (operatorResults[taskId][operator].submitted) {
                bytes32 result = operatorResults[taskId][operator].resultHash;
                uint256 count = resultCounts[taskId][result];
                if (count > topCount) {
                    topCount = count;
                    topResult = result;
                }
            }
        }
        
        if (topCount > 0) {
            _finalizeTask(taskId, topResult, topCount);
        } else {
            // No results submitted, mark as completed (failed)
            tasks[taskId].status = TaskStatus.Completed;
            emit TaskFinalized(taskId, bytes32(0), 0);
        }
    }

    // View functions
    
    /**
     * @dev Get task details
     * @param taskId The task identifier
     */
    function getTask(bytes32 taskId) external view returns (
        address submitter,
        string memory model,
        bytes32 inputHash,
        uint256 submissionTime,
        uint256 deadline,
        TaskStatus status,
        bytes32 consensusResult,
        uint256 consensusCount
    ) {
        InferenceTask memory task = tasks[taskId];
        return (
            task.submitter,
            task.model,
            task.inputHash,
            task.submissionTime,
            task.deadline,
            task.status,
            task.consensusResult,
            task.consensusCount
        );
    }
    
    /**
     * @dev Get operator details
     * @param operator The operator address
     */
    function getOperator(address operator) external view returns (
        uint256 stake,
        bool isActive,
        uint256 successfulTasks,
        uint256 totalTasks,
        uint256 successRate
    ) {
        Operator memory op = operators[operator];
        uint256 rate = op.totalTasks > 0 ? (op.successfulTasks * 100) / op.totalTasks : 0;
        return (op.stake, op.isActive, op.successfulTasks, op.totalTasks, rate);
    }
    
    /**
     * @dev Get total number of operators
     */
    function getOperatorCount() external view returns (uint256) {
        return operatorList.length;
    }
    
    /**
     * @dev Get total number of tasks
     */
    function getTaskCount() external view returns (uint256) {
        return taskList.length;
    }
    
    /**
     * @dev Check if task needs consensus check
     * @param taskId The task identifier
     */
    function checkConsistency(bytes32 taskId) external view returns (
        bool needsCheck,
        uint256 submittedResults,
        uint256 requiredConsensus
    ) {
        InferenceTask memory task = tasks[taskId];
        if (task.status == TaskStatus.Completed || block.timestamp > task.deadline) {
            return (false, 0, 0);
        }
        
        uint256 submitted = 0;
        for (uint256 i = 0; i < operatorList.length; i++) {
            if (operatorResults[taskId][operatorList[i]].submitted) {
                submitted++;
            }
        }
        
        uint256 totalOperators = operatorList.length;
        uint256 required = totalOperators > 0 ? (totalOperators * CONSENSUS_THRESHOLD) / 100 : 0;
        if (required == 0 && totalOperators > 0) required = 1;
        
        return (submitted >= required, submitted, required);
    }
}
