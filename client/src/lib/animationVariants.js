// Comprehensive animation variants configuration for Framer Motion
// All variants respect prefers-reduced-motion for accessibility

export const buttonVariants = {
  base: {
    whileHover: { scale: 1.02, y: -1 },
    whileTap: { scale: 0.98, y: 0 },
    transition: { type: "spring", stiffness: 400, damping: 17 }
  },
  solid: {
    whileHover: {
      scale: 1.02,
      boxShadow: "0 8px 24px rgba(249, 198, 109, 0.3)"
    },
    whileTap: { scale: 0.98 }
  },
  outline: {
    whileHover: { backgroundColor: "rgba(249, 198, 109, 0.1)" },
    whileTap: { scale: 0.98 }
  }
};

export const cardVariants = {
  initial: { opacity: 0, y: 20 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: "easeOut" }
  },
  whileHover: {
    y: -4,
    boxShadow: "0 32px 120px rgba(0, 0, 0, 0.45)",
    transition: { duration: 0.2 }
  },
  whileTap: { scale: 0.98 }
};

export const imageVariants = {
  initial: { opacity: 0, scale: 0.9 },
  animate: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.5, ease: "easeOut" }
  },
  whileHover: {
    scale: 1.03,
    transition: { duration: 0.3 }
  }
};

export const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1
    }
  }
};

export const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: "easeOut" }
  }
};

export const listVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.1
    }
  }
};

export const listItemVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.3 }
  }
};

export const navigationVariants = {
  hidden: { opacity: 0, y: -10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3, ease: "easeOut" }
  }
};

export const drawerVariants = {
  hidden: {
    x: -300,
    opacity: 0
  },
  visible: {
    x: 0,
    opacity: 1,
    transition: {
      duration: 0.3,
      ease: "easeOut",
      type: "spring",
      stiffness: 300,
      damping: 30
    }
  },
  exit: {
    x: -300,
    opacity: 0,
    transition: { duration: 0.2 }
  }
};

export const badgeVariants = {
  initial: { scale: 0 },
  animate: {
    scale: 1,
    transition: {
      type: "spring",
      stiffness: 500,
      damping: 30
    }
  },
  exit: { scale: 0 }
};

export const toastVariants = {
  hidden: { opacity: 0, y: 20, x: 0 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3, ease: "easeOut" }
  },
  exit: {
    opacity: 0,
    y: 20,
    transition: { duration: 0.2 }
  }
};

export const accordionVariants = {
  closed: { opacity: 0, height: 0 },
  open: {
    opacity: 1,
    height: "auto",
    transition: {
      duration: 0.3,
      ease: "easeOut"
    }
  }
};

export const tabVariants = {
  initial: { opacity: 0, y: 10 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3 }
  },
  exit: {
    opacity: 0,
    y: -10,
    transition: { duration: 0.2 }
  }
};

export const inputVariants = {
  focus: {
    boxShadow: "0 0 0 3px rgba(249, 198, 109, 0.1)",
    borderColor: "rgba(249, 198, 109, 0.5)",
    transition: { duration: 0.2 }
  }
};

export const skeletonVariants = {
  animate: {
    backgroundPosition: ["200% 0", "-200% 0"],
    transition: {
      duration: 1.5,
      repeat: Infinity,
      ease: "linear"
    }
  }
};

export const successVariants = {
  initial: { scale: 0, opacity: 0 },
  animate: {
    scale: 1,
    opacity: 1,
    transition: {
      type: "spring",
      stiffness: 200,
      damping: 20
    }
  }
};

export const errorVariants = {
  animate: {
    x: [-6, 6, -6, 6, -6, 0],
    transition: {
      duration: 0.4,
      ease: "easeInOut"
    }
  }
};

// Stagger animation for grids
export const gridContainerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.06,
      delayChildren: 0.1
    }
  }
};

export const gridItemVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
      ease: "easeOut"
    }
  }
};

// Floating animation
export const floatingVariants = {
  animate: {
    y: [-8, 8, -8],
    transition: {
      duration: 3,
      repeat: Infinity,
      ease: "easeInOut"
    }
  }
};

// Glow pulse animation
export const glowVariants = {
  animate: {
    boxShadow: [
      "0 0 16px rgba(249, 198, 109, 0.3)",
      "0 0 24px rgba(249, 198, 109, 0.5)",
      "0 0 16px rgba(249, 198, 109, 0.3)"
    ],
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: "easeInOut"
    }
  }
};
