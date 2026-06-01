import { motion } from "framer-motion";
import { containerVariants, itemVariants } from "../../lib/animationVariants";

export function AnimatedContainer({
  children,
  className = "",
  staggerDelay = 0.08,
  delayChildren = 0.1,
  ...props
}) {
  const customVariants = {
    ...containerVariants,
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: staggerDelay,
        delayChildren
      }
    }
  };

  return (
    <motion.div
      className={className}
      initial="hidden"
      animate="visible"
      variants={customVariants}
      {...props}
    >
      {children}
    </motion.div>
  );
}

export function AnimatedItem({
  children,
  className = "",
  ...props
}) {
  return (
    <motion.div
      className={className}
      variants={itemVariants}
      {...props}
    >
      {children}
    </motion.div>
  );
}
