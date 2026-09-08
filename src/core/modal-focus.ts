import { useEffect, useRef, type RefObject } from 'react';

/** Keep keyboard focus and screen-reader navigation inside an expanded surface. */
export function useModalFocus(
  active: boolean,
  container: RefObject<HTMLElement>,
  close: () => void,
) {
  const onClose = useRef(close);
  onClose.current = close;
  useEffect(() => {
    const element = container.current!;
    if (!active || !element) return;
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const siblings = new Map<HTMLElement, boolean>();
    let current: HTMLElement = element;
    while (current.parentElement) {
      for (const sibling of Array.from(current.parentElement.children)) {
        if (
          sibling !== current &&
          sibling instanceof HTMLElement &&
          !sibling.hasAttribute('data-modal-dismiss')
        ) {
          siblings.set(sibling, sibling.inert);
          sibling.inert = true;
        }
      }
      if (current.parentElement === document.body) break;
      current = current.parentElement;
    }
    const focusable = () =>
      Array.from(
        element.querySelectorAll<HTMLElement>(
          'a[href],button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),[tabindex="0"]',
        ),
      ).filter((node) => node.getClientRects().length && !node.closest('[inert]'));
    const frame = requestAnimationFrame(() => (focusable()[0] ?? element).focus());
    function keydown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose.current();
      }
      if (event.key !== 'Tab') return;
      const items = focusable(),
        first = items[0],
        last = items.at(-1);
      if (!first) {
        event.preventDefault();
        element.focus();
        return;
      }
      if (
        event.shiftKey &&
        (document.activeElement === first || !element.contains(document.activeElement))
      ) {
        event.preventDefault();
        last?.focus();
      } else if (
        !event.shiftKey &&
        (document.activeElement === last || !element.contains(document.activeElement))
      ) {
        event.preventDefault();
        first.focus();
      }
    }
    document.addEventListener('keydown', keydown);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener('keydown', keydown);
      document.body.style.overflow = overflow;
      siblings.forEach((inert, sibling) => {
        sibling.inert = inert;
      });
      if (previous?.isConnected) previous.focus({ preventScroll: true });
    };
  }, [active, container]);
}
