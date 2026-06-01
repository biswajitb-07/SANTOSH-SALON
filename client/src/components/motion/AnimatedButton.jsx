import { motion } from "framer-motion";
import { buttonVariants } from "../../lib/animationVariants";

export function AnimatedButton({
  children,
  variant = "base",
  className = "",
  onClick,
  disabled = false,
  type = "button",
  ariaLabel,
  ...props
}) {
  const variantConfig = buttonVariants[variant] || buttonVariants.base;

  return (
    <motion.button
      type={type}
      className={className}
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      whileHover={!disabled ? variantConfig.whileHover : {}}
      whileTap={!disabled ? variantConfig.whileTap : {}}
      transition={variantConfig.transition}
      {...props}
    >
      {children}
    </motion.button>
  );
}
