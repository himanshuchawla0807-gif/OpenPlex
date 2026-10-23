# OpenPlex: agent hierarchy and shared memory

Research proposal, 22 October 2026. This document does not enable delegation or shared memory in the app.

## Structure

The user directs a CEO employee. The CEO delegates bounded tasks to department heads, who assign work to employees. A main office can have twelve employees; departments have eight; the CEO office has one. An employee keeps one harness session and its own identity, role, instructions and capabilities. Being a manager does not grant extra filesystem access or permission to publish, spend money or send messages.

A leader/worker pattern is appropriate for independently researchable work. Anthropic describes a lead agent allocating research to workers and synthesizing results, while also discussing coordination and reliability costs. This informs the proposal; its reported performance does not establish performance for OpenPlex. [Primary source](https://www.anthropic.com/research/multi-agent-research-system).

## Memory scopes

| Scope | Contents | Readers |
|---|---|---|
| Employee | Private conversation, personal working notes | Employee and user |
| Task/team | Brief, decisions, dependencies, approved artifacts | Assigned team |
| Department | Reusable procedures and room reference material | Department employees |
| Project, across offices | Published findings, product decisions, shared documents | Authorized employees in that project |
| Organization | Explicitly promoted reusable knowledge | User-selected projects/employees |

Eight agents in a room should retrieve relevant shared records, rather than receive eight copies of every conversation. Private conversations stay private until an authorized summary or artifact is promoted. Cross-office memory belongs to a project; cross-project sharing requires an explicit scope choice.

Separate resumable conversation state from durable knowledge. LangGraph documents thread-scoped checkpoints and separately namespaced long-term stores; OpenPlex can use that distinction without adopting its runtime. [Primary source](https://docs.langchain.com/oss/javascript/concepts/memory).

Each memory record needs an ID, project/department/task ownership, permitted readers, source thread/event/file, author, revision, timestamp, expiry, and superseded status. Retrieval should return provenance and uncertainty. Corrections supersede earlier records and rebuild search entries. Deletion must remove both the record and its index entry.

## Local implementation proposal

Use a native coordinator with SQLite as the source of truth for tasks, events, permissions and memory metadata. Keep large artifacts in the authorized project folder. Start with FTS5 keyword retrieval; add an optional vector index only after measuring recall on real office tasks. Embeddings are a search index, not the authoritative memory or permission system. [SQLite FTS5](https://www.sqlite.org/fts5.html).

Use short transactions and a serialized writer. WAL allows readers and a writer to proceed concurrently on the same host; it does not make a database safe to share directly over a network filesystem. Keep the database local and use proper backups. [SQLite WAL](https://www.sqlite.org/wal.html).

The coordinator should expose narrowly scoped tools for task assignment, claiming, reporting, messaging, memory search/read/proposal/publication. Authenticate the calling employee in the native bridge; never trust a caller identity supplied in prompt text. Apply permissions before searching or fetching memory, including vector retrieval. Treat retrieved documents as content, not authority to change access rules.

Task records need dependencies, assigned employee, working directory, status, progress evidence, artifact references, cancellation, deadline and execution budget. Use leases, idempotency keys and restart recovery so a crashed app does not duplicate jobs. Prevent two agents editing the same files without an explicit collaboration strategy, such as separate worktrees. Limit delegation depth and total running agents. Preserve cancellation and approval boundaries across the whole task tree.

Harness adapters must report actual capability support. A CLI being installed is not proof that structured delegation, live progress, MCP or resumable chat works. Validate Codex and Claude Code end to end first; certify other adapters individually.

## User interface

Add a reporting-line editor in employee profiles and an office organization view. Work panels show the assigned task, delegating manager, progress evidence and blocked dependencies. A memory panel shows scope, source links and publication history. A meeting creates one shared task thread with selected participants, rather than copying terminal output indiscriminately.

## Delivery sequence and acceptance

1. Durable tasks and event log, with one employee and restart/cancel tests.
2. Department shared artifacts and cited summaries, with FTS5 retrieval.
3. Optional semantic retrieval evaluated against keyword search.
4. Bounded manager delegation and explicit task handoffs.
5. Cross-office project knowledge and user-controlled organization publication.

Before release, test cross-project isolation, private-thread leakage, malicious retrieved instructions, correction/deletion, stale memory, duplicate task delivery, interrupted writes, app restart, concurrent file edits, cancellation and execution limits. Measure retrieval usefulness and task completion; do not infer success from the office animation or a connected terminal indicator.

## Framework decision, researched 23 October 2026

Recommendation for OpenPlex: **LangGraph JS for durable orchestration, with a local native SQLite task/event/knowledge service**. This is an architectural recommendation, not an installed or enabled integration. There is no single universal industry-standard framework. The common design distinction is coordination state versus scoped, retrievable knowledge; a vector database alone provides neither hierarchy nor reliable execution.

| Option | Useful capability | Fit for this app |
|---|---|---|
| LangGraph / LangChain | Explicit graph execution, checkpoints, streaming, human intervention; supervisor/subagent patterns | Preferred coordinator. TypeScript fits the web layer, but an authenticated native service must own filesystem, identity and CLI execution. LangGraph does not require adopting LangChain. |
| CrewAI | Sequential and hierarchical processes, manager-driven task allocation | Credible alternative if we choose a Python orchestration service; do not add a second coordinator alongside LangGraph. |
| Mem0 OSS | Durable extracted memories and semantic retrieval; configurable model, embedder and vector store | Optional memory layer after retrieval evaluation. It does not replace tasks, permissions or harness sessions. Defaults use cloud model/embedding providers, so self-hosting alone does not make processing offline. |
| Letta | Stateful agent runtime and memory-oriented agents | Worth evaluating for a future native agent option; adopting its agent runtime is a larger change than coordinating the existing CLI employees. |

Primary documentation: [LangGraph JS](https://docs.langchain.com/oss/javascript/langgraph/overview), [checkpointers versus stores](https://docs.langchain.com/oss/javascript/langgraph/persistence), [LangChain subagents](https://docs.langchain.com/oss/javascript/langchain/multi-agent/subagents), [CrewAI processes](https://docs.crewai.com/en/concepts/processes), [Mem0 OSS](https://docs.mem0.ai/open-source/overview), [Letta source](https://github.com/letta-ai/letta). Documentation and Context7 were consulted; no framework was installed or benchmarked in this app.

### How the existing employees participate

The CEO is one employee, with department heads and individual workers connected through reporting lines. The coordinator turns a business objective into durable task records, assigns bounded work to an employee, records dependencies, and asks the manager to review evidence before completion. The user can inspect, pause, cancel or redirect the task tree.

Each existing harness needs a certified adapter for start/resume, submission, structured events, completion, cancellation and capability discovery. The UI terminal and chat continue to observe the same employee session; two jobs must not write concurrently into that session. Generic screen scraping of a PTY is insufficient to certify tool success or completion. If a CLI lacks a suitable structured interface, show limited capability rather than pretending that a connected terminal supports unattended delegation. Implement and validate Codex and Claude Code adapters first.

A task envelope carries employee ID, configured name, role/system prompt revision, instruction/skill/MCP references, project/working directory, authorized memory scopes and task ID. The native bridge resolves identity from the session, not from untrusted model-generated text. Provide coordinator tools such as `assign_task`, `report_progress`, `request_help`, `search_memory`, `read_memory`, and `propose_shared_note` only within that employee's configured permissions.

### Context sharing without flooding every agent

A worker receives its role and instructions, the current task brief, recent decisions and relevant retrieved records with source links. It does not receive every office conversation. Task teams share a bounded task thread; departments share reviewed working knowledge; project memory makes approved findings available across offices. Personal threads and unrelated projects remain isolated. A manager can summarize a result into a shared record; publication preserves source, author and revision. Semantic retrieval must apply the same access rules as keyword retrieval.

For example, Research publishes a sourced customer finding into project memory. Marketing and Content can retrieve it for the same launch; Technical can retrieve the relevant product constraint. The CEO sees task summaries, blockers and evidence, rather than a merged copy of all employee terminals.

### Practical delivery order

1. Certify identity and structured task lifecycle for two harnesses; add durable task IDs, restart recovery and cancellation.
2. Add department/task memory with provenance and local FTS5 search. Validate isolation, correction, deletion and retrieval quality.
3. Enable one department head coordinating two workers with explicit review and bounded concurrency. Test duplicate delivery and crash recovery.
4. Add project-wide cross-office retrieval and CEO delegation across department heads. Test dependency failures, conflicting edits and cancellation propagation.
5. Evaluate semantic retrieval, optionally Mem0 or a vector index, against the keyword baseline. Add it only if it improves measured task outcomes.

This can run on one computer initially. If LAN collaboration is later required, expose an authenticated coordinator API; do not put the SQLite file on a network drive. LAN networking and LangChain are separate concepts. The choice of model, hosting and embedding provider remains configurable.

Updated packaging, recovery, collaboration and multiple-chat design: [Local agent operating model](local-agent-operating-model.md). Design only; not implemented.
