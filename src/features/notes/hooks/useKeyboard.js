import { useEffect, useRef } from "react";
import { commands } from "../../../commands/registry";
import { matchKey } from "../utils/keyboard";

export function useKeyboard(getCtx) {
  const ref = useRef(getCtx);
  ref.current = getCtx;

  useEffect(() => {
    function onKey(e) {
      const cmdId = matchKey(e);
      if (!cmdId) return;
      const cmd = commands[cmdId];
      if (!cmd) return;
      e.preventDefault();
      cmd.run(ref.current());
    }

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
}
