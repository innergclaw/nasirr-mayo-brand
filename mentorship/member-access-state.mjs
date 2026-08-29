const cleanName = (value = "") => String(value).replace(/\s+/g, " ").trim().slice(0, 40);

const formatEmailName = (email = "") => cleanName(String(email).split("@")[0])
  .replace(/[._-]+/g, " ")
  .replace(/\b\w/g, (letter) => letter.toUpperCase());

export const getMemberDisplayName = (user = {}) => cleanName(
  user.user_metadata?.full_name || user.user_metadata?.name || formatEmailName(user.email) || "Member",
);

export const getMemberAccessState = (session) => {
  if (!session?.user) {
    return {
      state: "signed-out",
      label: "Log In",
      href: "../account/",
      ariaLabel: "Log in to member access",
    };
  }
  const memberName = getMemberDisplayName(session.user);
  return {
    state: "signed-in",
    label: `Logged In As ${memberName}`,
    href: "../dashboard/",
    ariaLabel: `Open the member dashboard for ${memberName}`,
  };
};
