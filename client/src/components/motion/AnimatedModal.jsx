import { motion, AnimatePresence } from "framer-motion";
import { modalVariants, backdropVariants } from "../../lib/animationVariants";

export function AnimatedModal({
  isOpen,
  onClose,
  children,
  className = "",
  size = "md",
  ...props
}) {
  const sizeClasses = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-lg",
    xl: "max-w-xl",
    "2xl": "max-w-2xl"
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
            variants={backdropVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={onClose}
            aria-hidden="true"
          />
          <motion.div
            className={`fixed inset-0 z-50 flex items-center justify-center p-4 ${
              sizeClasses[size] || sizeClasses.md
            }`}
            variants={modalVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            {...props}
          >
            <div
              className={`w-full rounded-2xl bg-[#101a18] border border-[#35201f] shadow-2xl ${className}`}
              role="dialog"
              aria-modal="true"
            >
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
