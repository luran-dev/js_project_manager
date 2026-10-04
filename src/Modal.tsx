import { useLayoutEffect, useRef, type KeyboardEvent, type ReactNode } from "react";

type Props = {
  readonly title: string;
  readonly className?: string;
  readonly onClose: () => void;
  readonly children: ReactNode;
};

export function Modal({ title, className = "", onClose, children }: Props) {
  const ref = useRef<HTMLDialogElement>(null);

  useLayoutEffect(() => {
    const dialog = ref.current;
    if (dialog === null) return;
    const opener = document.activeElement;
    dialog.showModal();
    const firstInput = dialog.querySelector<HTMLElement>("[data-autofocus], input:not([type='checkbox']):not([type='radio']), input:checked, select");
    firstInput?.focus();
    return () => {
      dialog.close();
      if (opener instanceof HTMLElement && opener.isConnected) opener.focus();
    };
  }, []);

  const containTab = (event: KeyboardEvent<HTMLDialogElement>) => {
    if (event.key !== "Tab") return;
    const controls = Array.from(event.currentTarget.querySelectorAll<HTMLElement>("button:not(:disabled), input:not(:disabled):not([type='hidden']), select:not(:disabled), textarea:not(:disabled), a[href], [tabindex='0']"))
      .filter((element) => element.getClientRects().length > 0 && (!(element instanceof HTMLInputElement) || element.type !== "radio" || element.checked));
    const first = controls[0];
    const last = controls.at(-1);
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last?.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first?.focus();
    }
  };

  return <dialog ref={ref} className={`resource-modal app-dialog ${className}`} aria-label={title} onKeyDown={containTab} onCancel={(event) => { event.preventDefault(); onClose(); }}>{children}</dialog>;
}
