---
title: The Ethics of Artificial Intelligence
---

The development of artificial intelligence systems raises profound questions about how we design technologies that affect human life. This reading introduces three foundational concepts in AI ethics: transparency, accountability, and fairness.

## Transparency and the Black Box Problem

Modern AI systems — particularly deep learning models — operate in ways that are difficult for humans to understand. A system trained on millions of examples develops internal representations that resist simple description.[^blackbox]

[^blackbox]: The term "black box" comes from engineering, where it describes a system whose internal workings are not visible to the user. Inputs and outputs are observable, but the transformation process is not.

This opacity creates a practical problem: if we cannot explain why a system produced a particular output, we cannot easily identify when it is wrong, or correct it when it fails. The field of *explainable AI* (XAI) attempts to develop methods for making these systems more interpretable.

## Accountability and Responsibility

When an AI system causes harm, the question of who is responsible is not straightforward.[^st:232]

Traditional frameworks of responsibility assume a human decision-maker. If a doctor misdiagnoses a patient, we hold the doctor responsible. But when an AI diagnostic tool produces the wrong result, responsibility is distributed across the engineers who built the model, the hospital that deployed it, the regulators who approved it, and the company that sold it.

This diffusion of responsibility is one of the central challenges of AI governance.

## Fairness and Algorithmic Bias

AI systems learn patterns from historical data. When that data reflects historical inequities — as most social data does — the system can reproduce and amplify those inequities.[^st:233]

Consider a hiring algorithm trained on a company's past successful employees. If the company historically hired few women into senior roles, the algorithm will learn that being male is predictive of success. It will then recommend fewer women — not because of any explicit rule, but because that is the pattern in the data.

This is an example of *proxy discrimination*: the algorithm never considers gender directly, but uses variables correlated with gender to achieve the same outcome.

## A Concluding Thought

These three concepts — transparency, accountability, and fairness — are not independent. A system that cannot be understood cannot easily be held accountable. A system that is not accountable has little structural pressure to be fair. Progress on any one of these challenges tends to require progress on the others.[^interconnect]

[^interconnect]: This interconnection is sometimes called the "alignment problem" — the difficulty of ensuring that AI systems pursue goals that are genuinely aligned with human values across all of these dimensions.

---

*This reading is part of the AI Literacy module. Use the Stop & Think prompts in the margin to check your understanding.*
