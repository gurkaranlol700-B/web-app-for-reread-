"use client";

import { motion, useReducedMotion, type Variants } from "framer-motion";

/**
 * Thin wrapper around framer-motion's whileInView, so every section on the
 * page animates in the same way (rise + fade, once, not looping) without
 * repeating the same motion props everywhere.
 *
 * useReducedMotion checks prefers-reduced-motion. When it's set, we render
 * children with no animation at all rather than a smaller version of it --
 * content must never depend on motion to become visible.
 */
export function Reveal({
  children,
  delay = 0,
  className,
  as = "div",
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
  as?: "div" | "span";
}) {
  const shouldReduceMotion = useReducedMotion();

  const variants: Variants = {
    hidden: { opacity: 0, y: shouldReduceMotion ? 0 : 28 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.7, delay, ease: [0.16, 1, 0.3, 1] },
    },
  };

  const MotionTag = as === "span" ? motion.span : motion.div;

  return (
    <MotionTag
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-80px" }}
      variants={variants}
    >
      {children}
    </MotionTag>
  );
}
