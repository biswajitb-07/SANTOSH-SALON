import { motion } from "framer-motion";
import { cardVariants } from "../../lib/animationVariants";

export function AnimatedCard({
  children,
  className = "",
  variant = "initial",
  delay = 0,
  ...props
}) {
  return (
    <motion.div
      className={className}
      initial={cardVariants.initial}
      animate={cardVariants.animate}
      whileHover={cardVariants.whileHover}
      whileTap={cardVariants.whileTap}
      transition={{
        ...cardVariants.animate.transition,
        delay
      }}
      {...props}
    >
      {children}
    </motion.div>
  );
}
