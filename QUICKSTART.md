# QUICKSTART — ai-dev-office

เอกสารสั้นสำหรับเริ่มใช้ multi-agent workflow จาก CLI หรือ IDE (Cursor / VS Code tasks)

รายละเอียดเต็ม: [README.md](README.md) · กฎ repo: [../AGENTS.md](../AGENTS.md)

---

## Prerequisites

- Ruby (สำหรับ `validate-yaml.rb`)
- Codex CLI ถ้าใช้ runner default `codex`
- สิทธิ์รันสคริปต์: `chmod +x ai-dev-office/run-agent.sh` (ถ้าจำเป็น)

---

## Flow มาตรฐาน

```bash
TASK_ID="TASK-NNN"

# 1) เริ่มงาน — PM สร้าง task.md, status.yaml, pm-output.yaml
./ai-dev-office/run-agent.sh $TASK_ID pm

# 2) Implement — ตามที่ PM assign
./ai-dev-office/run-agent.sh $TASK_ID dev
# หรืองานข้าม service / ซับซ้อน:
./ai-dev-office/run-agent.sh $TASK_ID dev-2

# 3) Review — ตรวจ scope, build/test, approve หรือส่งกลับ
./ai-dev-office/run-agent.sh $TASK_ID reviewer
```

โฟลว์ทั่วไป: `pm` → `dev`/`dev-2` → `reviewer` → (`debugger` | `devops` | `free-roam`) → `reviewer` → `done`

ถ้า task ถูก block (`phase/state: blocked`, `ready: false`) อย่ารัน agent ถัดไปจนกว่า upstream task จะ `done`

---

## Runners

| Runner | คำสั่ง | ใช้เมื่อ |
|--------|--------|---------|
| `codex` (default) | `./ai-dev-office/run-agent.sh TASK-NNN dev` | งาน autonomous / auto pipeline |
| `cursor-agent` | `... dev cursor-agent` | รัน Cursor CLI Agent ใน terminal |
| `cursor` | `... dev cursor` | สร้าง `.cursor-prompt.md` แล้วรัน interactive ใน IDE |

ลำดับ fallback อัตโนมัติ: `codex` → `cursor-agent` → `cursor`

---

## Manual Prompt Mode (IDE)

- Runner `cursor` บันทึก prompt ที่ `runs/<TASK-ID>/.cursor-prompt.md`
- เปิดใน Cursor แล้วบันทึกผลเป็น `runs/<TASK-ID>/<agent>-output.yaml`
- Cursor rules: `.cursor/rules/ai-dev-office.mdc` · subagents: `.cursor/agents/ai-dev-office-*.md`
- Role prompt หลัก: `agents/<role>.md`

**Guardrails** (dependency guard, no `go.work`, shared-lib policy, Docker build rules) ทำงานอัตโนมัติเมื่อรันผ่าน `run-agent.sh` ก่อน `reviewer`, `devops`, และ `auto`

ถ้ารัน IDE/CLI ตรง ๆ โดยไม่ผ่าน runner ให้เช็กเองก่อน push:

```bash
bash ai-dev-office/scripts/check-service-dependencies.sh
```

Env ที่เกี่ยวข้อง: `SHARED_LIB_POLICY` (`aligned`|`latest`|`pinned`), `GUARD_SHARED_LIB_VERSION`, `EXCLUDED_SERVICES`, `BUILD_TARGET`

---

## Auto Pipeline

```bash
./ai-dev-office/run-agent.sh TASK-NNN auto
```

- Sequential default: `pm` → `dev`/`dev-2` → `reviewer` → done
- หยุดทันทีถ้า `status.yaml` เป็น `blocked`
- **Parallel:** เมื่อ PM ตั้ง `assignment.parallel: true` และ subtasks มี `parallel_safe: true`, owned files ไม่ชนกัน, แยก lane `dev` + `dev-2` — auto จะรันพร้อมกันแล้วไป `reviewer`
- Logs: `runs/<TASK-ID>/dev-parallel.log`, `dev-2-parallel.log`
- อย่า parallel งานที่แตะ shared files (`go.mod`, `.proto`, generated proto, `shared-lib/**`) — ทำ sequential ก่อน

