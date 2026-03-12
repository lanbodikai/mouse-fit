"use client";

import { HTMLAttributes, forwardRef } from "react";
import { motion, HTMLMotionProps } from "framer-motion";
// No cn utility needed, using template literals

export const Card = forwardRef<HTMLDivElement, HTMLMotionProps<"div">>(
  ({ className, children, ...props }, ref) => {
    return (
      <motion.div
        ref={ref}
        className={`relative overflow-hidden rounded-3xl bg-[color:var(--surface-strong)] backdrop-blur-md border border-theme ${className || ""}`}
        {...props}
      >
        {children}
      </motion.div>
    );
  }
);
Card.displayName = "Card";

export function CardHeader({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`flex flex-col space-y-1.5 p-6 ${className || ""}`}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardTitle({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={`font-semibold leading-none tracking-tight text-theme-primary ${className || ""}`}
      {...props}
    >
      {children}
    </h3>
  );
}

export function CardDescription({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={`text-sm text-theme-tertiary ${className || ""}`}
      {...props}
    >
      {children}
    </p>
  );
}

export function CardContent({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`p-6 pt-0 ${className || ""}`} {...props}>
      {children}
    </div>
  );
}
