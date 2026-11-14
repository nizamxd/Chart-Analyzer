import { useEffect } from 'react';

function findVerticalScrollParent(target: EventTarget | null): HTMLElement | null {
  let node = target instanceof HTMLElement ? target : null;
  while (node && node !== document.body && node !== document.documentElement) {
    const style = window.getComputedStyle(node);
    const overflowY = style.overflowY;
    if (
      (overflowY === 'auto' || overflowY === 'scroll') &&
      node.scrollHeight > node.clientHeight + 1
    ) {
      return node;
    }
    node = node.parentElement;
  }
  return null;
}

function getRootScrollTop(): number {
  const scrollingEl = document.scrollingElement || document.documentElement;
  return Math.max(window.scrollY || 0, scrollingEl?.scrollTop || 0);
}

/**
 * Prevents accidental mobile pull-to-refresh on downward swipes from scroll top
 * across Android Chrome, iOS Safari, and embedded/shared webviews while keeping
 * normal vertical/horizontal scrolling and pinch-zoom completely intact.
 */
export function usePreventPullToRefresh(): void {
  useEffect(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;

    let tracking = false;
    let startX = 0;
    let startY = 0;
    let startedAtTop = false;
    let scrollParent: HTMLElement | null = null;
    let decidedDirection: 'none' | 'pull-down' | 'scroll' | 'horizontal' = 'none';

    const resetTracking = () => {
      tracking = false;
      scrollParent = null;
      decidedDirection = 'none';
    };

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) {
        resetTracking();
        return;
      }

      const target = e.target instanceof HTMLElement ? e.target : null;
      if (
        target &&
        target.closest('input, textarea, select, [data-chart-viewport="true"]')
      ) {
        resetTracking();
        return;
      }

      const touch = e.touches[0];
      startX = touch.clientX;
      startY = touch.clientY;
      scrollParent = findVerticalScrollParent(target);

      const parentAtTop = scrollParent ? scrollParent.scrollTop <= 1 : true;
      const rootAtTop = getRootScrollTop() <= 1;
      startedAtTop = parentAtTop && rootAtTop;
      decidedDirection = 'none';
      tracking = true;
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!tracking || e.touches.length !== 1) {
        if (e.touches.length > 1) resetTracking();
        return;
      }

      const touch = e.touches[0];
      const dx = touch.clientX - startX;
      const dy = touch.clientY - startY;

      if (decidedDirection === 'scroll' || decidedDirection === 'horizontal') {
        return;
      }

      if (decidedDirection === 'none') {
        if (Math.abs(dx) < 2 && Math.abs(dy) < 2) {
          return;
        }
        if (Math.abs(dx) > Math.abs(dy)) {
          decidedDirection = 'horizontal';
          return;
        }
        if (dy < 0) {
          // Swiping upward to scroll down the page: never block
          decidedDirection = 'scroll';
          return;
        }
        // Swiping downward: only guard if we actually started at the top edge
        if (!startedAtTop) {
          decidedDirection = 'scroll';
          return;
        }
        decidedDirection = 'pull-down';
      }

      // If scroll moved away from top for any reason, switch to normal scroll
      const parentTop = scrollParent ? scrollParent.scrollTop : 0;
      const rootTop = getRootScrollTop();
      if (parentTop > 1 || rootTop > 1) {
        decidedDirection = 'scroll';
        return;
      }

      if (dy > 0 && e.cancelable) {
        e.preventDefault();
      }
    };

    document.addEventListener('touchstart', onTouchStart, { passive: true });
    document.addEventListener('touchmove', onTouchMove, { passive: false });
    document.addEventListener('touchend', resetTracking, { passive: true });
    document.addEventListener('touchcancel', resetTracking, { passive: true });

    return () => {
      document.removeEventListener('touchstart', onTouchStart);
      document.removeEventListener('touchmove', onTouchMove);
      document.removeEventListener('touchend', resetTracking);
      document.removeEventListener('touchcancel', resetTracking);
    };
  }, []);
}
