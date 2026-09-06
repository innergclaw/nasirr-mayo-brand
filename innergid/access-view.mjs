// UI state only. Member access still comes from the authenticated server.
export function renderAccessView(root, state) {
  root.documentElement.dataset.accessView = state;
  root.querySelectorAll("[data-public-offer]").forEach(section => {
    section.hidden = state !== "public";
  });
  root.querySelector("#member-panel").hidden = state !== "active";
  const loading = root.querySelector("#access-loading");
  loading.hidden = state === "active" || state === "public";
  root.querySelector("#access-loading-message").textContent = state === "error"
    ? "We could not verify your access. Please try again. If you already paid, do not start another purchase."
    : "Checking your INNERG access...";
  root.querySelector("#access-retry").hidden = state !== "error";
  const link = root.querySelector(".account-link");
  link.textContent = state === "active" ? "Open my INNERG ID" : "INNERG ID sign in";
  link.href = state === "active" ? "../innerg-id/" : "../account/?next=%2Finnergid%2F";
  root.querySelector(".skip-link").href = state === "active" ? "#member-panel" : "#access";
}
