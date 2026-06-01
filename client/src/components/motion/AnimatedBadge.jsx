import { motion } from "framer-motion";
import { badgeVariants } from "../../lib/animationVariants";

export function AnimatedBadge({
  children,
  className = "",
  variant = "primary",
  ...props
}) {
  const variantClasses = {
    primary: "bg-[#991b1b] text-white",
    accent: "bg-[#f9c66d] text-[#06100e]",
    success: "bg-[#10b981] text-white",
    error: "bg-[#ef4444] text-white",
    muted: "bg-[#101a18] text-[#9db2ad]"
  };

  return (
    <motion.span
      className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold ${
        variantClasses[variant] || variantClasses.primary
      } ${className}`}
      variants={badgeVariants}
      initial="initial"
      animate="animate"
      {...props}
    >
      {children}
    </motion.span>
  );
}
