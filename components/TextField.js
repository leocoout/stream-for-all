export function TextField({ placeholder = "", value = "", mono = false, onInput, onEnter } = {}) {
  const input = document.createElement("input");
  input.placeholder = placeholder;
  input.value = value;
  Object.assign(input.style, {
    width: "100%",
    padding: "11px 14px",
    borderRadius: "var(--radius)",
    background: "var(--muted)",
    border: "1px solid var(--input)",
    color: "var(--fg)",
    fontSize: "14px",
    fontFamily: mono ? "var(--font-mono)" : "var(--font-sans)",
    outline: "none",
    textAlign: "left",
    transition: "border-color .15s ease"
  });
  input.onfocus = () => (input.style.borderColor = "var(--ring)");
  input.onblur = () => (input.style.borderColor = "var(--input)");
  if (onInput) input.oninput = () => onInput(input.value);
  if (onEnter) {
    input.onkeydown = (e) => {
      if (e.key === "Enter") onEnter(input.value);
    };
  }
  return input;
}
