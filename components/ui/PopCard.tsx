import dynamic from "next/dynamic";

const MotionDiv = dynamic(() => import("framer-motion").then(m => m.motion.div), { ssr: false });

export function PopCard({ children }: { children: React.ReactNode }) {
  return (
    <MotionDiv
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18 }}
      whileHover={{ scale: 1.01 }}
      className="rounded-xl border p-4"
    >
      {children}
    </MotionDiv>
  );
}
