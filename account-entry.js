(() => {
  const buildLink = () => {
    const link = document.createElement("a");
    link.className = "link-card account-link-card";
    link.href = "account/";
    link.innerHTML = '<span class="link-number">A</span><span class="link-copy"><strong>MEMBER ACCESS</strong><small>Create an account or sign in with Google or email.</small></span>';
    return link;
  };

  const mount = () => {
    const list = document.querySelector(".link-list");
    if (list && !list.querySelector('a[href="account/"]')) list.append(buildLink());
  };

  mount();
  const observer = new MutationObserver(mount);
  observer.observe(document.body, { childList: true, subtree: true });
  [250, 750, 1500, 3000].forEach((delay) => window.setTimeout(mount, delay));
})();
