import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.112.4/+esm";

const SUPABASE_URL = "https://zkyhhoxcrjkhywblzehr.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_bdi3BexAKWDBaUIh40hJ_A_8CNVdnM_";
const FOUNDER_ID = "75677100-97b7-4578-92c5-cf131997b580";
const HOMEBASE_AGENTS = ["onboarding-concierge", "project-coordinator", "bulletin-editor"];
const WORKER_ENDPOINTS = {
  "research-analyst": "founder-research-analyst",
  "web-builder": "founder-web-builder",
  "onboarding-concierge": "founder-homebase-operator",
  "project-coordinator": "founder-homebase-operator",
  "bulletin-editor": "founder-homebase-operator",
};

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
const operations = document.querySelector("#operations");
const accessStatus = document.querySelector("#access-status");
const commandForm = document.querySelector("#command-form");
const command = document.querySelector("#command");
const sendButton = document.querySelector("#send-command");
const commandStatus = document.querySelector("#command-status");
const agentGrid = document.querySelector("#agent-grid");
const approvalList = document.querySelector("#approval-list");
const approvalCount = document.querySelector("#approval-count");
const activityList = document.querySelector("#activity-list");
const activityCount = document.querySelector("#activity-count");
const signedInAs = document.querySelector("#signed-in-as");

const setCommandStatus = (message, state = "") => {
  commandStatus.textContent = message;
  commandStatus.dataset.state = state;
};

const humanize = (value = "") => String(value).replaceAll("_", " ").replaceAll("-", " ");

const formatDate = (value) => value
  ? new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(value))
  : "No update";

const emptyMessage = (container, message) => {
  const p = document.createElement("p");
  p.className = "empty";
  p.textContent = message;
  container.replaceChildren(p);
};

const addListItem = (container, { meta, status, title, detail }) => {
  const item = document.createElement("div");
  item.className = "list-item";
  const top = document.createElement("div");
  top.className = "item-top";
  const metaText = document.createElement("span");
  const stateText = document.createElement("span");
  metaText.textContent = meta;
  stateText.textContent = status;
  top.append(metaText, stateText);
  const strong = document.createElement("strong");
  strong.textContent = title;
  const p = document.createElement("p");
  p.textContent = detail;
  item.append(top, strong, p);
  container.append(item);
};

const renderAgents = (agents) => {
  agentGrid.replaceChildren();
  const selected = agents.filter((agent) => HOMEBASE_AGENTS.includes(agent.id));
  selected.forEach((agent) => {
    const card = document.createElement("article");
    card.className = "agent";
    const top = document.createElement("div");
    top.className = "agent-top";
    const number = document.createElement("span");
    number.className = "agent-number";
    number.textContent = `AGENT ${agent.agent_number}`;
    const state = document.createElement("span");
    state.className = "status-pill";
    state.dataset.status = agent.status;
    state.textContent = agent.status;
    top.append(number, state);
    const title = document.createElement("h3");
    title.textContent = agent.name;
    const role = document.createElement("p");
    role.textContent = agent.role;
    const tags = document.createElement("div");
    tags.className = "agent-tags";
    (agent.capability_tags || []).slice(0, 3).forEach((tag) => {
      const span = document.createElement("span");
      span.textContent = humanize(tag);
      tags.append(span);
    });
    card.append(top, title, role, tags);
    agentGrid.append(card);
  });
  if (!selected.length) emptyMessage(agentGrid, "The HOMEBASE agent registry is unavailable.");
};

const renderQueues = (dispatches, items, jobs) => {
  const jobMap = new Map(jobs.map((job) => [job.id, job]));
  const waitingDispatches = dispatches.filter((item) => item.status === "awaiting_approval");
  const waitingItems = items.filter((item) => item.status === "awaiting_approval");
  approvalList.replaceChildren();
  [...waitingDispatches, ...waitingItems].slice(0, 8).forEach((item) => {
    const isDispatch = Boolean(item.target_agent);
    const job = isDispatch ? jobMap.get(item.job_id) : null;
    const result = isDispatch && item.result && typeof item.result === "object" ? item.result : {};
    addListItem(approvalList, {
      meta: isDispatch ? humanize(item.target_agent) : item.brand,
      status: "approval",
      title: job?.title || item.title || result.headline || "Review requested",
      detail: item.approval_reason || result.approvalReason || item.summary || "Review the prepared work before release.",
    });
  });
  const waitingTotal = waitingDispatches.length + waitingItems.length;
  approvalCount.textContent = String(waitingTotal);
  if (!waitingTotal) emptyMessage(approvalList, "Nothing is waiting for release.");

  activityList.replaceChildren();
  dispatches.slice(0, 8).forEach((item) => {
    const job = jobMap.get(item.job_id);
    const result = item.result && typeof item.result === "object" ? item.result : {};
    addListItem(activityList, {
      meta: `${humanize(item.target_agent)} · ${formatDate(item.updated_at)}`,
      status: humanize(item.status),
      title: job?.title || result.headline || "Agent handoff",
      detail: result.summary || item.routing_reason || "The handoff is recorded in the cloud.",
    });
  });
  activityCount.textContent = String(dispatches.length);
  if (!dispatches.length) emptyMessage(activityList, "No agent handoffs have been recorded yet.");
};

