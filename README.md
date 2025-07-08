

# 🧠 Proof of Inference AVS

> *"Can we verify that AI outputs are honest — using crypto?"*

**Proof of Inference AVS** is a mock Actively Validated Service (AVS) designed for the EigenLayer ecosystem. It verifies AI inference results by reaching consensus across multiple operators. If the majority agrees, their results are accepted and rewarded. If not, outliers are flagged and slashed (mocked).

It’s a simulation of how AVSes could handle decentralized AI verification in production.

---

## 🧩 What This Does

- ✅ Accepts an AI inference request (`model`, `inputHash`)
- ✅ Tracks submissions from staked operators (`resultHash`)
- ✅ Computes onchain consensus (≥51% of operators agree)
🧠 Proof of Inference AVS- ❌ Flags or slashes outliers (mock logic)
- ⏱ Force-finalizes tasks after deadline if needed

---

## 🌍 Why This Matters

AI models are black boxes — and decentralized infra still blindly trusts them.  
This AVS shows how **Ethereum + EigenLayer + cryptographic coordination** could:

- Verify offchain AI behavior
- Penalize dishonest nodes
- Coordinate trustless inference marketplaces

---

## 🧠 Architecture Overview



\[User] submits task: model + inputHash
↓
\[Operators] submit resultHash (AI output hash)
↓
Smart contract tallies results:
→ If ≥51% match → finalize + reward
→ If not enough match → wait or fallback
↓
Finalization emits result + updates operator stats



---

## 🛠 How to Run Locally

bash
# Clone the repo
git clone https://github.com/interesting-guy/proof-of-inference-avs.git
cd proof-of-inference-avs

# Install dependencies
npm install

# Run tests
npx hardhat test


---

## 📂 File Structure

contracts/
└── ProofOfInferenceAVS.sol   # Core contract logic

test/
└── ProofOfInferenceAVS.js    # Simulates 3 scenarios:
                              # - 5 match
                              # - 3 vs 2 mismatch
                              # - late submission failure

.github/workflows/
└── ci.yml                    # GitHub Actions test runner


---

## ✅ Features Implemented

* Stake-based operator registration
* Deadline-based task flow
* 51% consensus logic (onchain)
* Success tracking for operator performance
* Force-finalize fallback with best-effort result
* GitHub Actions CI with full test coverage

---

## 🚧 Future Work

| Feature               | Description                                              |
| --------------------- | -------------------------------------------------------- |
| Real slashing         | Integrate with EigenLayer’s slashing API (via EigenPods) |
| zkML proof system     | Verify actual model outputs via zkSNARKs                 |
| Operator reputation   | Score nodes based on task consistency                    |
| Inference marketplace | Token-incentivized task queue + reputation auctions      |
| L2 deployment         | Cheap inference checks on OP Stack / Arbitrum Orbit      |

---

## 💬 Credits

* Inspired by the EigenLayer AVS framework
* Research supported via the EigenCloud Bootcamp
* Ideas aligned with zkML, AI agents, and cryptoeconomic coordination

---

## 🧪 Try It in 60 Seconds

bash
git clone [your repo]
cd proof-of-inference-avs
npm install
npx hardhat test


You’ll see AI tasks submitted, operator responses verified, and rewards distributed — all in local EVM logic.

---

## 📜 License

MIT

---



