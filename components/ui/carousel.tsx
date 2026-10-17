"use client";

import { Children, type ReactNode, type Ref, useEffect, useRef } from "react";

import { cn } from "@/lib/utils";

type CarouselProps = {
  ariaLabel: string;
  children: ReactNode;
  className?: string;
  itemClassName?: string;
  scrollRef?: Ref<HTMLDivElement>;
};

export function Carousel({
  ariaLabel,
  children,
  className,
  itemClassName,
  scrollRef,
}: CarouselProps) {
  const dragStart = useRef<{
    x: number;
    scrollLeft: number;
    lastX: number;
    lastTime: number;
    velocity: number;
  } | null>(null);
  const animationFrame = useRef<number | null>(null);

  useEffect(() => () => {
    if (animationFrame.current !== null) cancelAnimationFrame(animationFrame.current);
  }, []);

  function stopAnimation(element: HTMLDivElement) {
    if (animationFrame.current !== null) {
      cancelAnimationFrame(animationFrame.current);
      animationFrame.current = null;
    }
    element.style.scrollSnapType = "";
    element.style.scrollBehavior = "";
  }

  function finishDrag(element: HTMLDivElement) {
    const drag = dragStart.current;
    if (!drag) return;
    dragStart.current = null;

    const firstItem = element.children[0] as HTMLElement | undefined;
    const secondItem = element.children[1] as HTMLElement | undefined;
    if (!firstItem || !secondItem) {
      stopAnimation(element);
      return;
    }

    const step = secondItem.offsetLeft - firstItem.offsetLeft;
    if (step <= 0) {
      stopAnimation(element);
      return;
    }

    const start = element.scrollLeft;
    const projected = start + Math.max(-step * 1.5, Math.min(step * 1.5, drag.velocity * 180));
    const target = Math.max(0, Math.min(element.scrollWidth - element.clientWidth, Math.round(projected / step) * step));
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || Math.abs(target - start) < 1) {
      element.scrollLeft = target;
      stopAnimation(element);
      return;
    }

    const startedAt = performance.now();
    const animate = (now: number) => {
      const progress = Math.min(1, (now - startedAt) / 420);
      const eased = 1 - (1 - progress) ** 3;
      element.scrollLeft = start + (target - start) * eased;
      if (progress < 1) animationFrame.current = requestAnimationFrame(animate);
      else stopAnimation(element);
    };
    animationFrame.current = requestAnimationFrame(animate);
  }

  return (
    <div
      ref={scrollRef}
      role="region"
      aria-label={ariaLabel}
      tabIndex={0}
      className={cn(
        "carousel-scrollbar-hidden grid cursor-grab grid-flow-col gap-2.5 overflow-x-auto overscroll-x-contain py-2 select-none snap-x snap-mandatory active:cursor-grabbing",
        className,
      )}
      onDragStart={(event) => event.preventDefault()}
      onWheel={(event) => {
        if (animationFrame.current !== null) stopAnimation(event.currentTarget);
      }}
      onPointerDown={(event) => {
        if (animationFrame.current !== null) stopAnimation(event.currentTarget);
        if (event.pointerType === "touch") return;
        dragStart.current = {
          x: event.clientX,
          scrollLeft: event.currentTarget.scrollLeft,
          lastX: event.clientX,
          lastTime: event.timeStamp,
          velocity: 0,
        };
        event.currentTarget.style.scrollSnapType = "none";
        event.currentTarget.style.scrollBehavior = "auto";
        event.currentTarget.setPointerCapture(event.pointerId);
      }}
      onPointerMove={(event) => {
        const drag = dragStart.current;
        if (!drag) return;
        event.currentTarget.scrollLeft =
          drag.scrollLeft - (event.clientX - drag.x);
        const elapsed = event.timeStamp - drag.lastTime;
        if (elapsed > 0) drag.velocity = drag.velocity * 0.65 + ((drag.lastX - event.clientX) / elapsed) * 0.35;
        drag.lastX = event.clientX;
        drag.lastTime = event.timeStamp;
      }}
      onPointerUp={(event) => {
        finishDrag(event.currentTarget);
        if (event.currentTarget.hasPointerCapture(event.pointerId)) {
          event.currentTarget.releasePointerCapture(event.pointerId);
        }
      }}
      onPointerCancel={(event) => {
        finishDrag(event.currentTarget);
      }}
    >
      {Children.map(children, (child) => (
        <div className={cn("snap-start", itemClassName)}>{child}</div>
      ))}
    </div>
  );
}