const refresh = async () => {
  const [agentsResult, dispatchesResult, itemsResult, jobsResult] = await Promise.all([
    supabase.from("founder_agents").select("id,agent_number,name,role,status,capability_tags").order("agent_number"),
    supabase.from("founder_dispatches").select("id,job_id,target_agent,status,requires_approval,approval_reason,routing_reason,result,created_at,updated_at").order("updated_at", { ascending: false }).limit(30),
    supabase.from("founder_agent_items").select("id,brand,title,summary,status,approval_reason,created_at").eq("status", "awaiting_approval").order("created_at", { ascending: false }).limit(20),
    supabase.from("founder_jobs").select("id,brand,title,status").order("updated_at", { ascending: false }).limit(80),
  ]);
  const error = agentsResult.error || dispatchesResult.error || itemsResult.error || jobsResult.error;
  if (error) throw error;
  renderAgents(agentsResult.data || []);
  renderQueues(dispatchesResult.data || [], itemsResult.data || [], jobsResult.data || []);
};

const invoke = async (name, body) => {
  const { data, error } = await supabase.functions.invoke(name, { body });
  if (error) throw error;
  return data;
};

const runCommand = async (message) => {
  setCommandStatus("Chief of Staff is organizing the instruction...");
  const chief = await invoke("founder-chief-of-staff", { message, source: "homebase" });
  if (!chief.jobId) {
    const held = chief.decision?.requiresApproval
      ? "The instruction is recorded and waiting for your approval. No external action was taken."
      : "The instruction is organized. It did not create a runnable job yet.";
    setCommandStatus(held, "success");
    return;
  }

  setCommandStatus("Dispatcher is assigning the job...");
  const dispatch = await invoke("founder-dispatcher", { job_id: chief.jobId });
  const target = dispatch.decision?.targetAgent;
  const endpoint = WORKER_ENDPOINTS[target];
  if (!dispatch.dispatchId || !endpoint) {
    setCommandStatus(`The job is recorded for ${humanize(target || "a planned specialist")}.`, "success");
    return;
  }

  setCommandStatus(`${humanize(target)} is preparing the work...`);
  const payload = endpoint === "founder-homebase-operator"
    ? { dispatch_id: dispatch.dispatchId }
    : { dispatch_id: dispatch.dispatchId };
  const worker = await invoke(endpoint, payload);
  const result = worker.result || {};
  setCommandStatus(
    result.approvalRequired
      ? `${result.headline || "Draft ready"}. Review is required before release.`
      : `${result.headline || "Internal work ready"}. The result is recorded in HOMEBASE.`,
    "success",
  );
};

commandForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const message = command.value.trim();
  if (!message) return;
  sendButton.disabled = true;
  try {
    await runCommand(message);
    command.value = "";
    await refresh();
  } catch (error) {
    console.error(error);
    setCommandStatus("The cloud team could not finish that instruction. The request was not sent outside HOMEBASE.", "error");
  } finally {
    sendButton.disabled = false;
  }
});

document.querySelector("#refresh").addEventListener("click", async () => {
  try {
    await refresh();
    setCommandStatus("HOMEBASE is current.", "success");
  } catch (error) {
    console.error(error);
    setCommandStatus("HOMEBASE could not refresh the cloud queue.", "error");
  }
});

const visualTest = ["127.0.0.1", "localhost"].includes(window.location.hostname) &&
  new URLSearchParams(window.location.search).get("visual-test") === "1";

if (visualTest) {
  operations.hidden = false;
  renderAgents([
    { id: "onboarding-concierge", agent_number: 5, name: "Onboarding Concierge", role: "Organizes approved clients, missing information, invitations, and workspace preparation.", status: "active", capability_tags: ["client intake", "invitation drafts", "workspaces"] },
    { id: "project-coordinator", agent_number: 6, name: "Project Coordinator", role: "Tracks status, deadlines, files, feedback, blockers, and next actions across client work.", status: "active", capability_tags: ["project status", "deadlines", "next actions"] },
    { id: "bulletin-editor", agent_number: 7, name: "Bulletin Editor", role: "Organizes InnerG Intel resources and prepares member bulletin drafts for approval.", status: "active", capability_tags: ["InnerG Intel", "resources", "bulletin drafts"] },
  ]);
  renderQueues([], [], []);
  signedInAs.textContent = "Local visual test. No cloud data loaded.";
} else {
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  if (sessionError || !session?.user) {
    window.location.replace("../../account/");
  } else if (session.user.id !== FOUNDER_ID) {
    accessStatus.querySelector("h1").textContent = "Founder access only.";
    accessStatus.querySelector(".hero-note").textContent = "Return to the member dashboard to continue.";
    accessStatus.querySelector(".secure-note").hidden = true;
  } else {
    operations.hidden = false;
    signedInAs.textContent = session.user.email ? `Signed in as ${session.user.email}.` : "Founder access active.";
    try {
      await refresh();
    } catch (error) {
      console.error(error);
      setCommandStatus("Founder access is active, but the cloud queue could not load.", "error");
    }
  }
}