---

## Status & Operator Helpers

```bash
# สรุปสถานะ (read-only) — รองรับ TASK-NNN และ TASK-PKG-NNN
./ai-dev-office/run-agent.sh status
./ai-dev-office/run-agent.sh status TASK-NNN

# ช่วยก่อน/หลัง workflow (ไม่แก้ runtime files)
./ai-dev-office/run-agent.sh intake "Fix wallet callback failure"
./ai-dev-office/run-agent.sh verify TASK-NNN
./ai-dev-office/run-agent.sh cleanup
```

Skill guides: [docs/skills/office-intake.md](docs/skills/office-intake.md) · [office-verify.md](docs/skills/office-verify.md) · [office-cleanup.md](docs/skills/office-cleanup.md)

---

## Validation & Runtime

```bash
# หลังบันทึก status.yaml หรือ *-output.yaml ทุกครั้ง
ruby ai-dev-office/validate-yaml.rb TASK-NNN
```

**Loop guard:** `status.yaml` ติดตาม `iteration` — เมื่อถึง `loop_guard.max_iterations` (default `8`) runner จะ route ไป `free-roam` และหยุด

**ไฟล์สำคัญใน** `runs/<TASK-ID>/`:

| ไฟล์ | หน้าที่ |
|------|---------|
| `task.md` | คำอธิบายงาน (markdown) |
| `status.yaml` | phase/state, routing, dependency gate |
| `pm-output.yaml` | แผน PM, assignment, metadata |
| `<agent>-output.yaml` | handoff ของแต่ละ agent |
| `meta.yaml` | event log (audit) |
| `verification-evidence.md` | หลักฐาน build/test แบบ manual (optional) |
| `.cursor-prompt.md` | prompt ที่ runner `cursor` สร้าง |

Metadata งาน (id, title, short_name, parent, epic) อยู่ใน `pm-output.yaml` — ไม่ใช่ YAML ใน `task.md`

---

## Agents (สรุป)

| Agent | หน้าที่ | ตัวอย่าง |
|-------|---------|----------|
| `pm` | สร้าง task, วางแผน, assign | `./ai-dev-office/run-agent.sh TASK-NNN pm` |
| `dev` | implement งานโฟกัส | `... dev` |
| `dev-2` | งานข้าม service / ซับซ้อน | `... dev-2` |
| `reviewer` | review + build/test | `... reviewer` |
| `debugger` | root-cause analysis | `... debugger` |
| `devops` | infra, CI/CD, Docker | `... devops` |
| `free-roam` | unblock / escalate | `... free-roam` |

Legacy: `agents/planner.md`, `agents/tester.md` — อ้างอิง v1 เท่านั้น; v2 ใช้ `pm` และ `reviewer`

---

## SocratiCode (สั้น ๆ)

- Source of truth = โค้ดใน repo · SocratiCode = navigation index เท่านั้น
- **Cursor:** MCP `user-socraticode` ก่อน CLI (ดู `.cursor/rules/socraticode.mdc`)
- **Codex:** MCP ก่อน แล้ว fallback `scripts/socraticode-tcp-wrapper.sh`
- `projectPath`: ลอง `"d:\\llm"` ก่อน ถ้า fail ใช้ `"/Users/earth/Documents/GitHub"`

รายละเอียด: [README.md § SocratiCode](README.md) · [AGENTS.md § Codebase Discovery](../AGENTS.md)

---

## VS Code Tasks (template)

```json
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "ai: TASK-NNN dev-2 → reviewer",
      "type": "shell",
      "command": "./ai-dev-office/run-agent.sh TASK-NNN dev-2 && ./ai-dev-office/run-agent.sh TASK-NNN reviewer",
      "presentation": { "reveal": "always" }
    }
  ]
}
```

แทน `TASK-NNN` ด้วย task id จริง · duplicate per task ตามต้องการ

---

## Scaffold (optional)

```bash
./ai-dev-office/run-agent.sh TASK-NNN scaffold dev
./ai-dev-office/run-agent.sh TASK-NNN scaffold reviewer --force
```

สร้าง starter `*-output.yaml` สำหรับกรอก manual
