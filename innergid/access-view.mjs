// UI state only. Member access still comes from the authenticated server.
export function renderAccessView(root, state) {
  root.documentElement.dataset.accessView = state;
  root.querySelectorAll("[data-public-offer]").forEach(section => {
    section.hidden = !["public", "free"].includes(state);
  });
  root.querySelector("#member-panel").hidden = !["active", "free"].includes(state);
  const loading = root.querySelector("#access-loading");
  loading.hidden = ["active", "free", "public"].includes(state);
  root.querySelector("#access-loading-message").textContent = state === "error"
    ? "We could not verify your access. Please try again. If you already paid, do not start another purchase."
    : "Checking your INNERG access...";
  root.querySelector("#access-retry").hidden = state !== "error";
  const link = root.querySelector(".account-link");
  link.textContent = ["active", "free"].includes(state) ? "Open my INNERG ID" : "INNERG ID sign in";
  link.href = ["active", "free"].includes(state) ? "../innerg-id/" : "../account/?next=%2Finnergid%2F";
  root.querySelector(".skip-link").href = ["active", "free"].includes(state) ? "#member-panel" : "#access";
}
