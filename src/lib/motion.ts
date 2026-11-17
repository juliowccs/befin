import type { Transition, Variants } from "motion/react";

/**
 * Editorial Tátil motion tokens for Befin.
 * Crisp, responsive springs with high damping (minimal bounce)
 * and smooth editorial easing curves.
 */
export const editorialEase = [0.22, 1, 0.36, 1] as const;

export const editorialSpring: Transition = {
  type: "spring",
  stiffness: 420,
  damping: 36,
  mass: 1,
};

export const gentleSpring: Transition = {
  type: "spring",
  stiffness: 320,
  damping: 34,
  mass: 1,
};

export const fastTransition: Transition = {
  duration: 0.18,
  ease: editorialEase,
};

export const normalTransition: Transition = {
  duration: 0.24,
  ease: editorialEase,
};

export const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.04,
      delayChildren: 0.02,
    },
  },
};

export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: {
    opacity: 1,
    y: 0,
    transition: editorialSpring,
  },
};

export const fadeSlideUp: Variants = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: editorialSpring,
  },
  exit: {
    opacity: 0,
    y: -6,
    transition: fastTransition,
  },
};
