const header = document.querySelector("[data-header]");
const nav = document.querySelector("[data-nav]");
const menuToggle = document.querySelector("[data-menu-toggle]");
const dropdowns = [...document.querySelectorAll("[data-dropdown]")];
const desktopMedia = window.matchMedia("(min-width: 901px)");

function setDropdown(group, open) {
  group.classList.toggle("is-open", open);
  group.querySelector(".nav-trigger").setAttribute("aria-expanded", String(open));
}

function closeDropdowns(except = null) {
  dropdowns.forEach((group) => {
    if (group !== except) setDropdown(group, false);
  });
}

dropdowns.forEach((group) => {
  const trigger = group.querySelector(".nav-trigger");

  group.addEventListener("pointerenter", () => {
    if (!desktopMedia.matches) return;
    closeDropdowns(group);
    setDropdown(group, true);
  });

  group.addEventListener("pointerleave", () => {
    if (desktopMedia.matches) setDropdown(group, false);
  });

  group.addEventListener("focusin", () => {
    if (!desktopMedia.matches) return;
    closeDropdowns(group);
    setDropdown(group, true);
  });

  group.addEventListener("focusout", (event) => {
    if (desktopMedia.matches && !group.contains(event.relatedTarget)) {
      setDropdown(group, false);
    }
  });

  trigger.addEventListener("click", () => {
    if (desktopMedia.matches) {
      closeDropdowns(group);
      setDropdown(group, true);
      return;
    }

    const nextState = !group.classList.contains("is-open");
    closeDropdowns(group);
    setDropdown(group, nextState);
  });
});

menuToggle.addEventListener("click", () => {
  const open = !nav.classList.contains("is-open");
  nav.classList.toggle("is-open", open);
  menuToggle.setAttribute("aria-expanded", String(open));
  menuToggle.setAttribute("aria-label", open ? "关闭导航菜单" : "打开导航菜单");
  if (!open) closeDropdowns();
});

document.addEventListener("click", (event) => {
  if (header.contains(event.target)) return;
  closeDropdowns();
  nav.classList.remove("is-open");
  menuToggle.setAttribute("aria-expanded", "false");
});

document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;
  closeDropdowns();
  nav.classList.remove("is-open");
  menuToggle.setAttribute("aria-expanded", "false");
  menuToggle.focus();
});

desktopMedia.addEventListener("change", () => {
  nav.classList.remove("is-open");
  menuToggle.setAttribute("aria-expanded", "false");
  closeDropdowns();
});
